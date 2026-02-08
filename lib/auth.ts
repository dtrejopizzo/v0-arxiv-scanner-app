import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { sql } from './neon/client'
import type { User } from './neon/client'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)
const COOKIE_NAME = 'auth_token'

export type SessionUser = {
  id: string
  email: string
  fullName: string | null
  credits: number
  isAdmin: boolean
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Verify password
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Create JWT token
export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

// Verify JWT token
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return (payload.user as SessionUser) || null
  } catch {
    return null
  }
}

// Get current user from cookies
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  return verifyToken(token)
}

// Set auth cookie
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

// Clear auth cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// Sign up new user
export async function signUp(
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: SessionUser; token: string } | { error: string }> {
  try {
    // Check if user exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email}
    `
    
    if (existing.length > 0) {
      return { error: 'Email already registered' }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const [newUser] = await sql<User[]>`
      INSERT INTO users (email, password_hash, full_name, credits)
      VALUES (${email}, ${passwordHash}, ${fullName || null}, 10)
      RETURNING id, email, full_name, credits, is_admin
    `

    const sessionUser: SessionUser = {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      credits: newUser.credits,
      isAdmin: newUser.is_admin,
    }

    const token = await createToken(sessionUser)

    return { user: sessionUser, token }
  } catch (error) {
    console.error('[v0] Sign up error:', error)
    return { error: 'Failed to create account' }
  }
}

// Sign in user
export async function signIn(
  email: string,
  password: string
): Promise<{ user: SessionUser; token: string } | { error: string }> {
  try {
    // Get user
    const [user] = await sql<User[]>`
      SELECT id, email, password_hash, full_name, credits, is_admin
      FROM users
      WHERE email = ${email}
    `

    if (!user) {
      return { error: 'Invalid email or password' }
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return { error: 'Invalid email or password' }
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      credits: user.credits,
      isAdmin: user.is_admin,
    }

    const token = await createToken(sessionUser)

    return { user: sessionUser, token }
  } catch (error) {
    console.error('[v0] Sign in error:', error)
    return { error: 'Failed to sign in' }
  }
}

// Deduct credits from user
export async function deductCredits(
  userId: string,
  paperId: string,
  amount = 1
): Promise<boolean> {
  try {
    const result = await sql`
      WITH credit_check AS (
        SELECT credits FROM users WHERE id = ${userId}
      ),
      deduct AS (
        UPDATE users
        SET credits = credits - ${amount}, updated_at = NOW()
        WHERE id = ${userId} AND credits >= ${amount}
        RETURNING id
      )
      INSERT INTO user_credits (user_id, paper_id, credits_used)
      SELECT ${userId}, ${paperId}, ${amount}
      WHERE EXISTS (SELECT 1 FROM deduct)
      RETURNING id
    `

    return result.length > 0
  } catch (error) {
    console.error('[v0] Deduct credits error:', error)
    return false
  }
}

// Check if user has credits
export async function hasCredits(userId: string, amount = 1): Promise<boolean> {
  try {
    const [result] = await sql`
      SELECT credits FROM users WHERE id = ${userId}
    `
    return result?.credits >= amount
  } catch {
    return false
  }
}
