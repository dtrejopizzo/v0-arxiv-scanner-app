import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// This runs via Vercel Cron: daily at 21:00 EST (1 hour after arXiv updates at 20:00 EST)
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/sync-papers", "schedule": "0 2 * * 2-5" }] }
// That's 02:00 UTC Tue-Fri = 21:00 EST Mon-Thu

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get all unique primary categories from existing papers
  const categoryRows = await sql`
    SELECT DISTINCT primary_category FROM papers WHERE source = 'arxiv' ORDER BY primary_category
  `

  const categories = categoryRows.map((r) => r.primary_category).filter(Boolean)
  const results: Array<{ category: string; status: string; papersNew?: number }> = []

  for (const category of categories) {
    try {
      // Call our sync API internally
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const res = await fetch(`${baseUrl}/api/sync/arxiv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": process.env.ADMIN_API_KEY || "Santander2728,2025*34erASsa35",
        },
        body: JSON.stringify({
          category,
          maxResults: 200, // Get latest 200 papers per category
          analyzeWithAI: true,
        }),
      })

      const result = await res.json()
      results.push({
        category,
        status: result.success ? "ok" : "error",
        papersNew: result.papersNew,
      })

      // Rate limit between categories (arXiv asks for 3s delay)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    } catch (error) {
      results.push({ category, status: "error" })
    }
  }

  const totalNew = results.reduce((sum, r) => sum + (r.papersNew || 0), 0)

  return NextResponse.json({
    success: true,
    categoriesProcessed: results.length,
    totalNewPapers: totalNew,
    results,
  })
}
