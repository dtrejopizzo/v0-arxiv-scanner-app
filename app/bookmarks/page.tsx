"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Bookmark, ExternalLink, Trash2 } from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function BookmarksPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR(user ? "/api/bookmarks" : null, fetcher)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleDelete = async (paperId: string) => {
    try {
      await fetch(`/api/bookmarks?paper_id=${paperId}`, { method: "DELETE" })
      mutate()
    } catch (error) {
      console.error("[v0] Delete bookmark error:", error)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const bookmarks = data?.bookmarks || []

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Bookmarks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bookmarks.length} of 5 free bookmarks used
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/">Browse Papers</Link>
          </Button>
        </div>

        {bookmarks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="size-5" />
                No bookmarks yet
              </CardTitle>
              <CardDescription>
                Browse papers and bookmark the ones you want to analyze later
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {bookmarks.map((bookmark: {
              id: string
              paper_id: string
              title: string
              authors: string[]
              abstract: string
              published_date: string
              arxiv_url: string
              pdf_url?: string
              primary_category: string
              categories: string[]
            }) => (
              <Card key={bookmark.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground leading-tight">
                        {bookmark.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {bookmark.authors.slice(0, 3).join(", ")}
                        {bookmark.authors.length > 3 && ` +${bookmark.authors.length - 3} more`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(bookmark.paper_id)}
                      className="shrink-0"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(bookmark.published_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {bookmark.categories.slice(0, 3).map((cat) => (
                      <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {bookmark.abstract}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                      <a href={bookmark.arxiv_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 size-3" />
                        arXiv
                      </a>
                    </Button>
                    {bookmark.pdf_url && (
                      <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                        <a href={bookmark.pdf_url} target="_blank" rel="noopener noreferrer">
                          PDF
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
