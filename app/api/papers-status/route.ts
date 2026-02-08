import { readFile } from "fs/promises"
import { join } from "path"
import { NextResponse } from "next/server"

interface RawPaper {
  id: string
  title: string
  summary: string
  published: string
  authors: string[]
  link: string
  pdfLink: string
  categories: string[]
  primaryCategory: string
  source?: string
  analysis?: unknown
}

export async function GET() {
  try {
    const allPapersPath = join(process.cwd(), "public/data/analyses/all_papers.json")
    const rawData = await readFile(allPapersPath, "utf-8")
    const allPapers: Record<string, RawPaper[]> = JSON.parse(rawData)

    const categories = Object.keys(allPapers)
    const stats = categories.map((category) => {
      const papers = allPapers[category]
      const analyzed = papers.filter((p) => p.analysis).length
      const total = papers.length

      return {
        category,
        total,
        analyzed,
        needsAnalysis: total - analyzed,
        progress: total > 0 ? (analyzed / total) * 100 : 0,
      }
    })

    const totalPapers = stats.reduce((sum, s) => sum + s.total, 0)
    const totalAnalyzed = stats.reduce((sum, s) => sum + s.analyzed, 0)
    const totalNeedsAnalysis = totalPapers - totalAnalyzed

    return NextResponse.json({
      categories: stats,
      summary: {
        totalCategories: categories.length,
        totalPapers,
        totalAnalyzed,
        totalNeedsAnalysis,
        overallProgress: totalPapers > 0 ? (totalAnalyzed / totalPapers) * 100 : 0,
      },
    })
  } catch (error) {
    console.error("[v0] Error reading papers status:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
