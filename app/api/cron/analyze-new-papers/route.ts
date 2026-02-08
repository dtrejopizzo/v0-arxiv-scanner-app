import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/client"
import { generateText } from "ai"

/**
 * Auto-Analysis Cron: Analyze newly synced papers with AI
 * 
 * Runs after sync-papers completes (or can be triggered separately)
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "path": "/api/cron/analyze-new-papers",
 *   "schedule": "30 21 * * 1-4"  // 9:30pm EST (30 min after sync)
 * }
 */

const BATCH_SIZE = 50 // Analyze 50 papers at a time
const MAX_PAPERS_PER_RUN = 200 // Limit to avoid timeout

interface AnalysisResult {
  bsIndex: number
  sotaScore: number
  isSOTA: boolean
  coreClaims: string[]
  redFlags: string[]
  expertCommentary: string
  oneLiner: string
}

/**
 * Analyze a single paper with AI
 */
async function analyzePaper(paper: {
  id: string
  title: string
  summary: string
  authors: string[]
  primary_category: string
}): Promise<AnalysisResult> {
  const prompt = `You are an expert research paper analyst. Analyze the following paper and provide a structured assessment.

Title: ${paper.title}

Abstract: ${paper.summary}

Authors: ${paper.authors.join(", ")}

Category: ${paper.primary_category}

Provide your analysis as JSON (no markdown formatting):
{
  "bsIndex": <number 0-10, where 0 is highly rigorous and 10 is highly speculative>,
  "coreClaims": [<array of 2-4 key claims>],
  "redFlags": [<array of 0-3 methodological concerns>],
  "expertCommentary": "<2-3 sentence expert perspective>",
  "sotaScore": <number 0-10, where 10 is groundbreaking>,
  "isSOTA": <boolean, true if sotaScore >= 7>,
  "oneLiner": "<single compelling sentence summary>"
}

Be critical but fair.`

  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      temperature: 0.3,
    })

    // Extract JSON
    let jsonStr = text.trim()
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]
    } else {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }
    }

    const analysis = JSON.parse(jsonStr)

    return {
      bsIndex: Math.min(10, Math.max(0, analysis.bsIndex ?? 5)),
      sotaScore: Math.min(10, Math.max(0, analysis.sotaScore ?? 5)),
      isSOTA: analysis.isSOTA ?? analysis.sotaScore >= 7,
      coreClaims: Array.isArray(analysis.coreClaims)
        ? analysis.coreClaims
        : [],
      redFlags: Array.isArray(analysis.redFlags) ? analysis.redFlags : [],
      expertCommentary: analysis.expertCommentary || "Analysis completed.",
      oneLiner: analysis.oneLiner || paper.title,
    }
  } catch (error) {
    console.error(`[v0] Error analyzing paper ${paper.id}:`, error)

    // Return default analysis on error
    return {
      bsIndex: 5,
      sotaScore: 5,
      isSOTA: false,
      coreClaims: ["Analysis failed - manual review recommended"],
      redFlags: [],
      expertCommentary: "Automated analysis could not be completed.",
      oneLiner: paper.title,
    }
  }
}

/**
 * GET /api/cron/analyze-new-papers
 * Analyze papers that don't have analysis yet
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceClient()
    const startTime = Date.now()

    console.log("[v0] Starting auto-analysis of new papers")

    // Find papers without analysis (limit to recent papers)
    const { data: papersToAnalyze, error: queryError } = await supabase
      .from("papers")
      .select("id, title, summary, authors, primary_category, published")
      .is("id", null) // This will be filtered by the LEFT JOIN result
      .order("published", { ascending: false })
      .limit(MAX_PAPERS_PER_RUN)

    // Better query using raw SQL to find papers without analysis
    const { data: unanalyzedPapers, error: rawError } = await supabase.rpc(
      "get_unanalyzed_papers",
      { limit_count: MAX_PAPERS_PER_RUN }
    )

    if (rawError) {
      // If function doesn't exist, fallback to manual check
      console.log("[v0] Using fallback query for unanalyzed papers")

      const { data: allRecentPapers } = await supabase
        .from("papers")
        .select("id, title, summary, authors, primary_category, published")
        .order("published", { ascending: false })
        .limit(MAX_PAPERS_PER_RUN * 2)

      if (!allRecentPapers) {
        return NextResponse.json({
          success: true,
          analyzed: 0,
          message: "No papers found",
        })
      }

      // Check which ones have analysis
      const { data: existingAnalyses } = await supabase
        .from("analyses")
        .select("paper_id")
        .in(
          "paper_id",
          allRecentPapers.map((p) => p.id)
        )

      const analyzedIds = new Set(
        existingAnalyses?.map((a) => a.paper_id) || []
      )

      const papersNeedingAnalysis = allRecentPapers
        .filter((p) => !analyzedIds.has(p.id))
        .slice(0, MAX_PAPERS_PER_RUN)

      if (papersNeedingAnalysis.length === 0) {
        return NextResponse.json({
          success: true,
          analyzed: 0,
          message: "All recent papers already analyzed",
        })
      }

      console.log(
        `[v0] Found ${papersNeedingAnalysis.length} papers needing analysis`
      )

      // Process in batches
      let totalAnalyzed = 0
      const batches = Math.ceil(papersNeedingAnalysis.length / BATCH_SIZE)

      for (let i = 0; i < batches; i++) {
        const start = i * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, papersNeedingAnalysis.length)
        const batch = papersNeedingAnalysis.slice(start, end)

        console.log(
          `[v0] Analyzing batch ${i + 1}/${batches} (${batch.length} papers)`
        )

        // Analyze papers in parallel (within batch)
        const analysisPromises = batch.map(async (paper) => {
          const analysis = await analyzePaper(paper)

          // Save to database
          const { error: insertError } = await supabase.from("analyses").insert({
            paper_id: paper.id,
            bs_index: analysis.bsIndex,
            sota_score: analysis.sotaScore,
            is_sota: analysis.isSOTA,
            core_claims: analysis.coreClaims,
            red_flags: analysis.redFlags,
            expert_commentary: analysis.expertCommentary,
            one_liner: analysis.oneLiner,
            model_used: "gpt-4o-mini",
            analysis_version: 1,
          })

          if (insertError) {
            console.error(
              `[v0] Failed to save analysis for ${paper.id}:`,
              insertError
            )
            return false
          }

          return true
        })

        const results = await Promise.all(analysisPromises)
        const successCount = results.filter((r) => r).length
        totalAnalyzed += successCount

        console.log(`[v0] Batch ${i + 1} complete: ${successCount} analyzed`)
      }

      const duration = Date.now() - startTime

      console.log(
        `[v0] Auto-analysis complete: ${totalAnalyzed} papers analyzed in ${(duration / 1000).toFixed(1)}s`
      )

      return NextResponse.json({
        success: true,
        analyzed: totalAnalyzed,
        total_candidates: papersNeedingAnalysis.length,
        duration_ms: duration,
      })
    }

    // If RPC function exists, use it
    if (!unanalyzedPapers || unanalyzedPapers.length === 0) {
      return NextResponse.json({
        success: true,
        analyzed: 0,
        message: "No unanalyzed papers found",
      })
    }

    console.log(`[v0] Found ${unanalyzedPapers.length} papers to analyze`)

    // Process papers (same logic as above)
    let totalAnalyzed = 0
    const batches = Math.ceil(unanalyzedPapers.length / BATCH_SIZE)

    for (let i = 0; i < batches; i++) {
      const start = i * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, unanalyzedPapers.length)
      const batch = unanalyzedPapers.slice(start, end)

      const analysisPromises = batch.map(async (paper: typeof unanalyzedPapers[0]) => {
        const analysis = await analyzePaper(paper)

        const { error: insertError } = await supabase.from("analyses").insert({
          paper_id: paper.id,
          bs_index: analysis.bsIndex,
          sota_score: analysis.sotaScore,
          is_sota: analysis.isSOTA,
          core_claims: analysis.coreClaims,
          red_flags: analysis.redFlags,
          expert_commentary: analysis.expertCommentary,
          one_liner: analysis.oneLiner,
          model_used: "gpt-4o-mini",
          analysis_version: 1,
        })

        return !insertError
      })

      const results = await Promise.all(analysisPromises)
      totalAnalyzed += results.filter((r) => r).length
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      analyzed: totalAnalyzed,
      duration_ms: duration,
    })
  } catch (error) {
    console.error("[v0] Auto-analysis error:", error)
    return NextResponse.json(
      {
        error: "Analysis failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes
