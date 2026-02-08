"use client"

import { createContext, useContext, useCallback, type ReactNode } from "react"
import useSWR from "swr"

export interface User {
  id: string
  email: string
  fullName: string
  role: string
  userType: string
  institution: string | null
  avatarUrl: string | null
  isAdmin: boolean
  plan: string
  dailyAnalysisLimit: number
  analysesUsedToday: number
  welcomeCreditUsed: boolean
  stripeCustomerId: string | null
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  unreadNotifications: number
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refresh: () => void
}

interface RegisterData {
  email: string
  password: string
  fullName: string
  userType?: string
  institution?: string
}

const AuthContext = createContext<AuthContextType | null>(null)

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate } = useSWR("/api/auth/session", fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 10000,
  })

  const user = data?.authenticated ? data.user : null
  const unreadNotifications = data?.unreadNotifications || 0

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const result = await res.json()
      if (result.success) {
        await mutate()
        return { success: true }
      }
      return { success: false, error: result.error }
    },
    [mutate]
  )

  const register = useCallback(
    async (data: RegisterData) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success) {
        await mutate()
        return { success: true }
      }
      return { success: false, error: result.error }
    },
    [mutate]
  )

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    await mutate()
  }, [mutate])

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        unreadNotifications,
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
