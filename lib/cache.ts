import type { AnalyzedPaper, PaperAnalysis } from "./types"

export interface CachedCategoryData {
  category: string
  categoryName: string
  generatedAt: string
  paperCount: number
  analyzedCount: number
  papers: AnalyzedPaper[]
  sotaRanking: SotaRankingEntry[]
}

export interface SotaRankingEntry {
  id: string
  title: string
  authors: string[]
  link: string
  pdfLink: string
  sotaScore: number
  bsIndex: number
  oneLiner: string
  isSOTA: boolean
  analysis: PaperAnalysis
}

/**
 * Convert a category code to a safe filename.
 * e.g., "cs.AI" -> "cs-AI", "cond-mat.dis-nn" -> "cond-mat_dis-nn"
 */
export function categoryToFilename(category: string): string {
  return category.replace(/\./g, "-")
}

/**
 * Get the public URL path for a category's cached data.
 */
export function getCachedDataUrl(category: string): string {
  return `/data/analyses/${categoryToFilename(category)}.json`
}

/**
 * Build SOTA ranking from analyzed papers.
 */
export function buildSotaRanking(papers: AnalyzedPaper[]): SotaRankingEntry[] {
  return papers
    .filter((p) => p.analysis && p.analysis.sotaScore >= 5)
    .sort((a, b) => (b.analysis?.sotaScore ?? 0) - (a.analysis?.sotaScore ?? 0))
    .slice(0, 20)
    .map((p) => ({
      id: p.id,
      title: p.title,
      authors: p.authors,
      link: p.link,
      pdfLink: p.pdfLink,
      sotaScore: p.analysis!.sotaScore,
      bsIndex: p.analysis!.bsIndex,
      oneLiner: p.analysis!.oneLiner,
      isSOTA: p.analysis!.isSOTA,
      analysis: p.analysis!,
    }))
}
