"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import {
  Loader2, Sparkles, BookOpen, Database, Clock,
  FlaskConical, Github, HeartPulse, ChevronLeft,
  ChevronRight, ChevronsLeft, ChevronsRight, Search,
  CalendarIcon, X, Trophy, ExternalLink, ArrowUp,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PaperCard } from "@/components/paper-card"
import { PaperDetail } from "@/components/paper-detail"
import { isMedRxivCategory } from "@/lib/arxiv-categories"
import { useAuth } from "@/lib/auth-context"
import type { AnalyzedPaper } from "@/lib/types"

const RANKED_CATEGORIES = ["cs.AI", "cs.AR", "cs.CR"]
const ITEMS_PER_PAGE = 100

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

interface DashboardProps {
  selectedCategory: string | null
}

interface RankingEntry {
  position: number
  paperId: string
  sotaScore: number
  bsIndex: number
  title: string
  authors: string[]
  publishedDate: string
  arxivUrl: string
  oneLiner: string
  expertCommentary: string
}

export function Dashboard({ selectedCategory }: DashboardProps) {
  const [selectedPaper, setSelectedPaper] = useState<AnalyzedPaper | null>(null)
  const { isAuthenticated } = useAuth()

  // Pagination & filter state
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")

  // Reset filters when category changes
  const [prevCategory, setPrevCategory] = useState<string | null>(null)
  if (selectedCategory !== prevCategory) {
    setPrevCategory(selectedCategory)
    setPage(1)
    setDateFrom("")
    setDateTo("")
    setSearchQuery("")
    setAppliedSearch("")
  }

  const isRankedCategory = selectedCategory ? RANKED_CATEGORIES.includes(selectedCategory) : false

  // Rankings SWR (only for cs.AI, cs.AR, cs.CR)
  const { data: rankingData } = useSWR(
    isRankedCategory ? `/api/rankings?category=${selectedCategory}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Papers URL
  const papersUrl = useMemo(() => {
    if (!selectedCategory) return null
    const params = new URLSearchParams()
    params.set("category", selectedCategory)
    params.set("page", String(page))
    params.set("limit", String(ITEMS_PER_PAGE))
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo)   params.set("dateTo", dateTo)
    if (appliedSearch) params.set("search", appliedSearch)
    return `/api/papers?${params.toString()}`
  }, [selectedCategory, page, dateFrom, dateTo, appliedSearch])

  const { data: papersData, error: papersError, isLoading } = useSWR(
    papersUrl, fetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  )

  const papers = useMemo((): AnalyzedPaper[] => {
    if (!papersData?.papers?.length) return []
    return papersData.papers.map((p: Record<string, unknown>) => ({
      id: p.id,
      title: p.title,
      summary: p.abstract,
      authors: p.authors || [],
      published: p.publishedDate,
      updated: p.publishedDate,
      categories: p.categories || [p.primaryCategory],
      primaryCategory: p.primaryCategory,
      link: p.arxivUrl || `https://arxiv.org/abs/${p.id}`,
      pdfLink: p.pdfUrl || `https://arxiv.org/pdf/${p.id}`,
      analysis: p.analysis as AnalyzedPaper["analysis"] ?? undefined,
    }))
  }, [papersData])

  const totalPapers = papersData?.pagination?.total ?? 0
  const totalPages  = papersData?.pagination?.totalPages ?? 0
  const fetchDate   = papersData?.fetchDate ?? null
  const hasActiveFilters = dateFrom || dateTo || appliedSearch
  const analyzedCount = papers.filter((p) => p.analysis).length
  const isMedrxiv = selectedCategory ? isMedRxivCategory(selectedCategory) : false

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedSearch(searchQuery)
    setPage(1)
  }

  const clearFilters = () => {
    setDateFrom(""); setDateTo(""); setSearchQuery(""); setAppliedSearch(""); setPage(1)
  }

  const noAnalyze = async () => {}

  // ─── Welcome screen ───────────────────────────────────────────
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
          <h2 className="text-balance text-2xl font-bold text-foreground">arXiv Scanner</h2>
          <p className="mx-auto mt-2 max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground">
            Every day we fetch the 100 latest papers from each arXiv category, analyze them with AI,
            and surface the ones that actually matter. Select a category from the sidebar to start.
          </p>
        </div>
        <Card className="mx-auto w-full max-w-lg border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Daily SOTA Rankings</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              For <strong className="text-foreground">cs.AI</strong>,{" "}
              <strong className="text-foreground">cs.AR</strong>, and{" "}
              <strong className="text-foreground">cs.CR</strong> we publish a daily top-10 ranking
              of the most significant papers ranked by SOTA score. Only papers scoring 7/10 or above qualify.
            </p>
          </CardContent>
        </Card>
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span>Updated daily at 21:00 UTC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HeartPulse className="size-3.5" />
            <span>arXiv + medRxiv covered</span>
          </div>
        </div>
      </div>
    )
  }

  // ─── Loading ─────────────────────────────────────────────────
  if (isLoading && !papersData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading <span className="font-mono font-semibold">{selectedCategory}</span>...
          </p>
        </div>
      </div>
    )
  }

  // ─── No data ─────────────────────────────────────────────────
  if (papersError || (!isLoading && papers.length === 0 && !hasActiveFilters)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
            <Database className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No data yet for {selectedCategory}</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            This category has not been synced today. Go to the admin panel and trigger a sync,
            or wait for the daily cron at 21:00 UTC.
          </p>
        </div>
      </div>
    )
  }

  const startItem = (page - 1) * ITEMS_PER_PAGE + 1
  const endItem   = Math.min(page * ITEMS_PER_PAGE, totalPapers)

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">

      {/* ─── Top-10 Ranking Banner (cs.AI / cs.AR / cs.CR only) ── */}
      {isRankedCategory && rankingData?.rankings?.length > 0 && (
        <div className="px-4 lg:px-6">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <Trophy className="size-4 text-amber-500" />
                  Daily Top-10 SOTA Ranking — {selectedCategory}
                </CardTitle>
                <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800 text-[10px]">
                  {rankingData.rankDate}
                </Badge>
              </div>
              <p className="text-xs text-amber-700/80">
                Papers scoring 7/10 or above on SOTA relevance. Ordered by significance, not hype.
              </p>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex flex-col gap-2">
                {(rankingData.rankings as RankingEntry[]).map((r) => (
                  <div
                    key={r.paperId}
                    className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-3 transition-colors hover:bg-amber-50"
                  >
                    {/* Rank badge */}
                    <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                      ${r.position === 1 ? "bg-amber-400 text-white" :
                        r.position === 2 ? "bg-slate-300 text-slate-700" :
                        r.position === 3 ? "bg-amber-700/60 text-white" :
                        "bg-muted text-muted-foreground"}`}>
                      {r.position}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
                          {r.title}
                        </p>
                        <a
                          href={r.arxivUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>

                      {r.oneLiner && (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                          {r.oneLiner}
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] px-1.5 py-0">
                          <ArrowUp className="size-2.5" />
                          SOTA {r.sotaScore}/10
                        </Badge>
                        {r.bsIndex !== null && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            BS {r.bsIndex}/10
                          </Badge>
                        )}
                        {r.authors?.length > 0 && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {r.authors.slice(0, 2).join(", ")}
                            {r.authors.length > 2 ? ` +${r.authors.length - 2}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Header ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{selectedCategory}</h2>
            {isMedrxiv && (
              <Badge variant="outline" className="gap-1 border-rose-200 bg-rose-50 text-rose-700">
                <HeartPulse className="size-3" />medRxiv
              </Badge>
            )}
            <Badge variant="outline" className="gap-1 border-blue-300 bg-blue-50 text-blue-700">
              <Database className="size-3" />
              {totalPapers} papers today
            </Badge>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {fetchDate
              ? `Fetched ${new Date(fetchDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`
              : "Loading..."}
            {totalPapers > ITEMS_PER_PAGE && ` — showing ${startItem}-${endItem}`}
            {analyzedCount > 0 && ` — ${analyzedCount} analyzed`}
          </p>
        </div>
        {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      {/* ─── Filters ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 px-4 lg:px-6">
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
          <Button type="submit" size="sm" variant="secondary" className="h-9">Search</Button>
        </form>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">From</label>
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="h-9 w-40 pl-8 text-sm" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">To</label>
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="h-9 w-40 pl-8 text-sm" />
          </div>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-muted-foreground">
            <X className="size-3.5" />Clear
          </Button>
        )}
      </div>

      {/* ─── No results with filters ──────────────────────────── */}
      {papers.length === 0 && hasActiveFilters && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Search className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No papers found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your filters.</p>
          <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">Clear filters</Button>
        </div>
      )}

      {/* ─── Papers list ──────────────────────────────────────── */}
      {papers.length > 0 && (
        <Tabs defaultValue="papers" className="px-4 lg:px-6">
          <TabsList>
            <TabsTrigger value="papers">
              <BookOpen className="mr-1.5 size-3" />
              All Papers ({papers.length})
            </TabsTrigger>
            {analyzedCount > 0 && (
              <TabsTrigger value="analyzed">
                <Sparkles className="mr-1.5 size-3" />
                Analyzed ({analyzedCount})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="papers" className="mt-4">
            <div className="grid gap-3">
              {papers.map((paper) => (
                <PaperCard key={paper.id} paper={paper} onAnalyze={noAnalyze} isCached={true} />
              ))}
            </div>
          </TabsContent>

          {analyzedCount > 0 && (
            <TabsContent value="analyzed" className="mt-4">
              <div className="grid gap-3">
                {papers.filter((p) => p.analysis).map((paper) => (
                  <PaperCard key={paper.id} paper={paper} onAnalyze={noAnalyze} isCached={true} />
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* ─── Pagination ───────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3 lg:px-6">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({totalPapers} papers)
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(1)} disabled={page <= 1} aria-label="First page">
              <ChevronsLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </Button>
            {(() => {
              const pages: number[] = []
              const maxVisible = 5
              let start = Math.max(1, page - Math.floor(maxVisible / 2))
              const end = Math.min(totalPages, start + maxVisible - 1)
              start = Math.max(1, end - maxVisible + 1)
              for (let i = start; i <= end; i++) pages.push(i)
              return pages.map((p) => (
                <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="size-8 text-xs" onClick={() => setPage(p)}>
                  {p}
                </Button>
              ))
            })()}
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Next page">
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(totalPages)} disabled={page >= totalPages} aria-label="Last page">
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {selectedPaper && (
        <PaperDetail paper={selectedPaper} onClose={() => setSelectedPaper(null)} onAnalyze={noAnalyze} isCached={true} />
      )}
    </div>
  )
}
