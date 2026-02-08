import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/client"
import { supabase } from "@/lib/supabase/client"
import { generateText } from "ai"

/**
 * POST /api/analyze-paper
 * 
 * Request on-demand analysis for a historical paper
 * Requires authentication for papers without existing analysis
 * 
 * Body:
 * {
 *   "paperId": "2401.12345"
 * }
 */

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
 * Analyze a paper with AI
 */
async function analyzePaperWithAI(paper: {
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
    coreClaims: Array.isArray(analysis.coreClaims) ? analysis.coreClaims : [],
    redFlags: Array.isArray(analysis.redFlags) ? analysis.redFlags : [],
    expertCommentary: analysis.expertCommentary || "Analysis completed.",
    oneLiner: analysis.oneLiner || paper.title,
  }
}

/**
 * Check if user has sufficient credits
 */
async function checkUserCredits(userId: string): Promise<boolean> {
  const serviceClient = createServiceClient()

  const { data: credits, error } = await serviceClient
    .from("user_credits")
    .select("credits_remaining, plan")
    .eq("user_id", userId)
    .single()

  if (error) {
    // No credits record, create one with free tier
    await serviceClient.from("user_credits").insert({
      user_id: userId,
      credits_remaining: 5,
      plan: "free",
    })
    return true
  }

  // Unlimited plan always has credits
  if (credits.plan === "unlimited") {
    return true
  }

  return credits.credits_remaining > 0
}

/**
 * Deduct credit from user
 */
async function deductCredit(userId: string): Promise<void> {
  const serviceClient = createServiceClient()

  const { data: credits } = await serviceClient
    .from("user_credits")
    .select("credits_remaining, total_analyses, plan")
    .eq("user_id", userId)
    .single()

  if (!credits || credits.plan === "unlimited") {
    // Unlimited plan doesn't deduct
    await serviceClient
      .from("user_credits")
      .update({
        total_analyses: (credits?.total_analyses || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
    return
  }

  await serviceClient
    .from("user_credits")
    .update({
      credits_remaining: Math.max(0, credits.credits_remaining - 1),
      total_analyses: credits.total_analyses + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
}

export async function POST(request: Request) {
  try {
    const { paperId } = await request.json()

    if (!paperId) {
      return NextResponse.json(
        { error: "paperId is required" },
        { status: 400 }
      )
    }

    const serviceClient = createServiceClient()

    // Check if analysis already exists
    const { data: existingAnalysis, error: analysisError } =
      await serviceClient
        .from("analyses")
        .select("*")
        .eq("paper_id", paperId)
        .single()

    if (existingAnalysis) {
      // Analysis already exists, return it for free
      return NextResponse.json({
        success: true,
        cached: true,
        analysis: existingAnalysis,
      })
    }

    // Get paper details
    const { data: paper, error: paperError } = await serviceClient
      .from("papers")
      .select("id, title, summary, authors, primary_category, published")
      .eq("id", paperId)
      .single()

    if (paperError || !paper) {
      return NextResponse.json(
        { error: "Paper not found" },
        { status: 404 }
      )
    }

    // Check if paper is recent (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const publishedDate = new Date(paper.published)
    const isRecent = publishedDate >= thirtyDaysAgo

    if (isRecent) {
      // Recent papers should already be auto-analyzed, but if not, analyze for free
      console.log(`[v0] Analyzing recent paper ${paperId} (should have been auto-analyzed)`)
      
      const analysis = await analyzePaperWithAI(paper)

      // Save analysis
      const { error: insertError } = await serviceClient
        .from("analyses")
        .insert({
          paper_id: paperId,
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
        throw insertError
      }

      return NextResponse.json({
        success: true,
        cached: false,
        requiresAuth: false,
        analysis,
      })
    }

    // Historical paper - requires authentication
    // Get user session (if exists)
    const authHeader = request.headers.get("authorization")
    let userId: string | null = null

    if (authHeader?.startsWith("Bearer ")) {
      // Verify token with Supabase
      const token = authHeader.substring(7)
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token)

      if (!authError && user) {
        userId = user.id
      }
    }

    if (!userId) {
      // Not authenticated - return error requiring login
      return NextResponse.json(
        {
          error: "Authentication required",
          message:
            "This is a historical paper. Please log in to request analysis.",
          requiresAuth: true,
        },
        { status: 401 }
      )
    }

    // Check user credits
    const hasCredits = await checkUserCredits(userId)

    if (!hasCredits) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          message: "You have no analysis credits remaining. Please upgrade your plan.",
          requiresUpgrade: true,
        },
        { status: 402 }
      )
    }

    // Perform analysis
    console.log(`[v0] Analyzing historical paper ${paperId} for user ${userId}`)

    const analysis = await analyzePaperWithAI(paper)

    // Save analysis
    const { error: insertError } = await serviceClient.from("analyses").insert({
      paper_id: paperId,
      bs_index: analysis.bsIndex,
      sota_score: analysis.sotaScore,
      is_sota: analysis.isSOTA,
      core_claims: analysis.coreClaims,
      red_flags: analysis.redFlags,
      expert_commentary: analysis.expertCommentary,
      one_liner: analysis.oneLiner,
      model_used: "gpt-4o-mini",
      analysis_version: 1,
      requested_by: userId,
    })

    if (insertError) {
      throw insertError
    }

    // Log the request
    await serviceClient.from("analysis_requests").insert({
      paper_id: paperId,
      user_id: userId,
      status: "completed",
      completed_at: new Date().toISOString(),
    })

    // Deduct credit
    await deductCredit(userId)

    return NextResponse.json({
      success: true,
      cached: false,
      requiresAuth: true,
      creditsUsed: 1,
      analysis,
    })
  } catch (error) {
    console.error("[v0] On-demand analysis error:", error)
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
