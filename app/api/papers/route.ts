import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET /api/papers?category=cs.AI&page=1&limit=100&dateFrom=2024-01-01&dateTo=2024-12-31&search=transformer
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const page     = Math.max(1, parseInt(searchParams.get("page")  || "1"))
    const limit    = Math.min(100, parseInt(searchParams.get("limit") || "100"))
    const dateFrom = searchParams.get("dateFrom")
    const dateTo   = searchParams.get("dateTo")
    const search   = searchParams.get("search")
    const offset   = (page - 1) * limit

    if (!category) return NextResponse.json({ error: "category required" }, { status: 400 })

    // Get the most recent fetch_date for this category
    const latestBatch = await sql`
      SELECT MAX(fetch_date) as latest FROM daily_papers WHERE category = ${category}
    `
    const fetchDate = latestBatch[0]?.latest
    if (!fetchDate) {
      return NextResponse.json({
        papers: [],
        fetchDate: null,
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    // Build WHERE clauses safely using parameterized queries
    const conditions: string[] = [
      `dp.category = $1`,
      `dp.fetch_date = $2`,
    ]
    const values: unknown[] = [category, fetchDate]
    let idx = 3

    if (dateFrom) {
      conditions.push(`dp.published_date >= $${idx}`)
      values.push(dateFrom); idx++
    }
    if (dateTo) {
      conditions.push(`dp.published_date < ($${idx}::date + interval '1 day')`)
      values.push(dateTo); idx++
    }
    if (search) {
      conditions.push(`(dp.title ILIKE $${idx} OR dp.abstract ILIKE $${idx})`)
      values.push(`%${search}%`); idx++
    }

    const where = conditions.join(" AND ")

    const countResult = await sql(
      `SELECT COUNT(*) as total FROM daily_papers dp WHERE ${where}`,
      values
    )
    const total = parseInt(countResult[0]?.total || "0")

    const rows = await sql(
      `SELECT dp.id, dp.category, dp.fetch_date, dp.title, dp.abstract, dp.authors,
              dp.published_date, dp.arxiv_url, dp.pdf_url,
              dp.bs_index, dp.sota_score, dp.is_sota, dp.one_liner,
              dp.core_claims, dp.red_flags, dp.expert_commentary, dp.analyzed_at
       FROM daily_papers dp
       WHERE ${where}
       ORDER BY dp.sota_score DESC NULLS LAST, dp.published_date DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    )

    const papers = rows.map((p: Record<string, unknown>) => ({
      id: p.id,
      title: p.title,
      abstract: p.abstract,
      authors: p.authors || [],
      publishedDate: p.published_date,
      arxivUrl: p.arxiv_url || `https://arxiv.org/abs/${p.id}`,
      pdfUrl:   p.pdf_url   || `https://arxiv.org/pdf/${p.id}`,
      primaryCategory: p.category,
      categories: [p.category],
      analysis: p.analyzed_at ? {
        bsIndex:          p.bs_index,
        sotaScore:        p.sota_score,
        isSOTA:           p.is_sota,
        oneLiner:         p.one_liner,
        coreClaims:       p.core_claims  || [],
        redFlags:         p.red_flags    || [],
        expertCommentary: p.expert_commentary,
      } : null,
    }))

    return NextResponse.json({
      papers,
      fetchDate,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error("Papers API error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
