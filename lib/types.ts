export interface ArxivPaper {
  id: string
  title: string
  summary: string
  authors: string[]
  published: string
  updated: string
  categories: string[]
  primaryCategory: string
  link: string
  pdfLink: string
}

export interface PaperAnalysis {
  bsIndex: number
  coreClaims: string[]
  redFlags: string[]
  expertCommentary: string
  sotaScore: number
  isSOTA: boolean
  oneLiner: string
}

export interface AnalyzedPaper extends ArxivPaper {
  analysis?: PaperAnalysis
  isAnalyzing?: boolean
}
