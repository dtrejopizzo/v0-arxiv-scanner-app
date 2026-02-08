import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/neon/client"
import { verifyAuth } from "@/lib/auth"

// GET /api/bookmarks - Get all bookmarks for authenticated user
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()
    const result = await db.query(
      `SELECT 
        id, paper_id, title, authors, abstract, published_date, 
        arxiv_url, pdf_url, primary_category, categories, created_at
       FROM bookmarks 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [user.id]
    )

    return NextResponse.json({ bookmarks: result.rows })
  } catch (error) {
    console.error("[v0] GET /api/bookmarks error:", error)
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 })
  }
}

// POST /api/bookmarks - Add a bookmark
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      paper_id,
      title,
      authors,
      abstract,
      published_date,
      arxiv_url,
      pdf_url,
      primary_category,
      categories,
    } = body

    if (!paper_id || !title || !authors || !abstract || !published_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = getDb()

    // Check bookmark count
    const countResult = await db.query(
      "SELECT COUNT(*) as count FROM bookmarks WHERE user_id = $1",
      [user.id]
    )
    const bookmarkCount = parseInt(countResult.rows[0].count)

    // Free users can have up to 5 bookmarks
    if (bookmarkCount >= 5 && user.credits === 0) {
      return NextResponse.json(
        { error: "You've reached the limit of 5 free bookmarks. Please upgrade to add more." },
        { status: 403 }
      )
    }

    const result = await db.query(
      `INSERT INTO bookmarks 
        (user_id, paper_id, title, authors, abstract, published_date, arxiv_url, pdf_url, primary_category, categories)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, paper_id) DO NOTHING
       RETURNING *`,
      [
        user.id,
        paper_id,
        title,
        authors,
        abstract,
        published_date,
        arxiv_url,
        pdf_url,
        primary_category,
        categories,
      ]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Bookmark already exists" }, { status: 409 })
    }

    return NextResponse.json({ bookmark: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error("[v0] POST /api/bookmarks error:", error)
    return NextResponse.json({ error: "Failed to add bookmark" }, { status: 500 })
  }
}

// DELETE /api/bookmarks?paper_id=xxx - Remove a bookmark
export async function DELETE(req: NextRequest) {
  try {
    const user = await verifyAuth(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const paperId = req.nextUrl.searchParams.get("paper_id")
    if (!paperId) {
      return NextResponse.json({ error: "Missing paper_id" }, { status: 400 })
    }

    const db = getDb()
    await db.query("DELETE FROM bookmarks WHERE user_id = $1 AND paper_id = $2", [user.id, paperId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] DELETE /api/bookmarks error:", error)
    return NextResponse.json({ error: "Failed to delete bookmark" }, { status: 500 })
  }
}
