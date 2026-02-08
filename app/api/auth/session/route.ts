import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    // Get unread notification count
    const notifRows = await sql`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ${session.user.id} AND read = FALSE
    `
    const unreadCount = Number(notifRows[0]?.count || 0)

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      unreadNotifications: unreadCount,
    })
  } catch (error) {
    console.error("Session check error:", error)
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}
