import { generateText, Output } from "ai"
import { z } from "zod"
import { writeFileSync, mkdirSync, existsSync } from "fs"
import { join } from "path"
import type { ArxivPaper, AnalyzedPaper, PaperAnalysis } from "@/lib/types"
import { buildSotaRanking, categoryToFilename } from "@/lib/cache"
import type { CachedCategoryData } from "@/lib/cache"
import { ARXIV_CATEGORIES, isMedRxivCategory, getMedRxivSubjectName } from "@/lib/arxiv-categories"

const ADMIN_PASSWORD = "Santander2728,2025*34erASsa35"

const paperAnalysisSchema = z.object({
  bsIndex: z.number().describe("BS Index from 1 to 10 (1 = solid science, 10 = total BS)"),
  coreClaims: z.array(z.string()).describe("List of 3-5 core claims the paper makes"),
  redFlags: z.array(z.string()).describe("List of 2-4 red flags or methodological concerns"),
  expertCommentary: z.string().describe("A blunt, honest, witty expert commentary on the paper in 3-5 sentences. Be direct, insightful, and dont hold back on criticism or praise."),
  sotaScore: z.number().describe("SOTA relevance score from 1-10 (10 = defines the frontier, 1 = incremental/rehash)"),
  isSOTA: z.boolean().describe("Whether this paper genuinely pushes the state-of-the-art forward"),
  oneLiner: z.string().describe("A single-sentence TL;DR of what the paper actually contributes"),
})

function parseArxivXml(xml: string): ArxivPaper[] {
  const papers: ArxivPaper[] = []
  const entries = xml.split("<entry>").slice(1)

  for (const entry of entries) {
    const extractTag = (tag: string): string => {
      const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
      return match ? match[1].trim() : ""
    }

    const id = extractTag("id")
    const title = extractTag("title").replace(/\s+/g, " ").trim()
    const summary = extractTag("summary").replace(/\s+/g, " ").trim()
    const published = extractTag("published")
    const updated = extractTag("updated")

    const authors: string[] = []
    const authorMatches = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)
    if (authorMatches) {
      for (const match of authorMatches) {
        const name = match.match(/<name>([\s\S]*?)<\/name>/)
        if (name) authors.push(name[1].trim())
      }
    }

    const categories: string[] = []
    const catMatches = entry.match(/term="([^"]+)"/g)
    if (catMatches) {
      for (const match of catMatches) {
        const term = match.match(/term="([^"]+)"/)
        if (term) categories.push(term[1])
      }
    }

    const primaryCatMatch = entry.match(/<arxiv:primary_category[^>]*term="([^"]+)"/)
    const primaryCategory = primaryCatMatch ? primaryCatMatch[1] : categories[0] || ""

    const linkMatch = entry.match(/<link[^>]*href="(https:\/\/arxiv\.org\/abs\/[^"]+)"/)
    const link = linkMatch ? linkMatch[1] : id

    const pdfMatch = entry.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/)
    const pdfLink = pdfMatch ? pdfMatch[1] : `${id.replace("abs", "pdf")}`

    papers.push({ id, title, summary, authors, published, updated, categories, primaryCategory, link, pdfLink })
  }
  return papers
}

async function fetchMedRxivPapers(category: string, maxResults: number): Promise<ArxivPaper[]> {
  const subjectName = getMedRxivSubjectName(category)
  if (!subjectName) return []

  const endDate = new Date().toISOString().split("T")[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const allPapers: ArxivPaper[] = []
  let cursor = 0
  const pageSize = 100

  while (allPapers.length < maxResults) {
    const url = `https://api.medrxiv.org/details/medrxiv/${startDate}/${endDate}/${cursor}/${pageSize}`
    const response = await fetch(url, { headers: { "User-Agent": "ArxivScanner/1.0" } })
    if (!response.ok) throw new Error(`medRxiv API returned ${response.status}`)

    const data = await response.json()
    const collection = data.collection || []
    if (collection.length === 0) break

    for (const item of collection) {
      if (item.category === subjectName && allPapers.length < maxResults) {
        allPapers.push({
          id: `medrxiv:${item.doi}`,
          title: item.title || "",
          summary: item.abstract || "",
          authors: (item.authors || "").split("; ").filter(Boolean),
          published: item.date || "",
          updated: item.date || "",
          categories: [category],
          primaryCategory: category,
          link: `https://www.medrxiv.org/content/${item.doi}v${item.version}`,
          pdfLink: `https://www.medrxiv.org/content/${item.doi}v${item.version}.full.pdf`,
        })
      }
    }

    if (collection.length < pageSize) break
    cursor += pageSize
  }

  return allPapers
}

async function analyzePaper(paper: ArxivPaper): Promise<PaperAnalysis | null> {
  try {
    const { output } = await generateText({
      model: "google/gemini-2.0-flash",
      output: Output.object({ schema: paperAnalysisSchema }),
      messages: [
        {
          role: "user",
          content: `You are an expert research paper analyst. Analyze this academic paper critically. Be blunt and witty.

PAPER TITLE: ${paper.title}
AUTHORS: ${paper.authors.join(", ")}
CATEGORIES: ${paper.categories.join(", ")}
ABSTRACT:
${paper.summary}

Consider: Is this genuinely novel? Are claims well-supported? Does it push SOTA forward? What red flags would a careful reviewer catch?
Be critical of: hype without substance, overclaiming, poor baselines, and "we fine-tuned X on Y" without real insight.`,
        },
      ],
    })

    return output as PaperAnalysis
  } catch (error) {
    console.error(`Failed to analyze paper: ${paper.title}`, error)
    return null
  }
}

function getCategoryName(code: string): string {
  for (const cat of ARXIV_CATEGORIES) {
    const sub = cat.subcategories.find((s) => s.code === code)
    if (sub) return sub.name
  }
  return code
}

export async function POST(req: Request) {
  try {
    const { category, maxResults = 100, password } = await req.json()

    // Password check
    if (password !== ADMIN_PASSWORD) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!category) {
      return Response.json({ error: "Category is required" }, { status: 400 })
    }

    // Step 1: Fetch papers from the appropriate source
    let papers: ArxivPaper[]

    if (isMedRxivCategory(category)) {
      papers = await fetchMedRxivPapers(category, maxResults)
    } else {
      const url = `http://export.arxiv.org/api/query?search_query=cat:${encodeURIComponent(category)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`
      const response = await fetch(url, { headers: { "User-Agent": "ArxivScanner/1.0" } })
      if (!response.ok) throw new Error(`arXiv API returned ${response.status}`)
      const xml = await response.text()
      papers = parseArxivXml(xml)
    }

    // Step 2: Analyze each paper with AI
    const analyzedPapers: AnalyzedPaper[] = []
    let analyzedCount = 0

    for (const paper of papers) {
      const analysis = await analyzePaper(paper)
      analyzedPapers.push({ ...paper, analysis: analysis ?? undefined })
      if (analysis) analyzedCount++
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Step 3: Build SOTA ranking
    const sotaRanking = buildSotaRanking(analyzedPapers)

    // Step 4: Build cached data
    const cachedData: CachedCategoryData = {
      category,
      categoryName: getCategoryName(category),
      generatedAt: new Date().toISOString(),
      paperCount: papers.length,
      analyzedCount,
      papers: analyzedPapers,
      sotaRanking,
    }

    // Step 5: Write to public/data/analyses/
    const dataDir = join(process.cwd(), "public", "data", "analyses")
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }

    const filename = `${categoryToFilename(category)}.json`
    const filePath = join(dataDir, filename)
    writeFileSync(filePath, JSON.stringify(cachedData, null, 2))

    return Response.json({
      success: true,
      category,
      paperCount: papers.length,
      analyzedCount,
      sotaCount: sotaRanking.length,
      filePath: `/data/analyses/${filename}`,
    })
  } catch (error) {
    console.error("Generate error:", error)
    return Response.json(
      { error: "Failed to generate analysis", details: String(error) },
      { status: 500 }
    )
  }
}
