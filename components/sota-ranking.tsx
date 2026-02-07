"use client"

import { Crown, ExternalLink, ArrowRight, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AnalyzedPaper } from "@/lib/types"

interface SOTARankingProps {
  papers: AnalyzedPaper[]
  onSelectPaper: (paper: AnalyzedPaper) => void
}

export function SOTARanking({ papers, onSelectPaper }: SOTARankingProps) {
  const rankedPapers = papers
    .filter((p) => p.analysis)
    .sort((a, b) => (b.analysis?.sotaScore ?? 0) - (a.analysis?.sotaScore ?? 0))
    .slice(0, 10)

  if (rankedPapers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4" />
            SOTA Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Analyze papers to see the SOTA ranking. Papers with the highest SOTA scores will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-4" />
          SOTA Ranking - Top Papers
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Papers ranked by their SOTA relevance score. These are defining the frontier.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rankedPapers.map((paper, index) => {
          const analysis = paper.analysis!
          return (
            <div
              key={paper.id}
              className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
              onClick={() => onSelectPaper(paper)}
              onKeyDown={(e) => { if (e.key === "Enter") onSelectPaper(paper) }}
              role="button"
              tabIndex={0}
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                {index === 0 ? (
                  <Crown className="size-4 text-amber-500" />
                ) : (
                  `#${index + 1}`
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                  {paper.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground italic line-clamp-1">
                  {analysis.oneLiner}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`inline-flex items-center rounded-md border px-1.5 py-0 text-[10px] font-bold ${
                    analysis.sotaScore >= 8
                      ? "bg-violet-100 text-violet-800 border-violet-200"
                      : analysis.sotaScore >= 5
                        ? "bg-sky-100 text-sky-800 border-sky-200"
                        : "bg-zinc-100 text-zinc-800 border-zinc-200"
                  }`}>
                    SOTA: {analysis.sotaScore}/10
                  </span>
                  <span className={`inline-flex items-center rounded-md border px-1.5 py-0 text-[10px] font-bold ${
                    analysis.bsIndex <= 3
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : analysis.bsIndex <= 6
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-red-100 text-red-800 border-red-200"
                  }`}>
                    BS: {analysis.bsIndex}/10
                  </span>
                  {analysis.isSOTA && (
                    <Badge variant="default" className="h-4 px-1.5 text-[10px] bg-emerald-600 text-emerald-50 hover:bg-emerald-600">
                      Frontier
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="ghost" asChild className="h-6 w-6 p-0" onClick={(e) => e.stopPropagation()}>
                  <a href={paper.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3" />
                    <span className="sr-only">Open on arXiv</span>
                  </a>
                </Button>
                <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
