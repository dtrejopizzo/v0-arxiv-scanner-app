"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { Loader2, Sparkles, BookOpen, Database, Wifi, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { PaperCard } from "@/components/paper-card"
import { SOTARanking } from "@/components/sota-ranking"
import { StatsCards } from "@/components/stats-cards"
import { PaperDetail } from "@/components/paper-detail"
import { getCachedDataUrl } from "@/lib/cache"
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

type DataSource = "cached" | "live" | "none"

export function Dashboard({ selectedCategory }: DashboardProps) {
  const [selectedPaper, setSelectedPaper] = useState<AnalyzedPaper | null>(null)
  const [liveAnalyzing, setLiveAnalyzing] = useState<Record<string, boolean>>({})
  const [liveAnalyses, setLiveAnalyses] = useState<Record<string, PaperAnalysis>>({})

  // Try to load cached data first
  const cachedUrl = selectedCategory ? getCachedDataUrl(selectedCategory) : null
  const { data: cachedData, error: cachedError, isLoading: cachedLoading } = useSWR<CachedCategoryData>(
    cachedUrl,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  // Fall back to live arXiv fetch if no cached data
  const shouldFetchLive = selectedCategory && cachedError
  const { data: liveData, isLoading: liveLoading } = useSWR(
    shouldFetchLive ? `/api/arxiv?category=${encodeURIComponent(selectedCategory)}&max=50` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Determine source and build papers list
  const { papers, dataSource, generatedAt } = useMemo(() => {
    if (cachedData?.papers) {
      return {
        papers: cachedData.papers,
        dataSource: "cached" as DataSource,
        generatedAt: cachedData.generatedAt,
      }
    }
    if (liveData?.papers) {
      // Merge any live analyses
      const livePapers = liveData.papers.map((p: AnalyzedPaper) => ({
        ...p,
        analysis: liveAnalyses[p.id] || undefined,
        isAnalyzing: liveAnalyzing[p.id] || false,
      }))
      return {
        papers: livePapers,
        dataSource: "live" as DataSource,
        generatedAt: liveData.fetchedAt,
      }
    }
    return { papers: [], dataSource: "none" as DataSource, generatedAt: null }
  }, [cachedData, liveData, liveAnalyses, liveAnalyzing])

  // Live analysis (only used when there's no cached data)
  const analyzePaper = useCallback(async (paper: AnalyzedPaper) => {
    setLiveAnalyzing((prev) => ({ ...prev, [paper.id]: true }))

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: paper.title,
          summary: paper.summary,
          authors: paper.authors,
          categories: paper.categories,
        }),
      })

      if (!res.ok) throw new Error("Analysis failed")
      const { analysis } = await res.json() as { analysis: PaperAnalysis }

      setLiveAnalyses((prev) => ({ ...prev, [paper.id]: analysis }))
    } catch (err) {
      console.error("Analysis failed:", err)
    }

    setLiveAnalyzing((prev) => ({ ...prev, [paper.id]: false }))
  }, [])

  const isLoading = cachedLoading || (shouldFetchLive && liveLoading)

  if (!selectedCategory) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <BookOpen className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Select a Category</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Choose an arXiv category from the sidebar to view the latest papers and their AI analysis. Categories with cached analyses load instantly.
          </p>
        </div>
      </div>
    )
  }

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

  if (papers.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">No data available</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No cached analysis found for this category and live fetch failed. Go to{" "}
            <a href="/admin" className="text-primary underline">Admin</a> to generate analyses.
          </p>
        </div>
      </div>
    )
  }

  const analyzedCount = papers.filter((p: AnalyzedPaper) => p.analysis).length
  const hasAnalyzed = analyzedCount > 0
  const isCached = dataSource === "cached"

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <StatsCards papers={papers} />

      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedCategory}
            </h2>
            {isCached ? (
              <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700">
                <Database className="size-3" />
                Cached
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-sky-300 bg-sky-50 text-sky-700">
                <Wifi className="size-3" />
                Live
              </Badge>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {papers.length} papers
            {generatedAt && ` - ${isCached ? "Generated" : "Fetched"} ${new Date(generatedAt).toLocaleString()}`}
            {isCached && ` - ${analyzedCount} analyzed`}
          </p>
        </div>
        {!isCached && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open("/admin", "_blank")}
            >
              <Sparkles className="mr-2 size-4" />
              Generate in Admin
            </Button>
          </div>
        )}
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
          {isCached && cachedData?.sotaRanking ? (
            <SOTARanking
              papers={cachedData.sotaRanking.map((entry) => ({
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
                // Find full paper data
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
                isCached={isCached}
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
          isCached={isCached}
        />
      )}
    </div>
  )
}
