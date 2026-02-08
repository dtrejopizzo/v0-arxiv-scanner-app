import { neon } from "@neondatabase/serverless"

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!)

  const categories = await sql`
    SELECT 
      primary_category as category,
      COUNT(*) as total,
      COUNT(CASE WHEN ai_bs_index IS NOT NULL THEN 1 END) as analyzed
    FROM papers
    GROUP BY primary_category
    ORDER BY COUNT(*) DESC
  `

  return Response.json({
    categories: categories.map((c) => ({
      category: c.category,
      paperCount: Number(c.total),
      analyzedCount: Number(c.analyzed),
    })),
  })
}
