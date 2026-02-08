import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET /api/papers?category=cs.AI&page=1&limit=50&sort=published_date&analyzed=true
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const page = Math.max(1, Number(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")))
    const sort = searchParams.get("sort") || "published_date"
    const onlyAnalyzed = searchParams.get("analyzed") === "true"
    const onlySota = searchParams.get("sota") === "true"
    const search = searchParams.get("search")
    const offset = (page - 1) * limit

    // Build the query based on filters
    let papers
    let countResult

    if (category && onlySota) {
      papers = await sql`
        SELECT * FROM papers
        WHERE primary_category = ${category} AND is_sota = TRUE
        ORDER BY sota_score DESC NULLS LAST, published_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`
        SELECT COUNT(*) as total FROM papers
        WHERE primary_category = ${category} AND is_sota = TRUE
      `
    } else if (category && onlyAnalyzed) {
      papers = await sql`
        SELECT * FROM papers
        WHERE primary_category = ${category} AND analyzed_at IS NOT NULL
        ORDER BY published_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`
        SELECT COUNT(*) as total FROM papers
        WHERE primary_category = ${category} AND analyzed_at IS NOT NULL
      `
    } else if (category && search) {
      papers = await sql`
        SELECT * FROM papers
        WHERE primary_category = ${category}
          AND (title ILIKE ${"%" + search + "%"} OR abstract ILIKE ${"%" + search + "%"})
        ORDER BY published_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`
        SELECT COUNT(*) as total FROM papers
        WHERE primary_category = ${category}
          AND (title ILIKE ${"%" + search + "%"} OR abstract ILIKE ${"%" + search + "%"})
      `
    } else if (category) {
      papers = await sql`
        SELECT * FROM papers
        WHERE primary_category = ${category}
        ORDER BY published_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`
        SELECT COUNT(*) as total FROM papers WHERE primary_category = ${category}
      `
    } else if (search) {
      papers = await sql`
        SELECT * FROM papers
        WHERE title ILIKE ${"%" + search + "%"} OR abstract ILIKE ${"%" + search + "%"}
        ORDER BY published_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`
        SELECT COUNT(*) as total FROM papers
        WHERE title ILIKE ${"%" + search + "%"} OR abstract ILIKE ${"%" + search + "%"}
      `
    } else {
      papers = await sql`
        SELECT * FROM papers
        ORDER BY published_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      countResult = await sql`SELECT COUNT(*) as total FROM papers`
    }

    const total = Number(countResult[0]?.total || 0)

    // Transform to match frontend expected format
    const transformed = papers.map((p) => ({
      id: p.id,
      title: p.title,
      abstract: p.abstract,
      authors: p.authors || [],
      categories: p.categories || [],
      primaryCategory: p.primary_category,
      publishedDate: p.published_date,
      updatedDate: p.updated_date,
      arxivUrl: p.arxiv_url,
      pdfUrl: p.pdf_url,
      comment: p.comment,
      journalRef: p.journal_ref,
      doi: p.doi,
      source: p.source,
      // AI Analysis
      analysis: p.analyzed_at
        ? {
            bsIndex: p.bs_index,
            sotaScore: p.sota_score,
            isSOTA: p.is_sota,
            oneLiner: p.one_liner,
            coreClaims: p.core_claims || [],
            redFlags: p.red_flags || [],
            expertCommentary: p.expert_commentary,
            analyzedAt: p.analyzed_at,
            analyzedBy: p.analyzed_by,
          }
        : null,
    }))

    return NextResponse.json({
      papers: transformed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Papers API error:", error)
    return NextResponse.json({ error: "Failed to fetch papers" }, { status: 500 })
  }
}
