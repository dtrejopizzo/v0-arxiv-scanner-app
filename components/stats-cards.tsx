"use client"

import { FileText, Sparkles, Trophy, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { AnalyzedPaper } from "@/lib/types"

interface StatsCardsProps {
  papers: AnalyzedPaper[]
}

export function StatsCards({ papers }: StatsCardsProps) {
  const totalPapers = papers.length
  const analyzedPapers = papers.filter((p) => p.analysis).length
  const sotaPapers = papers.filter((p) => p.analysis?.isSOTA).length
  const avgBS = analyzedPapers > 0
    ? (papers.filter((p) => p.analysis).reduce((sum, p) => sum + (p.analysis?.bsIndex ?? 0), 0) / analyzedPapers).toFixed(1)
    : "N/A"

  const stats = [
    {
      label: "Total Papers",
      value: totalPapers,
      icon: FileText,
      description: "Fetched from arXiv",
    },
    {
      label: "Analyzed",
      value: analyzedPapers,
      icon: Sparkles,
      description: `of ${totalPapers} papers`,
    },
    {
      label: "SOTA Papers",
      value: sotaPapers,
      icon: Trophy,
      description: "Pushing the frontier",
    },
    {
      label: "Avg BS Index",
      value: avgBS,
      icon: AlertTriangle,
      description: "Lower is better",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 px-4 lg:px-6">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <stat.icon className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
