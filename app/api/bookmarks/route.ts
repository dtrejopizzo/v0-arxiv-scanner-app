import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/bookmarks - Get user's bookmarks
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const bookmarks = await sql`
      SELECT b.id, b.created_at as bookmarked_at, p.*
      FROM bookmarks b
      JOIN papers p ON b.paper_id = p.id
      WHERE b.user_id = ${session.user.id}
      ORDER BY b.created_at DESC
    `

    return NextResponse.json({ bookmarks })
  } catch (error) {
    console.error("Bookmarks error:", error)
    return NextResponse.json({ error: "Failed to load bookmarks" }, { status: 500 })
  }
}

// POST /api/bookmarks - Toggle bookmark
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { paperId } = await request.json()
    if (!paperId) return NextResponse.json({ error: "paperId required" }, { status: 400 })

    // Check if already bookmarked
    const existing = await sql`
      SELECT id FROM bookmarks WHERE user_id = ${session.user.id} AND paper_id = ${paperId}
    `

    if (existing.length > 0) {
      // Remove bookmark
      await sql`DELETE FROM bookmarks WHERE user_id = ${session.user.id} AND paper_id = ${paperId}`
      return NextResponse.json({ bookmarked: false })
    }

    // Add bookmark
    await sql`
      INSERT INTO bookmarks (user_id, paper_id) VALUES (${session.user.id}, ${paperId})
    `
    return NextResponse.json({ bookmarked: true })
  } catch (error) {
    console.error("Bookmark toggle error:", error)
    return NextResponse.json({ error: "Failed to toggle bookmark" }, { status: 500 })
  }
}
