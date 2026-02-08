import { readFile, writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { generateText } from "ai"

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
}

interface PaperAnalysis {
  bsIndex: number
  coreClaims: string[]
  redFlags: string[]
  expertCommentary: string
  sotaScore: number
  isSOTA: boolean
  oneLiner: string
}

interface AnalyzedPaper extends RawPaper {
  analysis: PaperAnalysis
}

interface CategoryData {
  category: string
  categoryName: string
  generatedAt: string
  paperCount: number
  analyzedCount: number
  papers: AnalyzedPaper[]
  sotaRanking: Array<{
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
  }>
}

async function analyzePaper(paper: RawPaper): Promise<PaperAnalysis> {
  const prompt = `You are an expert research paper analyst. Analyze the following research paper and provide a structured assessment.

Title: ${paper.title}

Abstract: ${paper.summary}

Authors: ${paper.authors.join(", ")}

Categories: ${paper.categories.join(", ")}

Provide your analysis in the following JSON format (return ONLY valid JSON, no markdown or explanations):
{
  "bsIndex": <number 0-10, where 0 is highly rigorous and 10 is highly speculative>,
  "coreClaims": [<array of 2-4 key claims made in the paper>],
  "redFlags": [<array of 0-3 methodological concerns or limitations>],
  "expertCommentary": "<2-3 sentence expert perspective on significance and context>",
  "sotaScore": <number 0-10, where 10 is groundbreaking SOTA contribution>,
  "isSOTA": <boolean, true if sotaScore >= 7>,
  "oneLiner": "<single compelling sentence summarizing the key contribution>"
}

Be critical but fair. Focus on scientific rigor, novelty, and practical impact.`

  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      temperature: 0.3,
    })

    // Try to extract JSON - handle markdown code blocks or plain JSON
    let jsonStr = text.trim()
    const codeBlockMatch = jsonStr.match(/\`\`\`(?:json)?\s*(\{[\s\S]*\})\s*\`\`\`/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]
    } else {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }
    }

    const analysis = JSON.parse(jsonStr)
    
    // Validate and ensure all fields exist
    return {
      bsIndex: Math.min(10, Math.max(0, analysis.bsIndex ?? 5)),
      coreClaims: Array.isArray(analysis.coreClaims) ? analysis.coreClaims : [],
      redFlags: Array.isArray(analysis.redFlags) ? analysis.redFlags : [],
      expertCommentary: analysis.expertCommentary || "Analysis pending.",
      sotaScore: Math.min(10, Math.max(0, analysis.sotaScore ?? 5)),
      isSOTA: analysis.isSOTA ?? (analysis.sotaScore >= 7),
      oneLiner: analysis.oneLiner || paper.title,
    }
  } catch (error) {
    console.error(`[v0] Error analyzing paper ${paper.id}:`, error)
    // Return default analysis on error
    return {
      bsIndex: 5,
      coreClaims: ["Analysis failed - please retry"],
      redFlags: [],
      expertCommentary: "Automated analysis could not be completed.",
      sotaScore: 5,
      isSOTA: false,
      oneLiner: paper.title,
    }
  }
}

function buildSotaRanking(papers: AnalyzedPaper[]) {
  return papers
    .filter((p) => p.analysis && p.analysis.sotaScore >= 5)
    .sort((a, b) => b.analysis.sotaScore - a.analysis.sotaScore)
    .slice(0, 20)
    .map((p) => ({
      id: p.id,
      title: p.title,
      authors: p.authors,
      link: p.link,
      pdfLink: p.pdfLink,
      sotaScore: p.analysis.sotaScore,
      bsIndex: p.analysis.bsIndex,
      oneLiner: p.analysis.oneLiner,
      isSOTA: p.analysis.isSOTA,
      analysis: p.analysis,
    }))
}

function categoryToFilename(category: string): string {
  return category.replace(/\./g, "-")
}

async function main() {
  console.log("[v0] Starting paper processing...")

  // Read all_papers.json
  const allPapersPath = join(process.cwd(), "public/data/analyses/all_papers.json")
  const rawData = await readFile(allPapersPath, "utf-8")
  const allPapers: Record<string, RawPaper[]> = JSON.parse(rawData)

  console.log(`[v0] Found ${Object.keys(allPapers).length} categories`)

  // Process each category
  for (const [category, papers] of Object.entries(allPapers)) {
    console.log(`\n[v0] Processing category: ${category} (${papers.length} papers)`)

    const analyzedPapers: AnalyzedPaper[] = []

    // Analyze papers with rate limiting
    for (let i = 0; i < papers.length; i++) {
      const paper = papers[i]
      console.log(`[v0] Analyzing ${i + 1}/${papers.length}: ${paper.title.substring(0, 60)}...`)

      const analysis = await analyzePaper(paper)
      analyzedPapers.push({
        ...paper,
        analysis,
      })

      // Rate limiting: wait 1 second between requests
      if (i < papers.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // Build category data
    const categoryData: CategoryData = {
      category,
      categoryName: category,
      generatedAt: new Date().toISOString(),
      paperCount: analyzedPapers.length,
      analyzedCount: analyzedPapers.length,
      papers: analyzedPapers,
      sotaRanking: buildSotaRanking(analyzedPapers),
    }

    // Write to individual category file
    const outputPath = join(
      process.cwd(),
      "public/data/analyses",
      `${categoryToFilename(category)}.json`
    )
    await writeFile(outputPath, JSON.stringify(categoryData, null, 2))
    console.log(`[v0] ✓ Saved ${outputPath}`)
  }

  console.log("\n[v0] ✓ All categories processed successfully!")
}

main().catch((error) => {
  console.error("[v0] Fatal error:", error)
  process.exit(1)
})
