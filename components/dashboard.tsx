"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { Loader2, Sparkles, Download, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaperCard } from "@/components/paper-card"
import { SOTARanking } from "@/components/sota-ranking"
import { StatsCards } from "@/components/stats-cards"
import { PaperDetail } from "@/components/paper-detail"
import type { AnalyzedPaper, PaperAnalysis } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface DashboardProps {
  selectedCategory: string | null
}

export function Dashboard({ selectedCategory }: DashboardProps) {
  const [papers, setPapers] = useState<AnalyzedPaper[]>([])
  const [selectedPaper, setSelectedPaper] = useState<AnalyzedPaper | null>(null)
  const [analyzingAll, setAnalyzingAll] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 })

  const { data, isLoading, error } = useSWR(
    selectedCategory ? `/api/arxiv?category=${encodeURIComponent(selectedCategory)}&max=50` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (data?.papers) {
          setPapers(data.papers.map((p: AnalyzedPaper) => ({ ...p, analysis: undefined, isAnalyzing: false })))
        }
      },
      revalidateOnFocus: false,
    }
  )

  const analyzePaper = useCallback(async (paper: AnalyzedPaper) => {
    setPapers((prev) =>
      prev.map((p) => (p.id === paper.id ? { ...p, isAnalyzing: true } : p))
    )
    if (selectedPaper?.id === paper.id) {
      setSelectedPaper((prev) => prev ? { ...prev, isAnalyzing: true } : prev)
    }

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

      setPapers((prev) =>
        prev.map((p) =>
          p.id === paper.id ? { ...p, analysis, isAnalyzing: false } : p
        )
      )
      if (selectedPaper?.id === paper.id) {
        setSelectedPaper((prev) => prev ? { ...prev, analysis, isAnalyzing: false } : prev)
      }
    } catch (err) {
      console.error("Analysis failed:", err)
      setPapers((prev) =>
        prev.map((p) => (p.id === paper.id ? { ...p, isAnalyzing: false } : p))
      )
    }
  }, [selectedPaper])

  const analyzeAll = useCallback(async () => {
    const unanalyzed = papers.filter((p) => !p.analysis && !p.isAnalyzing)
    if (unanalyzed.length === 0) return

    setAnalyzingAll(true)
    setAnalyzeProgress({ current: 0, total: unanalyzed.length })

    for (let i = 0; i < unanalyzed.length; i++) {
      setAnalyzeProgress({ current: i + 1, total: unanalyzed.length })
      await analyzePaper(unanalyzed[i])
    }

    setAnalyzingAll(false)
  }, [papers, analyzePaper])

  if (!selectedCategory) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <BookOpen className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Select a Category</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Choose an arXiv category from the sidebar to fetch the latest 50 papers. Then analyze them with AI to find the SOTA papers worth reading.
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
            Fetching latest papers from <span className="font-mono font-semibold">{selectedCategory}</span>...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">Error fetching papers</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Could not fetch papers from arXiv. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  const analyzedCount = papers.filter((p) => p.analysis).length
  const hasAnalyzed = analyzedCount > 0

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <StatsCards papers={papers} />

      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {selectedCategory} - Latest Papers
          </h2>
          <p className="text-xs text-muted-foreground">
            {papers.length} papers fetched {data?.fetchedAt ? `at ${new Date(data.fetchedAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={analyzeAll}
            disabled={analyzingAll || papers.every((p) => p.analysis)}
            size="sm"
          >
            {analyzingAll ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Analyzing {analyzeProgress.current}/{analyzeProgress.total}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Analyze All ({papers.filter((p) => !p.analysis).length})
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="papers" className="px-4 lg:px-6">
        <TabsList>
          <TabsTrigger value="papers">
            <Download className="mr-1.5 size-3" />
            All Papers ({papers.length})
          </TabsTrigger>
          <TabsTrigger value="sota" disabled={!hasAnalyzed}>
            <Sparkles className="mr-1.5 size-3" />
            SOTA Ranking {hasAnalyzed && `(${analyzedCount})`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="papers" className="mt-4">
          <div className="grid gap-3">
            {papers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                onAnalyze={analyzePaper}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="sota" className="mt-4">
          <SOTARanking
            papers={papers}
            onSelectPaper={(paper) => setSelectedPaper(paper)}
          />
        </TabsContent>
      </Tabs>

      {selectedPaper && (
        <PaperDetail
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
          onAnalyze={analyzePaper}
        />
      )}
    </div>
  )
}
