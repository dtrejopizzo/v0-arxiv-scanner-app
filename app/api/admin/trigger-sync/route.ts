import { NextResponse } from "next/server"

const ADMIN_PASSWORD = "Santander2728,2025*34erASsa35"

// Ranked categories always synced first
const PRIORITY_CATEGORIES = ["cs.AI", "cs.AR", "cs.CR"]

export const maxDuration = 300

// POST /api/admin/trigger-sync
// Body: { categories?: string[] } — defaults to the 3 ranked categories
export async function POST(request: Request) {
  const key = request.headers.get("x-admin-key") || ""
  if (key !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const categories: string[] = body.categories || PRIORITY_CATEGORIES

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"
  const results: Array<{ category: string; status: string; papersAnalyzed?: number; error?: string }> = []

  for (const category of categories) {
    try {
      const res = await fetch(`${baseUrl}/api/sync/arxiv`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_PASSWORD },
        body: JSON.stringify({ category }),
      })
      const data = await res.json()
      results.push({
        category,
        status: data.success ? "ok" : "error",
        papersAnalyzed: data.papersAnalyzed,
        error: data.error,
      })
    } catch (err) {
      results.push({ category, status: "error", error: String(err) })
    }
    // arXiv rate limit between categories
    await new Promise((r) => setTimeout(r, 4000))
  }

  return NextResponse.json({ success: true, results })
}
