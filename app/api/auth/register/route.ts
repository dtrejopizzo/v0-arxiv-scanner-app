import { NextResponse } from "next/server"
import { createUser, getUserByEmail, createSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, userType, institution } = body

    // Validation
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existing = await getUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    // Create user
    const user = await createUser({
      email,
      password,
      fullName,
      userType: userType || "individual",
      institution: institution || undefined,
    })

    // Create session
    await createSession(user.id, request)

    // Create welcome notification
    await sql`
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (
        ${user.id},
        'welcome',
        'Welcome to arXiv Scanner!',
        'You have 1 free AI analysis credit. Use it on any paper to get an expert AI assessment.'
      )
    `

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        plan: user.plan,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    )
  }
}
