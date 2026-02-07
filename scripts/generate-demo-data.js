/**
 * Demo data generator script.
 * Fetches real papers from arXiv and generates synthetic analyses
 * to populate the app with demo data for popular categories.
 */

const { writeFileSync, mkdirSync, existsSync } = require("fs")
const { join } = require("path")

function parseArxivXml(xml) {
  const papers = []
  const entries = xml.split("<entry>").slice(1)

  for (const entry of entries) {
    const extractTag = (tag) => {
      const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
      return match ? match[1].trim() : ""
    }

    const id = extractTag("id")
    const title = extractTag("title").replace(/\s+/g, " ").trim()
    const summary = extractTag("summary").replace(/\s+/g, " ").trim()
    const published = extractTag("published")
    const updated = extractTag("updated")

    const authors = []
    const authorMatches = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)
    if (authorMatches) {
      for (const match of authorMatches) {
        const name = match.match(/<name>([\s\S]*?)<\/name>/)
        if (name) authors.push(name[1].trim())
      }
    }

    const categories = []
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

function generateSyntheticAnalysis(paper, index) {
  const seed = paper.title.length + paper.authors.length + index
  const bsIndex = Math.max(1, Math.min(10, (seed % 7) + 1))
  const sotaScore = Math.max(1, Math.min(10, 11 - ((seed % 6) + 1)))
  const isSOTA = sotaScore >= 7

  const shortTitle = paper.title.split(" ").slice(0, 4).join(" ").toLowerCase()
  const cat = paper.categories[0] || "the field"

  const claimTemplates = [
    `Proposes a novel approach to ${shortTitle}`,
    "Achieves state-of-the-art results on multiple benchmark datasets",
    "Introduces a new theoretical framework with formal guarantees",
    "Demonstrates significant improvements over existing baselines",
    "Provides comprehensive ablation studies validating each component",
    "Shows strong generalization across different domains and settings",
    "Presents a computationally efficient alternative to current methods",
    "Offers new insights into the underlying mechanisms of the problem",
  ]

  const flagTemplates = [
    "Limited evaluation on only a few benchmark datasets",
    "Missing comparison with some recent strong baselines",
    "Computational cost analysis not thoroughly discussed",
    "Generalization to out-of-distribution data not tested",
    "Some theoretical claims lack rigorous formal proofs",
    "Hyperparameter sensitivity analysis is incomplete",
    "Scalability to larger datasets remains unclear",
    "Ablation study doesn't isolate all contributing factors",
  ]

  const commentaryTemplates = [
    `This is a solid piece of work that tackles ${cat} from an interesting angle. The methodology is sound, though the evaluation could be more comprehensive. Worth reading if you're in this space.`,
    `Ambitious paper with some genuinely novel ideas, but the execution doesn't fully match the claims. The theoretical contribution is the strongest part; the experiments feel like an afterthought. Read the theory, skim the experiments.`,
    `A well-executed incremental improvement that makes a real practical difference. Not going to win any awards for novelty, but the engineering is clean and the results are reproducible. This is the kind of paper that actually moves the field forward.`,
    `Interesting framing of an old problem with a fresh perspective. The paper is well-written and the experiments are thorough. However, the gap to prior work is smaller than the authors suggest. Still, a good contribution overall.`,
    `This reads like a paper written by people who actually understand the problem deeply. The mathematical framework is elegant, the experiments are well-designed, and the conclusions are measured. Refreshingly honest about its limitations.`,
    `Classic case of a good idea buried under excessive jargon and unnecessary complexity. Strip away the buzzwords and there's a decent contribution here. The authors would benefit from a "explain it to me like I'm a smart PhD student" revision pass.`,
  ]

  const oneLinerTemplates = [
    `New method for ${cat} that shows promising results on standard benchmarks.`,
    `Theoretical framework that provides new bounds and guarantees for ${paper.title.split(" ").slice(0, 3).join(" ").toLowerCase()}.`,
    `Practical improvement to existing approaches with solid experimental validation.`,
    `Novel architecture that combines multiple ideas to achieve competitive performance.`,
    `Comprehensive study that reveals important insights about current methods and their limitations.`,
  ]

  return {
    bsIndex,
    coreClaims: [
      claimTemplates[seed % claimTemplates.length],
      claimTemplates[(seed + 2) % claimTemplates.length],
      claimTemplates[(seed + 4) % claimTemplates.length],
    ],
    redFlags: [
      flagTemplates[seed % flagTemplates.length],
      flagTemplates[(seed + 3) % flagTemplates.length],
    ],
    expertCommentary: commentaryTemplates[seed % commentaryTemplates.length],
    sotaScore,
    isSOTA,
    oneLiner: oneLinerTemplates[seed % oneLinerTemplates.length],
  }
}

const CATEGORIES = [
  { code: "cs.AI", name: "Artificial Intelligence" },
  { code: "cs.LG", name: "Machine Learning" },
  { code: "cs.CV", name: "Computer Vision" },
  { code: "cs.CL", name: "Computation and Language" },
  { code: "cs.RO", name: "Robotics" },
  { code: "stat.ML", name: "Machine Learning" },
]

async function generateForCategory(category) {
  console.log(`Fetching papers for ${category.code}...`)

  const url = `http://export.arxiv.org/api/query?search_query=cat:${encodeURIComponent(category.code)}&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending`

  const response = await fetch(url, {
    headers: { "User-Agent": "ArxivScanner/1.0 (Demo Data Generator)" },
  })

  if (!response.ok) {
    console.error(`Failed to fetch ${category.code}: ${response.status}`)
    return
  }

  const xml = await response.text()
  const papers = parseArxivXml(xml)
  console.log(`  Found ${papers.length} papers for ${category.code}`)

  const analyzedPapers = papers.map((paper, i) => ({
    ...paper,
    analysis: generateSyntheticAnalysis(paper, i),
  }))

  const sotaRanking = analyzedPapers
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

  const cachedData = {
    category: category.code,
    categoryName: category.name,
    generatedAt: new Date().toISOString(),
    paperCount: papers.length,
    analyzedCount: analyzedPapers.length,
    papers: analyzedPapers,
    sotaRanking,
  }

  const dataDir = join(process.cwd(), "public", "data", "analyses")
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  const filename = `${category.code.replace(/\./g, "-")}.json`
  const filePath = join(dataDir, filename)
  writeFileSync(filePath, JSON.stringify(cachedData, null, 2))
  console.log(`  Wrote ${filename} (${papers.length} papers, ${sotaRanking.length} SOTA)`)
}

async function main() {
  console.log("Generating demo data for arXiv Scanner...")
  console.log("==========================================\n")

  for (const cat of CATEGORIES) {
    await generateForCategory(cat)
    // Be respectful to arXiv API - 3 second delay between requests
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  console.log("\nDone! Demo data generated successfully.")
}

main().catch(console.error)
