"use client"

import { useState } from "react"
import { ExternalLink, Loader2, Sparkles, ChevronDown, ChevronUp, Bookmark, BookmarkCheck, SendHorizonal } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import type { AnalyzedPaper, PaperAnalysis } from "@/lib/types"

function BSIndexBadge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s <= 3) return "bg-emerald-100 text-emerald-800 border-emerald-200"
    if (s <= 6) return "bg-amber-100 text-amber-800 border-amber-200"
    return "bg-red-100 text-red-800 border-red-200"
  }
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${getColor(score)}`}>
      BS: {score}/10
    </span>
  )
}

function SOTABadge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 8) return "bg-violet-100 text-violet-800 border-violet-200"
    if (s >= 5) return "bg-sky-100 text-sky-800 border-sky-200"
    return "bg-zinc-100 text-zinc-800 border-zinc-200"
  }
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${getColor(score)}`}>
      SOTA: {score}/10
    </span>
  )
}

function AnalysisSection({ analysis }: { analysis: PaperAnalysis }) {
  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <BSIndexBadge score={analysis.bsIndex} />
        <SOTABadge score={analysis.sotaScore} />
        {analysis.isSOTA && (
          <Badge variant="default" className="bg-emerald-600 text-emerald-50 hover:bg-emerald-600">
            Frontier Paper
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium text-foreground italic">{analysis.oneLiner}</p>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Core Claims</p>
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
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Red Flags</p>
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
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Expert Commentary</p>
        <p className="text-sm text-foreground leading-relaxed">{analysis.expertCommentary}</p>
      </div>
    </div>
  )
}

interface PaperCardProps {
  paper: AnalyzedPaper
  onAnalyze: (paper: AnalyzedPaper) => void
  compact?: boolean
  isCached?: boolean
}

export function PaperCard({ paper, onAnalyze, compact = false, isCached = false }: PaperCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [localAnalysis, setLocalAnalysis] = useState<PaperAnalysis | null>(null)
  const { user, isAuthenticated } = useAuth()

  const analysis = localAnalysis || paper.analysis

  const formattedDate = new Date(paper.published).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

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
      if (data.analysis) {
        setLocalAnalysis(data.analysis)
      } else if (data.needsUpgrade || data.limitReached) {
        // Offer to request instead
        if (confirm(data.error + "\n\nWould you like to request a free admin analysis instead?")) {
          await handleRequestAnalysis()
        }
      }
    } catch { /* ignore */ }
    setAnalyzing(false)
  }

  const handleRequestAnalysis = async () => {
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
          authors: paper.authors,
          categories: paper.categories,
          requestOnly: true,
        }),
      })
      const data = await res.json()
      if (data.success) setRequestSent(true)
    } catch { /* ignore */ }
    setRequesting(false)
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <a
              href={paper.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-foreground leading-tight hover:text-primary transition-colors line-clamp-2"
            >
              {paper.title}
            </a>
            <p className="mt-1 text-xs text-muted-foreground">
              {paper.authors.slice(0, 3).join(", ")}
              {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {analysis && (
              <>
                <BSIndexBadge score={analysis.bsIndex} />
                <SOTABadge score={analysis.sotaScore} />
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
          {paper.categories.slice(0, 3).map((cat) => (
            <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {cat}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!compact && (
          <div>
            <p className={`text-sm text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
              {paper.summary}
            </p>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              {expanded ? "Show less" : "Show more"}
            </button>
          </div>
        )}

        {analysis && <AnalysisSection analysis={analysis} />}

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {/* Analyze button */}
          {!analysis && isAuthenticated && (
            <Button
              size="sm"
              variant="default"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="h-7 text-xs"
            >
              {analyzing ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 size-3" />
              )}
              {analyzing ? "Analyzing..." : "Analyze with AI"}
            </Button>
          )}

          {/* Request analysis button (for free users or over limit) */}
          {!analysis && isAuthenticated && !requestSent && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequestAnalysis}
              disabled={requesting}
              className="h-7 text-xs bg-transparent"
            >
              {requesting ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <SendHorizonal className="mr-1 size-3" />
              )}
              {requesting ? "Sending..." : "Request Analysis"}
            </Button>
          )}
          {requestSent && (
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-xs">
              Request sent
            </Badge>
          )}

          {/* Bookmark */}
          {isAuthenticated && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleBookmark}
              disabled={bookmarking}
              className="h-7 w-7 p-0"
              title={bookmarked ? "Remove bookmark" : "Bookmark paper"}
            >
              {bookmarked ? (
                <BookmarkCheck className="size-3.5 text-primary" />
              ) : (
                <Bookmark className="size-3.5" />
              )}
            </Button>
          )}

          <Button size="sm" variant="outline" asChild className="h-7 text-xs bg-transparent">
            <a href={paper.link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 size-3" />
              arXiv
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild className="h-7 text-xs bg-transparent">
            <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer">
              PDF
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
