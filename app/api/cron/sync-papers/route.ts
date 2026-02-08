import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/client"
import type { Paper } from "@/lib/supabase/types"

/**
 * Daily Cron Job: Sync New Papers from arXiv
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-papers",
 *     "schedule": "0 21 * * 1-4"  // Mon-Thu at 9pm EST (after arXiv 8pm release)
 *   }]
 * }
 * 
 * Or call manually: POST /api/cron/sync-papers
 */

const ARXIV_API_BASE = "http://export.arxiv.org/api/query"
const RATE_LIMIT_DELAY = 3000 // 3 seconds between requests (arXiv requirement)

interface ArxivEntry {
  id: string
  title: string
  summary: string
  author: Array<{ name: string }>
  published: string
  updated?: string
  category?: Array<{ $: { term: string } }>
  link?: Array<{ $: { href: string; title?: string } }>
  "arxiv:comment"?: string
  "arxiv:journal_ref"?: string
  "arxiv:doi"?: string
  "arxiv:primary_category"?: { $: { term: string } }
}

/**
 * Fetch papers from arXiv API for a specific category since last sync
 */
async function fetchArxivPapers(
  category: string,
  fromDate: string
): Promise<Paper[]> {
  const query = `cat:${category} AND submittedDate:[${fromDate} TO *]`
  const maxResults = 1000 // arXiv API limit per request

  const url = new URL(ARXIV_API_BASE)
  url.searchParams.set("search_query", query)
  url.searchParams.set("start", "0")
  url.searchParams.set("max_results", maxResults.toString())
  url.searchParams.set("sortBy", "submittedDate")
  url.searchParams.set("sortOrder", "ascending")

  console.log(`[v0] Fetching arXiv papers for ${category} since ${fromDate}`)

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "arXiv-Scanner/1.0 (research tool)",
    },
  })

  if (!response.ok) {
    throw new Error(`arXiv API error: ${response.status} ${response.statusText}`)
  }

  const xmlText = await response.text()

  // Parse XML (simple parsing - for production consider using xml2js or fast-xml-parser)
  const papers = parseArxivXML(xmlText)

  console.log(`[v0] Found ${papers.length} new papers in ${category}`)

  return papers
}

/**
 * Simple XML parser for arXiv API response
 */
function parseArxivXML(xml: string): Paper[] {
  const papers: Paper[] = []

  // Extract entries (simplified - in production use proper XML parser)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  const entries = xml.match(entryRegex) || []

  for (const entry of entries) {
    try {
      // Extract arXiv ID
      const idMatch = entry.match(/<id>http:\/\/arxiv\.org\/abs\/([\d.]+)(?:v\d+)?<\/id>/)
      const id = idMatch?.[1]
      if (!id) continue

      // Extract title
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/)
      const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() || ""

      // Extract summary
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/)
      const summary = summaryMatch?.[1]?.replace(/\s+/g, " ").trim() || ""

      // Extract authors
      const authorMatches = entry.matchAll(/<author>\s*<name>(.*?)<\/name>/g)
      const authors = Array.from(authorMatches, m => m[1].trim())

      // Extract published date
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/)
      const published = publishedMatch?.[1] || new Date().toISOString()

      // Extract updated date
      const updatedMatch = entry.match(/<updated>(.*?)<\/updated>/)
      const updated = updatedMatch?.[1] || null

      // Extract categories
      const categoryMatches = entry.matchAll(/<category term="(.*?)"/g)
      const categories = Array.from(categoryMatches, m => m[1])

      // Extract primary category
      const primaryCategoryMatch = entry.match(/<arxiv:primary_category.*?term="(.*?)"/)
      const primaryCategory = primaryCategoryMatch?.[1] || categories[0] || "unknown"

      // Extract comment
      const commentMatch = entry.match(/<arxiv:comment.*?>(.*?)<\/arxiv:comment>/)
      const comment = commentMatch?.[1] || null

      // Extract journal ref
      const journalMatch = entry.match(/<arxiv:journal_ref.*?>(.*?)<\/arxiv:journal_ref>/)
      const journalRef = journalMatch?.[1] || null

      // Extract DOI
      const doiMatch = entry.match(/<arxiv:doi.*?>(.*?)<\/arxiv:doi>/)
      const doi = doiMatch?.[1] || null

      papers.push({
        id,
        title,
        summary,
        authors,
        categories,
        primary_category: primaryCategory,
        published,
        updated,
        pdf_url: `https://arxiv.org/pdf/${id}`,
        abs_url: `https://arxiv.org/abs/${id}`,
        comment,
        journal_ref: journalRef,
        doi,
        citation_count: 0,
        source: "arxiv",
        created_at: new Date().toISOString(),
        indexed_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("[v0] Error parsing entry:", error)
      continue
    }
  }

  return papers
}

/**
 * Get last sync date for a category
 */
async function getLastSyncDate(
  supabase: ReturnType<typeof createServiceClient>,
  category: string
): Promise<string> {
  const { data, error } = await supabase
    .from("sync_logs")
    .select("sync_date, completed_at")
    .eq("category", category)
    .eq("status", "success")
    .order("sync_date", { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    // No previous sync, default to 1 day ago
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split("T")[0]
  }

  return data.sync_date
}

/**
 * Main sync function
 */
async function syncCategory(
  supabase: ReturnType<typeof createServiceClient>,
  category: string,
  syncDate: string
) {
  const startTime = Date.now()

  // Create sync log entry
  const { data: logData, error: logError } = await supabase
    .from("sync_logs")
    .insert({
      sync_date: syncDate,
      category,
      status: "running",
    })
    .select()
    .single()

  if (logError) {
    console.error(`[v0] Failed to create sync log for ${category}:`, logError)
    throw logError
  }

  try {
    // Get last sync date
    const fromDate = await getLastSyncDate(supabase, category)

    // Fetch new papers from arXiv
    const papers = await fetchArxivPapers(category, fromDate)

    if (papers.length === 0) {
      // No new papers
      await supabase
        .from("sync_logs")
        .update({
          papers_found: 0,
          papers_inserted: 0,
          papers_analyzed: 0,
          status: "success",
          duration_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logData.id)

      return { category, papers: 0, analyzed: 0 }
    }

    // Insert papers (upsert to handle duplicates)
    const { data: insertedPapers, error: insertError } = await supabase
      .from("papers")
      .upsert(papers, { onConflict: "id" })
      .select()

    if (insertError) {
      throw insertError
    }

    // Update sync log
    await supabase
      .from("sync_logs")
      .update({
        papers_found: papers.length,
        papers_inserted: insertedPapers?.length || 0,
        papers_analyzed: 0, // Will be filled by auto-analysis task
        status: "success",
        duration_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq("id", logData.id)

    console.log(
      `[v0] Synced ${insertedPapers?.length || 0} papers for ${category}`
    )

    return {
      category,
      papers: insertedPapers?.length || 0,
      analyzed: 0,
    }
  } catch (error) {
    // Update sync log with error
    await supabase
      .from("sync_logs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq("id", logData.id)

    throw error
  }
}

/**
 * Delay helper for rate limiting
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * GET /api/cron/sync-papers
 * Sync all configured categories
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceClient()
    const syncDate = new Date().toISOString().split("T")[0]

    // Categories to sync (you can make this configurable)
    const categories = [
      "cs.AI",
      "cs.LG",
      "cs.CV",
      "cs.CL",
      "cs.NE",
      "cs.RO",
      "stat.ML",
    ]

    console.log(`[v0] Starting daily sync for ${syncDate}`)

    const results = []

    for (const category of categories) {
      try {
        const result = await syncCategory(supabase, category, syncDate)
        results.push(result)

        // Rate limit: wait 3 seconds between API calls
        await delay(RATE_LIMIT_DELAY)
      } catch (error) {
        console.error(`[v0] Failed to sync ${category}:`, error)
        results.push({
          category,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const totalPapers = results.reduce(
      (sum, r) => sum + (r.papers || 0),
      0
    )

    console.log(`[v0] Daily sync completed: ${totalPapers} total papers`)

    return NextResponse.json({
      success: true,
      sync_date: syncDate,
      categories: results,
      total_papers: totalPapers,
    })
  } catch (error) {
    console.error("[v0] Cron sync error:", error)
    return NextResponse.json(
      {
        error: "Sync failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes max execution time
