import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

const ADMIN_PASSWORD = "Santander2728,2025*34erASsa35"

export async function GET(request: Request) {
  try {
    const key = request.headers.get("x-admin-key") || ""
    if (key !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [
      paperCounts,
      userCounts,
      requestCounts,
      categoryCounts,
      recentSyncs,
    ] = await Promise.all([
      sql`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN analyzed_at IS NOT NULL THEN 1 END) as analyzed,
          COUNT(CASE WHEN is_sota = true THEN 1 END) as sota,
          COUNT(CASE WHEN source = 'medrxiv' THEN 1 END) as medrxiv,
          COUNT(CASE WHEN source = 'arxiv' THEN 1 END) as arxiv
        FROM papers
      `,
      sql`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN plan = 'free' THEN 1 END) as free,
          COUNT(CASE WHEN plan != 'free' THEN 1 END) as paid,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent
        FROM users
      `,
      sql`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'done' THEN 1 END) as done,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM analysis_requests
      `,
      sql`
        SELECT primary_category, COUNT(*) as count,
               COUNT(CASE WHEN analyzed_at IS NOT NULL THEN 1 END) as analyzed
        FROM papers
        WHERE primary_category IS NOT NULL AND primary_category != ''
        GROUP BY primary_category
        ORDER BY count DESC
        LIMIT 50
      `,
      sql`
        SELECT * FROM sync_logs
        ORDER BY started_at DESC
        LIMIT 10
      `,
    ])

    return NextResponse.json({
      papers: paperCounts[0],
      users: userCounts[0],
      requests: requestCounts[0],
      categories: categoryCounts,
      recentSyncs,
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
