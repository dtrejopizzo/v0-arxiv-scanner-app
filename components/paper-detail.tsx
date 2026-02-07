"use client"

import { X, ExternalLink, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AnalyzedPaper } from "@/lib/types"

interface PaperDetailProps {
  paper: AnalyzedPaper
  onClose: () => void
  onAnalyze: (paper: AnalyzedPaper) => void
}

export function PaperDetail({ paper, onClose, onAnalyze }: PaperDetailProps) {
  const analysis = paper.analysis

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l bg-background shadow-xl flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Paper Detail</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground leading-tight">{paper.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {paper.authors.join(", ")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {paper.categories.map((cat) => (
                <Badge key={cat} variant="outline" className="text-xs">
                  {cat}
                </Badge>
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
            <>
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Analysis</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${
                    analysis.bsIndex <= 3
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : analysis.bsIndex <= 6
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-red-100 text-red-800 border-red-200"
                  }`}>
                    BS Index: {analysis.bsIndex}/10
                  </span>
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${
                    analysis.sotaScore >= 8
                      ? "bg-violet-100 text-violet-800 border-violet-200"
                      : analysis.sotaScore >= 5
                        ? "bg-sky-100 text-sky-800 border-sky-200"
                        : "bg-zinc-100 text-zinc-800 border-zinc-200"
                  }`}>
                    SOTA: {analysis.sotaScore}/10
                  </span>
                  {analysis.isSOTA && (
                    <Badge variant="default" className="bg-emerald-600 text-emerald-50 hover:bg-emerald-600">
                      Frontier Paper
                    </Badge>
                  )}
                </div>

                <p className="text-sm font-medium text-foreground italic">
                  {analysis.oneLiner}
                </p>

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
                  <p className="text-sm text-foreground leading-relaxed">
                    {analysis.expertCommentary}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            {!analysis && (
              <Button
                onClick={() => onAnalyze(paper)}
                disabled={paper.isAnalyzing}
              >
                {paper.isAnalyzing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                {paper.isAnalyzing ? "Analyzing..." : "Analyze with AI"}
              </Button>
            )}
            <Button variant="outline" asChild>
              <a href={paper.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 size-4" />
                View on arXiv
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer">
                PDF
              </a>
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
