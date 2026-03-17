import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { ARXIV_CATEGORIES } from "@/lib/arxiv-categories"

// This endpoint is called from the app on first load.
// It checks if today's sync has already run — if not, kicks it off
// for ALL categories (non-blocking, fire-and-forget per category).
// AI analysis only runs for the 3 ranked categories.

const ADMIN_PASSWORD = "Santander2728,2025*34erASsa35"
const RANKED_CATEGORIES = ["cs.AI", "cs.AR", "cs.CR"]

export const maxDuration = 300

function getAllArxivCategories(): string[] {
  return ARXIV_CATEGORIES
    .filter((c) => c.source === "arxiv")
    .flatMap((c) => c.subcategories.map((s) => s.code))
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0]

    // Check how many categories already have a completed sync today
    const done = await sql`
      SELECT category FROM daily_fetch_batches
      WHERE fetch_date = ${today}::date AND status = 'completed'
    `
    const doneSet = new Set(done.map((r: { category: string }) => r.category))

    const ranked = RANKED_CATEGORIES.filter((c) => !doneSet.has(c))
    const allCats = getAllArxivCategories().filter((c) => !doneSet.has(c) && !RANKED_CATEGORIES.includes(c))

    const pending = [...ranked, ...allCats]

    if (pending.length === 0) {
      return NextResponse.json({ success: true, message: "All categories already synced today", synced: doneSet.size })
    }

    // Return immediately — the actual sync runs in the background
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://arxiv-scanner.vercel.app"

    // Fire-and-forget: kick off each category sequentially in a background async chain
    ;(async () => {
      for (const category of pending) {
        try {
          await fetch(`${baseUrl}/api/sync/arxiv`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_PASSWORD },
            body: JSON.stringify({ category }),
          })
        } catch {
          // silent — cron will retry tomorrow
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
    })()

    return NextResponse.json({
      success: true,
      message: `Sync started for ${pending.length} categories`,
      ranked: ranked,
      remaining: allCats.length,
      alreadyDone: doneSet.size,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
