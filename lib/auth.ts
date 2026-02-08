import { sql } from "@/lib/db"
import { cookies } from "next/headers"
import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

// ================================================
// Password hashing with scrypt (no bcrypt needed)
// ================================================

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  const hashBuffer = Buffer.from(hash, "hex")
  const testBuffer = scryptSync(password, salt, 64)
  return timingSafeEqual(hashBuffer, testBuffer)
}

// ================================================
// Session management
// ================================================

const SESSION_COOKIE = "arxiv_session"
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function generateToken(): string {
  return randomBytes(32).toString("hex")
}

export async function createSession(userId: string, request?: Request) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const ipAddress = request?.headers.get("x-forwarded-for") || "unknown"
  const userAgent = request?.headers.get("user-agent") || "unknown"

  await sql`
    INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
    VALUES (${userId}, ${token}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent})
  `

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  })

  return token
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const rows = await sql`
    SELECT s.id as session_id, s.expires_at,
           u.id, u.email, u.full_name, u.role, u.user_type, u.institution,
           u.avatar_url, u.is_admin, u.plan, u.daily_analysis_limit,
           u.analyses_used_today, u.welcome_credit_used, u.stripe_customer_id,
           u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
    LIMIT 1
  `

  if (rows.length === 0) {
    // Clean up expired cookie
    cookieStore.delete(SESSION_COOKIE)
    return null
  }

  const row = rows[0]
  return {
    sessionId: row.session_id,
    user: {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      userType: row.user_type,
      institution: row.institution,
      avatarUrl: row.avatar_url,
      isAdmin: row.is_admin,
      plan: row.plan,
      dailyAnalysisLimit: row.daily_analysis_limit,
      analysesUsedToday: row.analyses_used_today,
      welcomeCreditUsed: row.welcome_credit_used,
      stripeCustomerId: row.stripe_customer_id,
      createdAt: row.created_at,
    },
  }
}

export async function requireSession() {
  const session = await getSession()
  if (!session) {
    throw new Error("UNAUTHORIZED")
  }
  return session
}

export async function requireAdmin() {
  const session = await requireSession()
  if (!session.user.isAdmin) {
    throw new Error("FORBIDDEN")
  }
  return session
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await sql`DELETE FROM sessions WHERE token = ${token}`
    cookieStore.delete(SESSION_COOKIE)
  }
}

// ================================================
// User CRUD helpers
// ================================================

export async function getUserByEmail(email: string) {
  const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`
  return rows[0] || null
}

export async function getUserById(id: string) {
  const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`
  return rows[0] || null
}

export async function createUser(data: {
  email: string
  password: string
  fullName: string
  userType?: string
  institution?: string
}) {
  const passwordHash = hashPassword(data.password)
  const rows = await sql`
    INSERT INTO users (email, password_hash, full_name, user_type, institution)
    VALUES (
      ${data.email.toLowerCase()},
      ${passwordHash},
      ${data.fullName},
      ${data.userType || "individual"},
      ${data.institution || null}
    )
    RETURNING id, email, full_name, role, user_type, plan, is_admin, created_at
  `
  return rows[0]
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const passwordHash = hashPassword(newPassword)
  await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${userId}`
}

export async function updateUserProfile(
  userId: string,
  data: { fullName?: string; institution?: string; userType?: string; avatarUrl?: string }
) {
  const sets: string[] = []
  const values: (string | null)[] = []

  if (data.fullName !== undefined) {
    await sql`UPDATE users SET full_name = ${data.fullName}, updated_at = NOW() WHERE id = ${userId}`
  }
  if (data.institution !== undefined) {
    await sql`UPDATE users SET institution = ${data.institution}, updated_at = NOW() WHERE id = ${userId}`
  }
  if (data.userType !== undefined) {
    await sql`UPDATE users SET user_type = ${data.userType}, updated_at = NOW() WHERE id = ${userId}`
  }
  if (data.avatarUrl !== undefined) {
    await sql`UPDATE users SET avatar_url = ${data.avatarUrl}, updated_at = NOW() WHERE id = ${userId}`
  }
}
