import { sql } from "@/lib/db"

const ADMIN_PASSWORD = "Santander2728,2025*34erASsa35"

export async function GET(request: Request) {
  const key = request.headers.get("x-admin-key") || ""
  if (key !== ADMIN_PASSWORD) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const categories = await sql`
    SELECT 
      primary_category as category,
      COUNT(*) as total,
      COUNT(CASE WHEN analyzed_at IS NOT NULL THEN 1 END) as analyzed
    FROM papers
    WHERE primary_category IS NOT NULL AND primary_category != ''
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
