import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET /api/rankings?category=cs.AI
// Returns the top-10 ranking for a given category (today's, or most recent available)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    if (!category) return NextResponse.json({ error: "category is required" }, { status: 400 })

    // Get most recent ranking date for this category
    const latestDate = await sql`
      SELECT MAX(rank_date) as latest FROM category_rankings WHERE category = ${category}
    `
    const rankDate = latestDate[0]?.latest
    if (!rankDate) {
      return NextResponse.json({ rankings: [], rankDate: null, category })
    }

    const rows = await sql`
      SELECT
        rank_position,
        paper_id,
        sota_score,
        bs_index,
        title,
        authors,
        published_date,
        arxiv_url,
        one_liner,
        expert_commentary
      FROM category_rankings
      WHERE category = ${category} AND rank_date = ${rankDate}
      ORDER BY rank_position ASC
    `

    return NextResponse.json({
      category,
      rankDate,
      rankings: rows.map((r) => ({
        position: r.rank_position,
        paperId: r.paper_id,
        sotaScore: r.sota_score,
        bsIndex: r.bs_index,
        title: r.title,
        authors: r.authors || [],
        publishedDate: r.published_date,
        arxivUrl: r.arxiv_url,
        oneLiner: r.one_liner,
        expertCommentary: r.expert_commentary,
      })),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
