import { NextResponse } from "next/server"
import { ARXIV_CATEGORIES } from "@/lib/arxiv-categories"

export const maxDuration = 300

const ADMIN_PASSWORD = "Santander2728,2025*34erASsa35"

function getAllArxivCategories(): string[] {
  return ARXIV_CATEGORIES
    .filter((c) => c.source === "arxiv")
    .flatMap((c) => c.subcategories.map((s) => s.code))
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://arxiv-scanner.vercel.app"

  // Ranked categories go first
  const ranked = ["cs.AI", "cs.AR", "cs.CR"]
  const rest = getAllArxivCategories().filter((c) => !ranked.includes(c))
  const ordered = [...ranked, ...rest]

  const results: Array<{ category: string; status: string; papers?: number }> = []

  for (const category of ordered) {
    try {
      const res = await fetch(`${baseUrl}/api/sync/arxiv`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_PASSWORD },
        body: JSON.stringify({ category }),
      })
      const data = await res.json()
      results.push({ category, status: data.success ? "ok" : "error", papers: data.papersFound })
    } catch (err) {
      results.push({ category, status: "error" })
    }
    await new Promise((r) => setTimeout(r, 2000))
  }

  const ok = results.filter((r) => r.status === "ok").length
  return NextResponse.json({ success: true, total: ordered.length, ok, results })
}
