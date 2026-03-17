import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AuthProvider } from "@/lib/auth-context"
import { headers } from "next/headers"

import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'arXiv Scanner - SOTA Paper Tracker',
  description: 'Stay on top of the latest research. Scan arXiv categories, analyze papers with AI, and discover state-of-the-art publications.',
}

// Kick off daily sync on first request — non-blocking, safe to call on every render
// (the endpoint itself checks if today's sync already ran and skips if so)
async function triggerDailySync() {
  try {
    const hdrs = await headers()
    const host = hdrs.get("host") || ""
    const proto = host.includes("localhost") ? "http" : "https"
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`
    await fetch(`${baseUrl}/api/startup-sync`, { next: { revalidate: 86400 } })
  } catch {
    // silent — never block rendering
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Fire daily sync check (no await — does not block page render)
  triggerDailySync()

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
