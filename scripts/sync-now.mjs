/**
 * sync-now.mjs
 * Run directly with Node.js — fetches arXiv papers and populates Neon DB.
 * AI analysis only for cs.AI, cs.AR, cs.CR.
 * Run: node --env-file-if-exists=/vercel/share/.env.project scripts/sync-now.mjs
 */
import { neon } from "@neondatabase/serverless"

const RANKED = ["cs.AI", "cs.AR", "cs.CR"]
const TODAY  = new Date().toISOString().split("T")[0]

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error("Missing DATABASE_URL"); process.exit(1) }
const AI_KEY = process.env.AI_GATEWAY_API_KEY
if (!AI_KEY) { console.error("Missing AI_GATEWAY_API_KEY"); process.exit(1) }

const sql = neon(DATABASE_URL)

// ── arXiv fetch ──────────────────────────────────────────────────────────────
function parseXml(xml) {
  const entries = []
  const re = /<entry>([\s\S]*?)<\/entry>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    const e = m[1]
    const tag = (t) => { const x = e.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`)); return x ? x[1].trim().replace(/\s+/g," ") : "" }
    const rawId = e.match(/<id>(.*?)<\/id>/)
    if (!rawId) continue
    const idMatch = rawId[1].trim().match(/abs\/(.+)$/)
    const id = idMatch ? idMatch[1] : rawId[1].trim()
    const authors = []; const ar = /<author>\s*<name>(.*?)<\/name>/g; let am
    while ((am = ar.exec(e)) !== null) authors.push(am[1].trim())
    const cats = []; const cr = /<category[^>]*term="([^"]+)"/g; let cm
    while ((cm = cr.exec(e)) !== null) cats.push(cm[1])
    const primary = (e.match(/<arxiv:primary_category[^>]*term="([^"]+)"/) || [])[1] || cats[0] || ""
    entries.push({ id, title: tag("title"), summary: tag("summary"), authors, categories: cats, primaryCategory: primary, published: tag("published"), arxivUrl: `https://arxiv.org/abs/${id}`, pdfUrl: `https://arxiv.org/pdf/${id}`, texUrl: `https://arxiv.org/src/${id}` })
  }
  return entries
}

async function fetchArxiv(category) {
  const url = `https://export.arxiv.org/api/query?search_query=cat:${encodeURIComponent(category)}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=100`
  const res = await fetch(url, { headers: { "User-Agent": "arXivScanner/1.0" } })
  if (!res.ok) throw new Error(`arXiv HTTP ${res.status}`)
  return parseXml(await res.text())
}

// ── AI analysis ──────────────────────────────────────────────────────────────
async function analyze(paper) {
  try {
    const body = {
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a ruthlessly honest senior researcher. Return ONLY valid JSON, no markdown.

CALIBRATION — follow strictly:
- bsIndex 0-10: exceptional rigor=0-1, solid=2-4, average=5-6, hype=7-8, absurd=9-10
- sotaScore 0-10 — BE STINGY: 0-2=incremental (60%), 3-4=solid but expected (25%), 5-6=genuinely interesting (10%), 7-8=significant advance (4%), 9-10=field-defining (1%)
- isSOTA: TRUE ONLY if sotaScore>=7
- redFlags: EVERY paper has 2-4 weaknesses, no exceptions
- expertCommentary: 2-3 sentences, brutally honest
- oneLiner: no hype, what it actually does

You are a filter. If you rate everything highly, you are useless.`
        },
        {
          role: "user",
          content: `Return ONLY JSON: {"bsIndex":<int>,"sotaScore":<int>,"isSOTA":<bool>,"oneLiner":"","coreClaims":[],"redFlags":[],"expertCommentary":""}

Title: ${paper.title}
Authors: ${paper.authors.slice(0,5).join(", ")}
Categories: ${paper.categories.join(", ")}
Abstract: ${paper.summary.slice(0,1200)}`
        }
      ],
      temperature: 0.2,
    }

    const res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI_KEY}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) { console.log(`  AI error ${res.status}`); return null }
    const data = await res.json()
    let text = data.choices?.[0]?.message?.content?.trim() || ""
    const block = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (block) text = block[1]
    else { const x = text.match(/\{[\s\S]*\}/); if (x) text = x[0] }
    const parsed = JSON.parse(text)
    if ((parsed.sotaScore ?? 0) < 7) parsed.isSOTA = false
    return parsed
  } catch (err) {
    console.log(`  AI parse error: ${err.message}`)
    return null
  }
}

// ── ranking ──────────────────────────────────────────────────────────────────
async function saveRanking(category) {
  const top10 = await sql`
    SELECT id, title, authors, published_date, arxiv_url,
           sota_score, bs_index, one_liner, expert_commentary
    FROM daily_papers
    WHERE category=${category} AND fetch_date=${TODAY}::date AND sota_score IS NOT NULL
    ORDER BY sota_score DESC, bs_index ASC
    LIMIT 10
  `
  if (!top10.length) { console.log(`  No analyzed papers for ranking in ${category}`); return }
  await sql`DELETE FROM category_rankings WHERE category=${category} AND rank_date=${TODAY}::date`
  for (let i=0; i<top10.length; i++) {
    const p = top10[i]
    await sql`
      INSERT INTO category_rankings
        (category,rank_date,rank_position,paper_id,fetch_date,sota_score,bs_index,title,authors,published_date,arxiv_url,one_liner,expert_commentary)
      VALUES
        (${category},${TODAY}::date,${i+1},${p.id},${TODAY}::date,${p.sota_score},${p.bs_index},${p.title},${p.authors},${p.published_date},${p.arxiv_url},${p.one_liner},${p.expert_commentary})
    `
  }
  console.log(`  Ranking saved: ${top10.length} entries, top SOTA=${top10[0].sota_score}`)
}

// ── sync one category ────────────────────────────────────────────────────────
async function syncCategory(category) {
  const isRanked = RANKED.includes(category)
  console.log(`\n[${category}] Fetching arXiv...`)

  await sql`
    INSERT INTO daily_fetch_batches (category, fetch_date, status)
    VALUES (${category}, ${TODAY}::date, 'running')
    ON CONFLICT (category, fetch_date) DO UPDATE SET status='running', started_at=NOW()
  `

  let entries
  try {
    entries = await fetchArxiv(category)
    console.log(`  Got ${entries.length} papers`)
  } catch (err) {
    await sql`UPDATE daily_fetch_batches SET status='failed', error_message=${String(err)} WHERE category=${category} AND fetch_date=${TODAY}::date`
    console.log(`  FAILED: ${err.message}`)
    return
  }

    await sql`DELETE FROM daily_papers WHERE category=${category} AND fetch_date=${TODAY}::date`
  for (const e of entries) {
    await sql`
      INSERT INTO daily_papers (id,category,fetch_date,title,abstract,authors,published_date,arxiv_url,pdf_url,tex_url)
      VALUES (${e.id},${category},${TODAY}::date,${e.title},${e.summary},${e.authors},${e.published||null},${e.arxivUrl},${e.pdfUrl},${e.texUrl})
      ON CONFLICT (id,category,fetch_date) DO NOTHING
    `
  }

  let analyzed = 0
  if (isRanked) {
    console.log(`  AI analysis for ${entries.length} papers (ranked category)...`)
    for (let i=0; i<entries.length; i++) {
      const e = entries[i]
      process.stdout.write(`  [${i+1}/${entries.length}] ${e.title.slice(0,60)}...`)
      const a = await analyze(e)
      if (a) {
        const bs    = Math.min(10, Math.max(0, Math.round(a.bsIndex ?? 5)))
        const sota  = Math.min(10, Math.max(0, Math.round(a.sotaScore ?? 3)))
        const isSota = a.isSOTA === true && sota >= 7
        await sql`
          UPDATE daily_papers SET
            bs_index=${bs}, sota_score=${sota}, is_sota=${isSota},
            one_liner=${a.oneLiner??""}, core_claims=${a.coreClaims??[]},
            red_flags=${a.redFlags??[]}, expert_commentary=${a.expertCommentary??""},
            analyzed_at=NOW()
          WHERE id=${e.id} AND category=${category} AND fetch_date=${TODAY}::date
        `
        process.stdout.write(` SOTA=${sota} BS=${bs}\n`)
        analyzed++
      } else {
        process.stdout.write(` (skipped)\n`)
      }
      await new Promise(r => setTimeout(r, 200))
    }
    await saveRanking(category)
  }

  await sql`
    UPDATE daily_fetch_batches SET
      status='completed', papers_fetched=${entries.length},
      papers_analyzed=${analyzed}, completed_at=NOW()
    WHERE category=${category} AND fetch_date=${TODAY}::date
  `
  console.log(`  Done: ${entries.length} fetched, ${analyzed} analyzed`)
}

// ── main ─────────────────────────────────────────────────────────────────────
// Accept category list from CLI args: node sync-now.mjs cs.AI cs.AR
// Default: all RANKED categories
const cliCats = process.argv.slice(2)
const categoriesToSync = cliCats.length > 0 ? cliCats : RANKED

console.log(`=== arXiv Sync — ${TODAY} ===`)
console.log(`Ranked categories (with AI): ${RANKED.join(", ")}`)
console.log(`Syncing: ${categoriesToSync.join(", ")}`)

try {
  for (const cat of categoriesToSync) {
    await syncCategory(cat)
  }
  console.log(`\n=== Done: synced ${categoriesToSync.join(", ")} ===`)
} catch (err) {
  console.error("Fatal:", err)
  process.exit(1)
}
