/**
 * Bulk Import Script for Historical Papers
 * 
 * Usage:
 *   node --loader ts-node/esm scripts/bulk-import-papers.ts path/to/papers.json
 * 
 * Or via API:
 *   POST /api/bulk-import
 *   Body: { filePath: "public/data/cs-ai-191k.json" }
 */

import { createClient } from "@supabase/supabase-js"
import { readFile } from "node:fs/promises"
import type { Database } from "@/lib/supabase/types"

const BATCH_SIZE = 1000 // Insert 1000 papers at a time for optimal performance
const PROGRESS_INTERVAL = 5000 // Log progress every 5000 papers

interface RawPaper {
  id: string
  title: string
  summary?: string
  abstract?: string // Some JSONs use "abstract" instead of "summary"
  authors: string[] | { name: string }[]
  categories: string[] | string
  primary_category?: string
  published: string
  updated?: string
  pdf_url?: string
  arxiv_url?: string
  comment?: string
  journal_ref?: string
  doi?: string
  citation_count?: number
  source?: "arxiv" | "medrxiv"
}

interface ImportStats {
  totalProcessed: number
  inserted: number
  updated: number
  skipped: number
  errors: number
  startTime: number
  endTime?: number
}

/**
 * Normalize paper data from various JSON formats
 */
function normalizePaper(raw: RawPaper) {
  // Handle authors - can be array of strings or array of objects
  const authors = Array.isArray(raw.authors)
    ? raw.authors.map((a) => (typeof a === "string" ? a : a.name))
    : []

  // Handle categories - can be array or comma-separated string
  const categories = Array.isArray(raw.categories)
    ? raw.categories
    : raw.categories?.split(",").map((c) => c.trim()) || []

  // Determine primary category
  const primaryCategory =
    raw.primary_category || categories[0] || "unknown"

  // Handle summary vs abstract
  const summary = raw.summary || raw.abstract || ""

  // Generate URLs if missing
  const pdfUrl = raw.pdf_url || `https://arxiv.org/pdf/${raw.id}`
  const absUrl = raw.arxiv_url || `https://arxiv.org/abs/${raw.id}`

  return {
    id: raw.id,
    title: raw.title,
    summary,
    authors,
    categories,
    primary_category: primaryCategory,
    published: raw.published,
    updated: raw.updated || null,
    pdf_url: pdfUrl,
    abs_url: absUrl,
    comment: raw.comment || null,
    journal_ref: raw.journal_ref || null,
    doi: raw.doi || null,
    citation_count: raw.citation_count || 0,
    source: raw.source || "arxiv",
  }
}

/**
 * Import papers in batches for optimal performance
 */
async function importPapersBatch(
  supabase: ReturnType<typeof createClient<Database>>,
  papers: RawPaper[],
  stats: ImportStats
) {
  const normalized = papers.map(normalizePaper)

  const { data, error } = await supabase
    .from("papers")
    .upsert(normalized, {
      onConflict: "id",
      ignoreDuplicates: false, // Update existing papers
    })
    .select()

  if (error) {
    console.error(`[v0] Batch insert error:`, error.message)
    stats.errors += papers.length
    return
  }

  stats.inserted += data?.length || papers.length
}

/**
 * Main import function
 */
export async function bulkImportPapers(
  filePath: string,
  supabaseUrl?: string,
  supabaseKey?: string
) {
  const stats: ImportStats = {
    totalProcessed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    startTime: Date.now(),
  }

  try {
    // Initialize Supabase client
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error(
        "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      )
    }

    const supabase = createClient<Database>(url, key)

    console.log(`[v0] Starting bulk import from: ${filePath}`)

    // Read JSON file
    const fileContent = await readFile(filePath, "utf-8")
    let papers: RawPaper[]

    try {
      const parsed = JSON.parse(fileContent)

      // Handle different JSON structures
      if (Array.isArray(parsed)) {
        papers = parsed
      } else if (parsed.papers && Array.isArray(parsed.papers)) {
        papers = parsed.papers
      } else if (typeof parsed === "object") {
        // Handle category-based structure like all_papers.json
        papers = Object.values(parsed).flat() as RawPaper[]
      } else {
        throw new Error("Unrecognized JSON structure")
      }
    } catch (parseError) {
      throw new Error(`Failed to parse JSON: ${parseError}`)
    }

    console.log(
      `[v0] Found ${papers.length.toLocaleString()} papers to import`
    )

    // Process in batches
    const batches = Math.ceil(papers.length / BATCH_SIZE)
    console.log(`[v0] Processing in ${batches} batches of ${BATCH_SIZE}`)

    for (let i = 0; i < batches; i++) {
      const start = i * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, papers.length)
      const batch = papers.slice(start, end)

      await importPapersBatch(supabase, batch, stats)

      stats.totalProcessed = end

      // Log progress
      if (end % PROGRESS_INTERVAL === 0 || end === papers.length) {
        const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1)
        const rate = Math.round(stats.totalProcessed / Number.parseFloat(elapsed))
        const progress = ((end / papers.length) * 100).toFixed(1)

        console.log(
          `[v0] Progress: ${end.toLocaleString()}/${papers.length.toLocaleString()} (${progress}%) | ` +
            `${rate} papers/sec | ${elapsed}s elapsed`
        )
      }
    }

    stats.endTime = Date.now()
    const totalTime = ((stats.endTime - stats.startTime) / 1000).toFixed(1)

    console.log("\n[v0] Import completed!")
    console.log(`  Total processed: ${stats.totalProcessed.toLocaleString()}`)
    console.log(`  Inserted: ${stats.inserted.toLocaleString()}`)
    console.log(`  Errors: ${stats.errors.toLocaleString()}`)
    console.log(`  Time: ${totalTime}s`)
    console.log(
      `  Average rate: ${Math.round(stats.totalProcessed / Number.parseFloat(totalTime))} papers/sec`
    )

    return stats
  } catch (error) {
    console.error("[v0] Import failed:", error)
    throw error
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error("Usage: node bulk-import-papers.ts <path-to-json>")
    console.error("Example: node bulk-import-papers.ts ./data/cs-ai-191k.json")
    process.exit(1)
  }

  bulkImportPapers(filePath)
    .then(() => {
      console.log("[v0] Import script finished successfully")
      process.exit(0)
    })
    .catch((error) => {
      console.error("[v0] Import script failed:", error)
      process.exit(1)
    })
}
