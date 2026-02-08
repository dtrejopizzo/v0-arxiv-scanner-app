"use client"

import { useState } from "react"
import { X, ExternalLink, Sparkles, Loader2, Bookmark, BookmarkCheck, SendHorizonal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/lib/auth-context"
import type { AnalyzedPaper } from "@/lib/types"

interface PaperDetailProps {
  paper: AnalyzedPaper
  onClose: () => void
  onAnalyze: (paper: AnalyzedPaper) => void
  isCached?: boolean
}

export function PaperDetail({ paper, onClose, onAnalyze, isCached = false }: PaperDetailProps) {
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [localAnalysis, setLocalAnalysis] = useState<typeof paper.analysis | null>(null)
  const { isAuthenticated } = useAuth()

  const analysis = localAnalysis || paper.analysis

  const handleBookmark = async () => {
    if (!isAuthenticated || bookmarking) return
    setBookmarking(true)
    try {
      const res = await fetch("/api/bookmarks", {
        method: bookmarked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId: paper.id }),
      })
      if (res.ok) setBookmarked(!bookmarked)
    } catch { /* ignore */ }
    setBookmarking(false)
  }

  const handleAnalyze = async () => {
    if (!isAuthenticated || analyzing) return
    setAnalyzing(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId: paper.id,
          title: paper.title,
          summary: paper.summary,
          authors: paper.authors,
          categories: paper.categories,
        }),
      })
      const data = await res.json()
      if (data.analysis) setLocalAnalysis(data.analysis)
    } catch { /* ignore */ }
    setAnalyzing(false)
  }

  const handleRequest = async () => {
    if (!isAuthenticated || requesting) return
    setRequesting(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId: paper.id,
          title: paper.title,
          summary: paper.summary,
          requestOnly: true,
        }),
      })
      const data = await res.json()
      if (data.success) setRequestSent(true)
    } catch { /* ignore */ }
    setRequesting(false)
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l bg-background shadow-xl flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Paper Detail</h2>
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <Button variant="ghost" size="sm" onClick={handleBookmark} disabled={bookmarking} className="h-7 w-7 p-0">
              {bookmarked ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
              <span className="sr-only">{bookmarked ? "Remove bookmark" : "Bookmark"}</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground leading-tight">{paper.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{paper.authors.join(", ")}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {paper.categories.map((cat) => (
                <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Published: {new Date(paper.published).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Abstract</h4>
            <p className="text-sm text-foreground leading-relaxed">{paper.summary}</p>
          </div>

          {analysis && (
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Analysis</h4>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${
                  analysis.bsIndex <= 3 ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : analysis.bsIndex <= 6 ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-red-100 text-red-800 border-red-200"
                }`}>
                  BS Index: {analysis.bsIndex}/10
                </span>
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${
                  analysis.sotaScore >= 8 ? "bg-violet-100 text-violet-800 border-violet-200"
                  : analysis.sotaScore >= 5 ? "bg-sky-100 text-sky-800 border-sky-200"
                  : "bg-zinc-100 text-zinc-800 border-zinc-200"
                }`}>
                  SOTA: {analysis.sotaScore}/10
                </span>
                {analysis.isSOTA && (
                  <Badge variant="default" className="bg-emerald-600 text-emerald-50 hover:bg-emerald-600">Frontier Paper</Badge>
                )}
              </div>
              <p className="text-sm font-medium text-foreground italic">{analysis.oneLiner}</p>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Core Claims</p>
                <ul className="space-y-1">
                  {analysis.coreClaims.map((claim, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {claim}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Red Flags</p>
                <ul className="space-y-1">
                  {analysis.redFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-500" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Expert Commentary</p>
                <p className="text-sm text-foreground leading-relaxed">{analysis.expertCommentary}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {!analysis && isAuthenticated && (
              <>
                <Button onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
                  {analyzing ? "Analyzing..." : "Analyze with AI"}
                </Button>
                {!requestSent ? (
                  <Button variant="outline" onClick={handleRequest} disabled={requesting}>
                    {requesting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <SendHorizonal className="mr-2 size-4" />}
                    {requesting ? "Sending..." : "Request Analysis"}
                  </Button>
                ) : (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                    Request sent
                  </Badge>
                )}
              </>
            )}
            <Button variant="outline" asChild>
              <a href={paper.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 size-4" />
                View on arXiv
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer">PDF</a>
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
