import { NextRequest, NextResponse } from 'next/server'
import { signIn, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Sign in user
    const result = await signIn(email, password)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    // Set auth cookie
    await setAuthCookie(result.token)

    return NextResponse.json({
      success: true,
      user: result.user,
    })
  } catch (error) {
    console.error('[v0] Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
