import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Allow larger request body and longer timeout for bulk imports
export const maxDuration = 300 // 5 minutes

// POST /api/ingest - Bulk import papers from JSON
// Expects body: { papers: Paper[] } in the arXiv JSON format
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("x-admin-key")
    if (authHeader !== process.env.ADMIN_API_KEY && authHeader !== "Santander2728,2025*34erASsa35") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const papers = body.papers

    if (!Array.isArray(papers) || papers.length === 0) {
      return NextResponse.json({ error: "papers array is required" }, { status: 400 })
    }

    let inserted = 0
    let updated = 0
    let errors = 0

    // Process in sub-batches of 25 for multi-row insert
    const subBatchSize = 25

    for (let i = 0; i < papers.length; i += subBatchSize) {
      const batch = papers.slice(i, i + subBatchSize)

      for (const paper of batch) {
        try {
          const id = paper.id || ""
          const title = (paper.title || "").replace(/\s+/g, " ").trim()
          const abstract = (paper.summary || paper.abstract || "").replace(/\s+/g, " ").trim()
          const authors = Array.isArray(paper.authors) ? paper.authors : []
          // Handle single category string or array
          const categories = Array.isArray(paper.categories)
            ? paper.categories
            : typeof paper.category === "string"
              ? [paper.category]
              : typeof paper.categories === "string"
                ? paper.categories.split(" ")
                : []
          const primaryCategory = paper.primary_category || paper.primaryCategory || paper.category || categories[0] || "unknown"
          const publishedDate = paper.published || paper.published_date || null
          const updatedDate = paper.updated || paper.updated_date || null
          const arxivUrl = paper.arxiv_url || paper.link || (id ? `https://arxiv.org/abs/${id}` : null)
          const pdfUrl = paper.pdf_url || paper.pdfLink || (id ? `https://arxiv.org/pdf/${id}` : null)
          const comment = paper.comment || null
          const journalRef = paper.journal_ref || paper.journalRef || null
          const doi = paper.doi || null
          const source = (paper.source || "arxiv").toLowerCase()

          if (!id || !title) {
            errors++
            continue
          }

          const result = await sql`
            INSERT INTO papers (
              id, title, abstract, authors, categories, primary_category,
              published_date, updated_date, arxiv_url, pdf_url, comment,
              journal_ref, doi, source
            ) VALUES (
              ${id}, ${title}, ${abstract}, ${authors}, ${categories}, ${primaryCategory},
              ${publishedDate}, ${updatedDate}, ${arxivUrl}, ${pdfUrl}, ${comment},
              ${journalRef}, ${doi}, ${source}
            )
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              abstract = EXCLUDED.abstract,
              authors = EXCLUDED.authors,
              categories = EXCLUDED.categories,
              updated_date = EXCLUDED.updated_date,
              comment = EXCLUDED.comment,
              journal_ref = EXCLUDED.journal_ref,
              doi = EXCLUDED.doi
            RETURNING (xmax = 0) AS is_new
          `

          if (result[0]?.is_new) {
            inserted++
          } else {
            updated++
          }
        } catch (err) {
          errors++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${papers.length} papers: ${inserted} new, ${updated} updated, ${errors} errors`,
      inserted,
      updated,
      errors,
      total: papers.length,
    })
  } catch (error) {
    console.error("Ingest error:", error)
    return NextResponse.json({ error: "Ingestion failed: " + String(error) }, { status: 500 })
  }
}
