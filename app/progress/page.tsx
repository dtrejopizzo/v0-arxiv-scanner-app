import { AnalysisProgress } from "@/components/analysis-progress"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen } from "lucide-react"

export default function ProgressPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-1 size-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-foreground" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Analysis Progress</h1>
              <p className="text-xs text-muted-foreground">Track AI analysis coverage across all papers</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <AnalysisProgress />

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">About the Analysis</h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Each paper is analyzed using AI to provide structured insights including rigor assessment, key claims,
              potential concerns, expert commentary, and SOTA relevance scoring.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted p-3">
                <h3 className="mb-1 font-semibold text-foreground">BS Index (0-10)</h3>
                <p className="text-xs">
                  Measures rigor vs speculation. Lower scores indicate more rigorous, well-supported research.
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <h3 className="mb-1 font-semibold text-foreground">SOTA Score (0-10)</h3>
                <p className="text-xs">
                  State-of-the-art relevance. Higher scores indicate groundbreaking contributions to the field.
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <h3 className="mb-1 font-semibold text-foreground">Core Claims</h3>
                <p className="text-xs">
                  2-4 key contributions or findings extracted from the paper abstract and methodology.
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <h3 className="mb-1 font-semibold text-foreground">Red Flags</h3>
                <p className="text-xs">
                  Methodological concerns or limitations identified through automated analysis.
                </p>
              </div>
            </div>
            <p>
              Papers with SOTA scores ≥ 5 are featured in the SOTA Rankings, highlighting the most impactful recent
              research in each category.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
