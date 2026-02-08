import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET /api/papers?category=cs.AI&page=1&limit=100&dateFrom=2024-01-01&dateTo=2024-12-31&search=transformer&sort=published_date&analyzed=true&sota=true
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const page = Math.max(1, Number(searchParams.get("page") || "1"))
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || "100")))
    const sort = searchParams.get("sort") || "published_date"
    const order = searchParams.get("order") || "desc"
    const onlyAnalyzed = searchParams.get("analyzed") === "true"
    const onlySota = searchParams.get("sota") === "true"
    const search = searchParams.get("search")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const offset = (page - 1) * limit

    // Build dynamic WHERE clauses
    const conditions: string[] = []
    const values: (string | number | boolean)[] = []
    let paramIdx = 1

    if (category) {
      conditions.push(`primary_category = $${paramIdx}`)
      values.push(category)
      paramIdx++
    }
    if (onlyAnalyzed) {
      conditions.push("analyzed_at IS NOT NULL")
    }
    if (onlySota) {
      conditions.push("is_sota = TRUE")
    }
    if (search) {
      conditions.push(`(title ILIKE $${paramIdx} OR abstract ILIKE $${paramIdx})`)
      values.push(`%${search}%`)
      paramIdx++
    }
    if (dateFrom) {
      conditions.push(`published_date >= $${paramIdx}`)
      values.push(dateFrom)
      paramIdx++
    }
    if (dateTo) {
      // Add 1 day to include the end date fully
      conditions.push(`published_date < ($${paramIdx}::date + interval '1 day')`)
      values.push(dateTo)
      paramIdx++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Determine sort column
    const sortMap: Record<string, string> = {
      published_date: "published_date",
      updated_date: "updated_date",
      title: "title",
      sota_score: "sota_score",
      bs_index: "bs_index",
    }
    const sortCol = sortMap[sort] || "published_date"
    const sortDir = order === "asc" ? "ASC" : "DESC"
    const nullsClause = sortDir === "DESC" ? "NULLS LAST" : "NULLS FIRST"

    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM papers ${whereClause}`
    const countResult = await sql(countQuery, values)
    const total = Number(countResult[0]?.total || 0)

    // Data query
    const dataQuery = `SELECT * FROM papers ${whereClause} ORDER BY ${sortCol} ${sortDir} ${nullsClause} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`
    const papers = await sql(dataQuery, [...values, limit, offset])

    // Transform to frontend format
    const transformed = papers.map((p: Record<string, unknown>) => ({
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
      total,
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
