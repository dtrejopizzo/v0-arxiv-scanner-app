import { NextRequest, NextResponse } from 'next/server'
import { signUp, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, fullName } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Sign up user
    const result = await signUp(email, password, fullName)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Set auth cookie
    await setAuthCookie(result.token)

    return NextResponse.json({
      success: true,
      user: result.user,
    })
  } catch (error) {
    console.error('[v0] Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
