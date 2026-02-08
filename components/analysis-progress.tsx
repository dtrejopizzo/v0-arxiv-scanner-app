"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Loader2, CheckCircle } from "lucide-react"

interface CategoryStatus {
  category: string
  total: number
  analyzed: number
  needsAnalysis: number
  progress: number
}

interface PapersStatusData {
  categories: CategoryStatus[]
  summary: {
    totalCategories: number
    totalPapers: number
    totalAnalyzed: number
    totalNeedsAnalysis: number
    overallProgress: number
  }
}

export function AnalysisProgress() {
  const [status, setStatus] = useState<PapersStatusData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/papers-status")
        const data = await res.json()
        setStatus(data)
      } catch (error) {
        console.error("[v0] Failed to fetch papers status:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  const { summary, categories } = status
  const isComplete = summary.totalNeedsAnalysis === 0

  return (
    <Card className={isComplete ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {isComplete ? (
            <CheckCircle className="size-4 text-emerald-600" />
          ) : (
            <BookOpen className="size-4 text-amber-600" />
          )}
          Analysis Progress
        </CardTitle>
        <CardDescription>
          {summary.totalAnalyzed.toLocaleString()} of {summary.totalPapers.toLocaleString()} papers analyzed across {summary.totalCategories} categories
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-semibold text-foreground">{summary.overallProgress.toFixed(1)}%</span>
          </div>
          <Progress value={summary.overallProgress} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-background p-3">
            <div className="text-xl font-bold text-foreground">{summary.totalCategories}</div>
            <div className="text-xs text-muted-foreground">Categories</div>
          </div>
          <div className="rounded-lg bg-background p-3">
            <div className="text-xl font-bold text-emerald-600">{summary.totalAnalyzed.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Analyzed</div>
          </div>
          <div className="rounded-lg bg-background p-3">
            <div className={`text-xl font-bold ${isComplete ? "text-emerald-600" : "text-amber-600"}`}>
              {summary.totalNeedsAnalysis.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
        </div>

        {!isComplete && (
          <div className="rounded-lg bg-background p-3">
            <h4 className="mb-2 text-xs font-semibold text-foreground">Categories Needing Analysis</h4>
            <div className="max-h-32 space-y-1.5 overflow-y-auto">
              {categories
                .filter((cat) => cat.needsAnalysis > 0)
                .sort((a, b) => b.needsAnalysis - a.needsAnalysis)
                .slice(0, 10)
                .map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground">{cat.category}</span>
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                      {cat.needsAnalysis} pending
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="rounded-lg bg-emerald-100 p-3 text-center">
            <CheckCircle className="mx-auto mb-2 size-8 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-900">All papers analyzed!</p>
            <p className="text-xs text-emerald-700">Ready to explore insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
