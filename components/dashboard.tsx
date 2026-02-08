"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import {
  Loader2,
  Sparkles,
  BookOpen,
  Database,
  Clock,
  FlaskConical,
  Github,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  CalendarIcon,
  X,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PaperCard } from "@/components/paper-card"
import { SOTARanking } from "@/components/sota-ranking"
import { StatsCards } from "@/components/stats-cards"
import { PaperDetail } from "@/components/paper-detail"
import { isMedRxivCategory } from "@/lib/arxiv-categories"
import { useAuth } from "@/lib/auth-context"
import type { AnalyzedPaper } from "@/lib/types"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

interface DashboardProps {
  selectedCategory: string | null
}

export function Dashboard({ selectedCategory }: DashboardProps) {
  const [selectedPaper, setSelectedPaper] = useState<AnalyzedPaper | null>(null)
  const { user, isAuthenticated } = useAuth()

  // Pagination & filter state
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const ITEMS_PER_PAGE = 100

  // Reset pagination when category changes
  const [prevCategory, setPrevCategory] = useState<string | null>(null)
  if (selectedCategory !== prevCategory) {
    setPrevCategory(selectedCategory)
    setPage(1)
    setDateFrom("")
    setDateTo("")
    setSearchQuery("")
    setAppliedSearch("")
  }

  // Build API URL with all filters
  const dbUrl = useMemo(() => {
    if (!selectedCategory) return null
    const params = new URLSearchParams()
    params.set("category", selectedCategory)
    params.set("page", String(page))
    params.set("limit", String(ITEMS_PER_PAGE))
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    if (appliedSearch) params.set("search", appliedSearch)
    return `/api/papers?${params.toString()}`
  }, [selectedCategory, page, dateFrom, dateTo, appliedSearch])

  const { data: dbData, error: dbError, isLoading } = useSWR(
    dbUrl,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false, keepPreviousData: true }
  )

  const totalPapers = dbData?.pagination?.total ?? 0
  const totalPages = dbData?.pagination?.totalPages ?? 0

  // Build papers list from DB response
  const papers = useMemo(() => {
    if (!dbData?.papers || dbData.papers.length === 0) return [] as AnalyzedPaper[]

    return dbData.papers.map((p: {
      id: string
      title: string
      abstract: string
      authors: string[]
      categories: string[]
      primaryCategory: string
      publishedDate: string
      updatedDate: string
      arxivUrl: string
      pdfUrl: string
      comment: string | null
      source: string
      analysis: {
        bsIndex: number
        sotaScore: number
        isSOTA: boolean
        oneLiner: string
        coreClaims: string[]
        redFlags: string[]
        expertCommentary: string
      } | null
    }) => ({
      id: p.id,
      title: p.title,
      summary: p.abstract,
      authors: p.authors || [],
      published: p.publishedDate,
      updated: p.updatedDate,
      categories: p.categories || [],
      primaryCategory: p.primaryCategory,
      link: p.arxivUrl || `https://arxiv.org/abs/${p.id}`,
      pdfLink: p.pdfUrl || `https://arxiv.org/pdf/${p.id}`,
      analysis: p.analysis || undefined,
    })) as AnalyzedPaper[]
  }, [dbData])

  // No-op analyze (all analysis is pre-computed)
  const analyzePaper = useCallback(async (_paper: AnalyzedPaper) => {}, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedSearch(searchQuery)
    setPage(1)
  }

  const clearFilters = () => {
    setDateFrom("")
    setDateTo("")
    setSearchQuery("")
    setAppliedSearch("")
    setPage(1)
  }

  const hasActiveFilters = dateFrom || dateTo || appliedSearch

  // ─── Welcome / Beta Screen ────────────────────────────────────
  if (!selectedCategory) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <BookOpen className="size-8 text-muted-foreground" />
        </div>

        <div className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
              <FlaskConical className="mr-1 size-3" />
              BETA
            </Badge>
            <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">
              <Github className="mr-1 size-3" />
              Open Source
            </Badge>
          </div>

          <h2 className="text-balance text-2xl font-bold text-foreground">
            arXiv + medRxiv Scanner
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground">
            Select a category from the sidebar to view the latest papers and their AI-powered analysis.
            Each paper is evaluated for novelty, rigor, and SOTA relevance, giving you a clear picture
            of what is worth reading.
          </p>
        </div>

        <Card className="mx-auto w-full max-w-lg border-dashed">
          <CardContent className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">What we are building</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Behind the scenes, we are working to link the more than <strong className="text-foreground">3 million papers</strong> across
              arXiv and medRxiv to this tool. The goal is not only to analyze the latest publications,
              but to provide <strong className="text-foreground">complete tracking of the papers that shaped each research area</strong> mapped
              in this app -- from foundational work to the cutting edge.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <BookOpen className="size-3.5" />
            <span>arXiv: 13 categories, 150+ subcategories</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HeartPulse className="size-3.5" />
            <span>medRxiv: 51 medical subcategories</span>
          </div>
        </div>
      </div>
    )
  }

  // ─── Loading (first load only) ────────────────────────────────
  if (isLoading && !dbData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading papers for <span className="font-mono font-semibold">{selectedCategory}</span>...
          </p>
        </div>
      </div>
    )
  }

  // ─── No data available ────────────────────────────────────────
  if (dbError || (!isLoading && papers.length === 0 && !hasActiveFilters)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
            <Database className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No data available yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Analysis for <span className="font-mono font-semibold">{selectedCategory}</span> has not been generated yet.
            Use the admin panel to fetch papers and run AI analysis.
          </p>
        </div>
      </div>
    )
  }

  const analyzedCount = papers.filter((p: AnalyzedPaper) => p.analysis).length
  const hasAnalyzed = analyzedCount > 0
  const isMedrxiv = selectedCategory ? isMedRxivCategory(selectedCategory) : false
  const startItem = (page - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(page * ITEMS_PER_PAGE, totalPapers)

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <StatsCards papers={papers} />

      {/* Header with badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedCategory}
            </h2>
            {isMedrxiv && (
              <Badge variant="outline" className="gap-1 border-rose-200 bg-rose-50 text-rose-700">
                <HeartPulse className="size-3" />
                medRxiv
              </Badge>
            )}
            <Badge variant="outline" className="gap-1 border-blue-300 bg-blue-50 text-blue-700">
              <Database className="size-3" />
              {totalPapers.toLocaleString()} papers
            </Badge>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            Showing {startItem.toLocaleString()}-{endItem.toLocaleString()} of {totalPapers.toLocaleString()}
            {hasAnalyzed && ` | ${analyzedCount} with AI analysis on this page`}
          </p>
        </div>
        {isLoading && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-end gap-3 px-4 lg:px-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-1.5" style={{ minWidth: 200 }}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search titles and abstracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-9">
            Search
          </Button>
        </form>

        {/* Date from */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">From</label>
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="h-9 w-40 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">To</label>
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="h-9 w-40 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-muted-foreground">
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* No results with filters */}
      {papers.length === 0 && hasActiveFilters && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Search className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No papers found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search or date filters.</p>
          <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
            Clear all filters
          </Button>
        </div>
      )}

      {/* Main content tabs */}
      {papers.length > 0 && (
        <Tabs defaultValue={hasAnalyzed ? "sota" : "papers"} className="px-4 lg:px-6">
          <TabsList>
            <TabsTrigger value="sota" disabled={!hasAnalyzed}>
              <Sparkles className="mr-1.5 size-3" />
              SOTA Ranking {hasAnalyzed && `(${analyzedCount})`}
            </TabsTrigger>
            <TabsTrigger value="papers">
              <BookOpen className="mr-1.5 size-3" />
              All Papers ({papers.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sota" className="mt-4">
            <SOTARanking
              papers={papers}
              onSelectPaper={(paper) => setSelectedPaper(paper)}
            />
          </TabsContent>
          <TabsContent value="papers" className="mt-4">
            <div className="grid gap-3">
              {papers.map((paper: AnalyzedPaper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  onAnalyze={analyzePaper}
                  isCached={true}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3 lg:px-6">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages.toLocaleString()} ({totalPapers.toLocaleString()} papers)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage(1)}
              disabled={page <= 1}
              aria-label="First page"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>

            {/* Page number buttons */}
            {(() => {
              const pages: number[] = []
              const maxVisible = 5
              let start = Math.max(1, page - Math.floor(maxVisible / 2))
              const end = Math.min(totalPages, start + maxVisible - 1)
              start = Math.max(1, end - maxVisible + 1)

              for (let i = start; i <= end; i++) {
                pages.push(i)
              }

              return pages.map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="icon"
                  className="size-8 text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))
            })()}

            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              aria-label="Last page"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {selectedPaper && (
        <PaperDetail
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
          onAnalyze={analyzePaper}
          isCached={true}
        />
      )}
    </div>
  )
}
