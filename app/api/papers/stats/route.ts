import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET /api/papers/stats?category=cs.AI
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    if (category) {
      const stats = await sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE analyzed_at IS NOT NULL) as analyzed,
          COUNT(*) FILTER (WHERE is_sota = TRUE) as sota_count,
          AVG(bs_index) FILTER (WHERE bs_index IS NOT NULL) as avg_bs_index,
          AVG(sota_score) FILTER (WHERE sota_score IS NOT NULL) as avg_sota_score,
          MIN(published_date) as oldest,
          MAX(published_date) as newest
        FROM papers
        WHERE primary_category = ${category}
      `

      return NextResponse.json({ category, stats: stats[0] })
    }

    // Global stats
    const globalStats = await sql`
      SELECT
        COUNT(*) as total_papers,
        COUNT(DISTINCT primary_category) as total_categories,
        COUNT(*) FILTER (WHERE analyzed_at IS NOT NULL) as total_analyzed,
        COUNT(*) FILTER (WHERE is_sota = TRUE) as total_sota,
        MAX(created_at) as last_ingested
      FROM papers
    `

    // Per-category counts
    const categoryCounts = await sql`
      SELECT
        primary_category,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE analyzed_at IS NOT NULL) as analyzed,
        COUNT(*) FILTER (WHERE is_sota = TRUE) as sota_count
      FROM papers
      GROUP BY primary_category
      ORDER BY total DESC
    `

    return NextResponse.json({
      global: globalStats[0],
      categories: categoryCounts,
    })
  } catch (error) {
    console.error("Stats API error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
