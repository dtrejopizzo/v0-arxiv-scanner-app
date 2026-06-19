import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { generateText } from "ai"

const ARXIV_API_BASE = "https://export.arxiv.org/api/query"
const ADMIN_PASSWORD = "Santander2728,2025*34erASsa35"
const RANKED_CATEGORIES = ["cs.AI", "cs.AR", "cs.CR"]

export const maxDuration = 300

interface ArxivEntry {
  id: string
  title: string
  summary: string
  authors: string[]
  categories: string[]
  primaryCategory: string
  published: string
  updated: string
  arxivUrl: string
  pdfUrl: string
  texUrl: string
}

function parseArxivXml(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1]

    const getId = (s: string) => {
      const m = s.match(/<id>(.*?)<\/id>/)
      if (!m) return ""
      const url = m[1].trim()
      const idMatch = url.match(/abs\/(.+)$/)
      return idMatch ? idMatch[1] : url
    }

    const getTag = (s: string, tag: string) => {
      const m = s.match(new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, "s"))
      return m ? m[1].trim().replace(/\s+/g, " ") : ""
    }

    const getAuthors = (s: string) => {
      const authors: string[] = []
      const re = /<author>\s*<name>(.*?)<\/name>/g
      let am
      while ((am = re.exec(s)) !== null) authors.push(am[1].trim())
      return authors
    }

    const getCategories = (s: string) => {
      const cats: string[] = []
      const re = /<category[^>]*term="([^"]+)"/g
      let cm
      while ((cm = re.exec(s)) !== null) cats.push(cm[1])
      return cats
    }

    const getPrimaryCategory = (s: string) => {
      const m = s.match(/<arxiv:primary_category[^>]*term="([^"]+)"/)
      return m ? m[1] : ""
    }

    const id = getId(entry)
    if (!id) continue

    const cats = getCategories(entry)
    entries.push({
      id,
      title: getTag(entry, "title"),
      summary: getTag(entry, "summary"),
      authors: getAuthors(entry),
      categories: cats,
      primaryCategory: getPrimaryCategory(entry) || cats[0] || "",
      published: getTag(entry, "published"),
      updated: getTag(entry, "updated"),
      arxivUrl: `https://arxiv.org/abs/${id}`,
      pdfUrl: `https://arxiv.org/pdf/${id}`,
      texUrl: `https://arxiv.org/src/${id}`,
    })
  }

  return entries
}

async function fetchLatest100(category: string): Promise<ArxivEntry[]> {
  const url = `${ARXIV_API_BASE}?search_query=cat:${encodeURIComponent(category)}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=100`
  const response = await fetch(url, {
    headers: { "User-Agent": "arXivScanner/1.0 (research tool)" },
    next: { revalidate: 0 },
  })
  if (!response.ok) throw new Error(`arXiv API error: ${response.status}`)
  return parseArxivXml(await response.text())
}

async function analyzeWithAI(paper: ArxivEntry) {
  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      system: `You are a ruthlessly honest senior researcher reviewing papers for top venues (NeurIPS, ICML, Nature, CVPR, ACL). Return ONLY valid JSON, no markdown.

CALIBRATION — follow strictly:
- bsIndex 0-10: exceptional rigor=0-1, solid honest work=2-4, average=5-6, unsupported hype=7-8, absurd claims=9-10
- sotaScore 0-10 — BE EXTREMELY STINGY:
  * 0-2: incremental or derivative (~60% of all papers)
  * 3-4: solid but expected contribution (~25%)
  * 5-6: genuinely interesting, novel angle (~10%)
  * 7-8: significant advance, spotlight/oral quality (~4%)
  * 9-10: field-defining, 1-2 per subfield per year (~1%)
- isSOTA: TRUE ONLY if sotaScore >= 7. When in doubt, FALSE.
- redFlags: EVERY paper has 2-4 weaknesses. No exceptions.
- expertCommentary: 2-3 sentences, brutally honest. What is actually new vs recycled?
- oneLiner: No hype. What does this paper actually do?

If you rate everything highly, you are useless. You are a filter.`,
      prompt: `Return ONLY JSON:
{"bsIndex":<int 0-10>,"sotaScore":<int 0-10>,"isSOTA":<bool>,"oneLiner":"<str>","coreClaims":["<str>"],"redFlags":["<str>"],"expertCommentary":"<str>"}

Title: ${paper.title}
Authors: ${paper.authors.slice(0, 5).join(", ")}
Categories: ${paper.categories.join(", ")}
Abstract: ${paper.summary.slice(0, 1200)}`,
      temperature: 0.2,
    })

    let jsonStr = text.trim()
    const block = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (block) jsonStr = block[1]
    else {
      const m = jsonStr.match(/\{[\s\S]*\}/)
      if (m) jsonStr = m[0]
    }
    const parsed = JSON.parse(jsonStr)
    if ((parsed.sotaScore ?? 0) < 7) parsed.isSOTA = false
    return parsed
  } catch {
    return null
  }
}

async function computeAndSaveRanking(category: string, today: string) {
  const top10 = await sql`
    SELECT id, title, authors, published_date, arxiv_url,
           sota_score, bs_index, one_liner, expert_commentary
    FROM daily_papers
    WHERE category = ${category}
      AND fetch_date = ${today}::date
      AND sota_score IS NOT NULL
    ORDER BY sota_score DESC, bs_index ASC
    LIMIT 10
  `
  if (top10.length === 0) return

  await sql`DELETE FROM category_rankings WHERE category = ${category} AND rank_date = ${today}::date`

  for (let i = 0; i < top10.length; i++) {
    const p = top10[i]
    await sql`
      INSERT INTO category_rankings (
        category, rank_date, rank_position, paper_id, fetch_date,
        sota_score, bs_index, title, authors, published_date,
        arxiv_url, one_liner, expert_commentary
      ) VALUES (
        ${category}, ${today}::date, ${i + 1}, ${p.id}, ${today}::date,
        ${p.sota_score}, ${p.bs_index}, ${p.title}, ${p.authors},
        ${p.published_date}, ${p.arxiv_url}, ${p.one_liner}, ${p.expert_commentary}
      )
    `
  }
}

export async function POST(request: Request) {
  try {
    const key = request.headers.get("x-admin-key") || ""
    if (key !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { category } = body
    if (!category) return NextResponse.json({ error: "category is required" }, { status: 400 })

    const today = new Date().toISOString().split("T")[0]
    const isRanked = RANKED_CATEGORIES.includes(category)

    // Check if already synced today
    const existing = await sql`
      SELECT status FROM daily_fetch_batches
      WHERE category = ${category} AND fetch_date = ${today}::date
    `
    if (existing.length > 0 && existing[0].status === "completed") {
      return NextResponse.json({ success: true, category, skipped: true, reason: "already synced today" })
    }

    await sql`
      INSERT INTO daily_fetch_batches (category, fetch_date, status)
      VALUES (${category}, ${today}::date, 'running')
      ON CONFLICT (category, fetch_date) DO UPDATE SET status = 'running', started_at = NOW()
    `

    try {
      const entries = await fetchLatest100(category)

      await sql`DELETE FROM daily_papers WHERE category = ${category} AND fetch_date = ${today}::date`

      for (const e of entries) {
        await sql`
          INSERT INTO daily_papers (id, category, fetch_date, title, abstract, authors, published_date, arxiv_url, pdf_url, tex_url)
          VALUES (
            ${e.id}, ${category}, ${today}::date,
            ${e.title}, ${e.summary}, ${e.authors},
            ${e.published || null}, ${e.arxivUrl}, ${e.pdfUrl}, ${e.texUrl}
          )
          ON CONFLICT (id, category, fetch_date) DO NOTHING
        `
      }

      let papersAnalyzed = 0

      // AI analysis ONLY for ranked categories
      if (isRanked) {
        for (const e of entries) {
          const analysis = await analyzeWithAI(e)
          if (analysis) {
            await sql`
              UPDATE daily_papers SET
                bs_index          = ${Math.min(10, Math.max(0, Math.round(analysis.bsIndex ?? 5)))},
                sota_score        = ${Math.min(10, Math.max(0, Math.round(analysis.sotaScore ?? 3)))},
                is_sota           = ${analysis.isSOTA === true && (analysis.sotaScore ?? 0) >= 7},
                one_liner         = ${analysis.oneLiner ?? ""},
                core_claims       = ${analysis.coreClaims ?? []},
                red_flags         = ${analysis.redFlags ?? []},
                expert_commentary = ${analysis.expertCommentary ?? ""},
                analyzed_at       = NOW()
              WHERE id = ${e.id} AND category = ${category} AND fetch_date = ${today}::date
            `
            papersAnalyzed++
          }
          await new Promise((r) => setTimeout(r, 150))
        }
        await computeAndSaveRanking(category, today)
      }

      await sql`
        UPDATE daily_fetch_batches SET
          status = 'completed',
          papers_fetched = ${entries.length},
          papers_analyzed = ${papersAnalyzed},
          completed_at = NOW()
        WHERE category = ${category} AND fetch_date = ${today}::date
      `

      return NextResponse.json({
        success: true,
        category,
        papersFound: entries.length,
        papersAnalyzed,
        isRanked,
        today,
      })
    } catch (err) {
      await sql`
        UPDATE daily_fetch_batches SET status = 'failed', error_message = ${String(err)}, completed_at = NOW()
        WHERE category = ${category} AND fetch_date = ${today}::date
      `
      throw err
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
