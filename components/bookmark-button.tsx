"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Bookmark } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"

interface BookmarkButtonProps {
  paperId: string
  title: string
  authors: string[]
  abstract: string
  publishedDate: string
  arxivUrl: string
  pdfUrl?: string
  primaryCategory: string
  categories: string[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function BookmarkButton({
  paperId,
  title,
  authors,
  abstract,
  publishedDate,
  arxivUrl,
  pdfUrl,
  primaryCategory,
  categories,
}: BookmarkButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { data } = useSWR(user ? "/api/bookmarks" : null, fetcher)
  const isBookmarked = data?.bookmarks?.some((b: { paper_id: string }) => b.paper_id === paperId)

  const handleBookmark = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    setLoading(true)
    try {
      if (isBookmarked) {
        await fetch(`/api/bookmarks?paper_id=${paperId}`, { method: "DELETE" })
      } else {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paper_id: paperId,
            title,
            authors,
            abstract,
            published_date: publishedDate,
            arxiv_url: arxivUrl,
            pdf_url: pdfUrl,
            primary_category: primaryCategory,
            categories,
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          if (error.error?.includes("MODULE_NOT_FOUND")) {
            alert("Bookmark feature is not available yet. Please run: npm install")
          } else {
            alert(error.error || "Failed to bookmark")
          }
          return
        }
      }

      mutate("/api/bookmarks")
    } catch (error) {
      console.error("[v0] Bookmark feature requires dependencies to be installed")
      alert("Bookmark feature is not available yet. Please run: npm install")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={isBookmarked ? "default" : "outline"}
      size="sm"
      onClick={handleBookmark}
      disabled={loading}
    >
      <Bookmark className={`mr-2 size-4 ${isBookmarked ? "fill-current" : ""}`} />
      {isBookmarked ? "Bookmarked" : "Bookmark"}
    </Button>
  )
}
