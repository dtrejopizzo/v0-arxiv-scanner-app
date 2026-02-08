import { NextResponse } from "next/server"
import { getSession, updateUserProfile } from "@/lib/auth"

export async function PUT(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { fullName, userType, institution } = body

    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 })
    }

    await updateUserProfile(session.user.id, {
      fullName: fullName.trim(),
      userType: userType || undefined,
      institution: institution?.trim() || undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
