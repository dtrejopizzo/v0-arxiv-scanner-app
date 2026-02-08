import type { AnalyzedPaper, PaperAnalysis } from "./types"
import type { CachedCategoryData, SotaRankingEntry } from "./cache"
import { ARXIV_CATEGORIES, isMedRxivCategory } from "./arxiv-categories"

/**
 * Seeded PRNG (mulberry32) for deterministic demo data per category.
 */
function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromString(s: string): number {
  return s.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
}

const FIRST = ["Wei","Sarah","James","Anna","Michael","Rachel","David","Lisa","Thomas","Emma","Carlos","Yuki","Ahmed","Priya","Olga","Marcus","Fatima","Liang","Sophia","Ivan"]
const LAST = ["Zhang","Chen","Roberts","Kumar","Liu","Petrov","Kim","Wong","Mueller","Johnson","Garcia","Tanaka","Hassan","Patel","Volkov","Williams","Al-Rashid","Wang","Anderson","Kozlov"]

const EXPERT = [
  "Solid work that addresses a genuine gap in the field. The methodology is transparent and results are reproducible.",
  "The methodology is sound but the novelty is incremental. Still, execution is clean and the paper is well-written.",
  "This pushes the boundary of what we thought was possible in this area. Will likely inspire follow-up work.",
  "Good empirical work, though the theoretical grounding could be stronger. The experiments are thorough.",
  "A much-needed contribution that will likely see wide adoption. Practical and well-motivated.",
  "The claims are ambitious but the evidence largely supports them. A few more ablations would seal the deal.",
  "Technically correct but unlikely to change how the field operates day-to-day. Niche but competent.",
  "Impressive scope and execution. This will be widely cited and is likely to become a standard reference.",
  "The approach is creative but the evaluation has gaps that need addressing in future revisions.",
  "Straightforward extension of prior work, but well executed. Sometimes that is exactly what the field needs.",
  "This is what happens when good engineering meets good science. Clean, useful, and reproducible.",
  "The framing oversells the contribution but the core result is solid and useful for practitioners.",
  "Needed more baselines but the results are promising. Looking forward to the camera-ready version.",
  "A strong benchmark paper that the community has been waiting for. Will accelerate progress.",
  "Not groundbreaking, but a reliable addition to the literature that fills an important gap.",
]

const RED_FLAGS = [
  "Limited evaluation on only a few benchmarks",
  "Comparisons with outdated baselines from 2+ years ago",
  "Missing ablation studies for key components",
  "Reproducibility concerns due to insufficient implementation details",
  "Small dataset may not generalize to larger-scale settings",
  "Statistical significance not adequately reported",
  "The theoretical claims lack rigorous proofs",
  "Potential confounding variables not addressed",
  "Computational cost not properly discussed",
  "User study sample size is too small for reliable conclusions",
]

const VERBS = ["Novel approach to","Improved methods for","Scaling","Rethinking","A unified framework for","Efficient","On the foundations of","Towards better","Benchmarking","Revisiting"]
const ADJS = ["robust","scalable","efficient","interpretable","adaptive","multi-modal","hierarchical","distributed","probabilistic","neural"]
const NOUNS_EXTRA = ["analysis","models","systems","algorithms","representations","optimization","inference","estimation","learning","prediction"]

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

function getCategoryName(code: string): string {
  for (const cat of ARXIV_CATEGORIES) {
    const sub = cat.subcategories.find((s) => s.code === code)
    if (sub) return sub.name
  }
  return code
}

export function generateDemoData(categoryCode: string, count = 20): CachedCategoryData {
  const rng = mulberry32(seedFromString(categoryCode))
  const catName = getCategoryName(categoryCode)
  const isMedrxiv = isMedRxivCategory(categoryCode)
  const baseUrl = isMedrxiv ? "https://www.medrxiv.org/content" : "https://arxiv.org/abs"
  const pdfBase = isMedrxiv ? "https://www.medrxiv.org/content" : "https://arxiv.org/pdf"
  const fieldLower = catName.toLowerCase()

  const papers: AnalyzedPaper[] = []

  for (let i = 0; i < count; i++) {
    const verb = pick(VERBS, rng)
    const adj = pick(ADJS, rng)
    const noun = pick(NOUNS_EXTRA, rng)
    const title = `${verb} ${adj} ${noun} in ${catName}`

    const numAuthors = 2 + Math.floor(rng() * 4)
    const authors: string[] = []
    for (let a = 0; a < numAuthors; a++) {
      authors.push(`${pick(FIRST, rng)} ${pick(LAST, rng)}`)
    }

    const day = 1 + Math.floor(rng() * 6)
    const hour = 10 + Math.floor(rng() * 12)
    const dateStr = `2026-02-0${day}T${String(hour).padStart(2, "0")}:00:00Z`
    const idNum = `2602.${String(10000 + Math.floor(rng() * 89999)).padStart(5, "0")}`

    const paperId = isMedrxiv
      ? `medrxiv:10.1101/${idNum}`
      : `http://arxiv.org/abs/${idNum}v1`
    const link = isMedrxiv
      ? `${baseUrl}/10.1101/${idNum}v1`
      : `${baseUrl}/${idNum}`
    const pdfLink = isMedrxiv
      ? `${baseUrl}/10.1101/${idNum}v1.full.pdf`
      : `${pdfBase}/${idNum}`

    const improvement = (5 + rng() * 30).toFixed(1)
    const summary = `We present ${title.toLowerCase()}. Through extensive experiments, we demonstrate significant improvements over existing methods. Our approach achieves state-of-the-art results on standard benchmarks for ${fieldLower}, with improvements of ${improvement}% on the primary metric. We provide theoretical analysis and extensive ablation studies to validate our design choices. The code and models will be made publicly available.`

    const bsIndex = 1 + Math.floor(rng() * 7)
    const sotaScore = 3 + Math.floor(rng() * 7)
    const isSOTA = sotaScore >= 7

    const numClaims = 2 + Math.floor(rng() * 2)
    const coreClaims: string[] = []
    for (let c = 0; c < numClaims; c++) {
      const pct = (10 + rng() * 40).toFixed(0)
      coreClaims.push(`${pick(ADJS, rng)} ${pick(NOUNS_EXTRA, rng)} approach yields ${pct}% improvement in ${fieldLower} tasks`)
    }

    const numFlags = 1 + Math.floor(rng() * 2)
    const redFlags: string[] = []
    const usedFlags = new Set<number>()
    for (let f = 0; f < numFlags; f++) {
      let idx = Math.floor(rng() * RED_FLAGS.length)
      while (usedFlags.has(idx)) idx = (idx + 1) % RED_FLAGS.length
      usedFlags.add(idx)
      redFlags.push(RED_FLAGS[idx])
    }

    const analysis: PaperAnalysis = {
      bsIndex,
      coreClaims,
      redFlags,
      expertCommentary: pick(EXPERT, rng),
      sotaScore,
      isSOTA,
      oneLiner: `${adj.charAt(0).toUpperCase() + adj.slice(1)} ${noun} method that ${isSOTA ? "sets a new bar" : "offers incremental gains"} for ${fieldLower}.`,
    }

    papers.push({
      id: paperId,
      title,
      summary,
      authors,
      published: dateStr,
      updated: dateStr,
      categories: [categoryCode],
      primaryCategory: categoryCode,
      link,
      pdfLink,
      analysis,
    })
  }

  const sotaRanking: SotaRankingEntry[] = papers
    .filter((p) => p.analysis && p.analysis.sotaScore >= 5)
    .sort((a, b) => (b.analysis?.sotaScore ?? 0) - (a.analysis?.sotaScore ?? 0))
    .slice(0, 10)
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

  return {
    category: categoryCode,
    categoryName: catName,
    generatedAt: "2026-02-07T01:00:00.000Z",
    paperCount: papers.length,
    analyzedCount: papers.length,
    papers,
    sotaRanking,
  }
}
