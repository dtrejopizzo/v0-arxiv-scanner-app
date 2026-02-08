"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { Loader2, Sparkles, BookOpen, Database, Clock, FlaskConical, Github, HeartPulse, Beaker } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PaperCard } from "@/components/paper-card"
import { SOTARanking } from "@/components/sota-ranking"
import { StatsCards } from "@/components/stats-cards"
import { PaperDetail } from "@/components/paper-detail"
import { getCachedDataUrl } from "@/lib/cache"
import { isMedRxivCategory } from "@/lib/arxiv-categories"
import type { CachedCategoryData } from "@/lib/cache"
import type { AnalyzedPaper, PaperAnalysis } from "@/lib/types"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

interface DashboardProps {
  selectedCategory: string | null
}

type DataSource = "cached" | "demo" | "none"

export function Dashboard({ selectedCategory }: DashboardProps) {
  const [selectedPaper, setSelectedPaper] = useState<AnalyzedPaper | null>(null)

  // Try to load cached data first (from public/data/analyses/)
  const cachedUrl = selectedCategory ? getCachedDataUrl(selectedCategory) : null
  const { data: cachedData, error: cachedError, isLoading: cachedLoading } = useSWR<CachedCategoryData>(
    cachedUrl,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  // Fall back to demo data API if no cached JSON file exists
  const shouldFetchDemo = Boolean(selectedCategory && cachedError)
  const demoApiUrl = useMemo(() => {
    if (!shouldFetchDemo || !selectedCategory) return null
    return `/api/demo?category=${encodeURIComponent(selectedCategory)}&count=20`
  }, [shouldFetchDemo, selectedCategory])

  const { data: demoData, isLoading: demoLoading } = useSWR<CachedCategoryData>(
    demoApiUrl,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Determine source and build papers list
  const { papers, dataSource, generatedAt, sourceData } = useMemo(() => {
    if (cachedData?.papers) {
      return {
        papers: cachedData.papers,
        dataSource: "cached" as DataSource,
        generatedAt: cachedData.generatedAt,
        sourceData: cachedData,
      }
    }
    if (demoData?.papers) {
      return {
        papers: demoData.papers,
        dataSource: "demo" as DataSource,
        generatedAt: demoData.generatedAt,
        sourceData: demoData,
      }
    }
    return { papers: [] as AnalyzedPaper[], dataSource: "none" as DataSource, generatedAt: null, sourceData: null }
  }, [cachedData, demoData])

  // No-op analyze (in demo/cached mode there's no live analysis)
  const analyzePaper = useCallback(async (_paper: AnalyzedPaper) => {
    // Analysis is pre-computed - no-op in published mode
  }, [])

  const isLoading = cachedLoading || (shouldFetchDemo && demoLoading)

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

  // ─── Loading ──────────────────────────────────────────────────
  if (isLoading) {
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

  // ─── No data ──────────────────────────────────────────────────
  if (papers.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">No data available</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No analysis found for this category.
          </p>
        </div>
      </div>
    )
  }

  const analyzedCount = papers.filter((p: AnalyzedPaper) => p.analysis).length
  const hasAnalyzed = analyzedCount > 0
  const isCached = dataSource === "cached"
  const isDemo = dataSource === "demo"
  const isMedrxiv = selectedCategory ? isMedRxivCategory(selectedCategory) : false

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <StatsCards papers={papers} />

      <div className="flex items-center justify-between px-4 lg:px-6">
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
            {isCached && (
              <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700">
                <Database className="size-3" />
                AI Analyzed
              </Badge>
            )}
            {isDemo && (
              <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700">
                <Beaker className="size-3" />
                Demo Data
              </Badge>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {papers.length} papers
            {generatedAt && ` - Generated ${new Date(generatedAt).toLocaleString()}`}
            {hasAnalyzed && ` - ${analyzedCount} analyzed`}
          </p>
        </div>
      </div>

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
          {sourceData?.sotaRanking ? (
            <SOTARanking
              papers={sourceData.sotaRanking.map((entry) => ({
                id: entry.id,
                title: entry.title,
                authors: entry.authors,
                link: entry.link,
                pdfLink: entry.pdfLink,
                summary: "",
                published: "",
                updated: "",
                categories: [],
                primaryCategory: selectedCategory,
                analysis: entry.analysis,
              }))}
              onSelectPaper={(paper) => {
                const fullPaper = papers.find((p: AnalyzedPaper) => p.id === paper.id)
                setSelectedPaper(fullPaper || paper)
              }}
            />
          ) : (
            <SOTARanking
              papers={papers}
              onSelectPaper={(paper) => setSelectedPaper(paper)}
            />
          )}
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
