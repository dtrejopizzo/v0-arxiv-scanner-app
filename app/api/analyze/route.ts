import { generateText, Output } from "ai"
import { z } from "zod"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { PLANS } from "@/lib/plans"

const paperAnalysisSchema = z.object({
  bsIndex: z.number().describe("BS Index from 0 to 10 (0 = solid science, 10 = total BS)"),
  coreClaims: z.array(z.string()).describe("List of 3-5 core claims the paper makes"),
  redFlags: z.array(z.string()).describe("List of 2-4 red flags or methodological concerns"),
  expertCommentary: z.string().describe("A blunt, honest, witty expert commentary on the paper in 3-5 sentences. Be direct, insightful, and dont hold back on criticism or praise."),
  sotaScore: z.number().describe("SOTA relevance score from 0-10 (10 = defines the frontier, 0 = incremental/rehash)"),
  isSOTA: z.boolean().describe("Whether this paper genuinely pushes the state-of-the-art forward"),
  oneLiner: z.string().describe("A single-sentence TL;DR of what the paper actually contributes"),
})

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Login required to analyze papers" }, { status: 401 })
    }

    const { paperId, title, summary, authors, categories, requestOnly } = await req.json()
    if (!title || !summary) {
      return NextResponse.json({ error: "Title and summary are required" }, { status: 400 })
    }

    const user = session.user
    const plan = PLANS.find((p) => p.id === user.plan) || PLANS[0]

    // --- "Request to Admin" flow (free users who already used their credit) ---
    if (requestOnly) {
      if (!paperId) {
        return NextResponse.json({ error: "paperId required for request" }, { status: 400 })
      }
      // Check if already requested
      const existing = await sql`
        SELECT id FROM analysis_requests
        WHERE user_id = ${user.id} AND paper_id = ${paperId} AND status IN ('pending', 'processing')
        LIMIT 1
      `
      if (existing.length > 0) {
        return NextResponse.json({ error: "You already requested analysis for this paper" }, { status: 409 })
      }
      await sql`
        INSERT INTO analysis_requests (user_id, paper_id, status, priority)
        VALUES (${user.id}, ${paperId}, 'pending', ${user.plan === 'free' ? 0 : 1})
      `
      // Notify admins
      const admins = await sql`SELECT id FROM users WHERE is_admin = true`
      for (const admin of admins) {
        await sql`
          INSERT INTO notifications (user_id, type, title, message, paper_id)
          VALUES (
            ${admin.id}, 'analysis_request',
            'New analysis request',
            ${user.fullName + " (" + user.email + ") requested AI analysis for: " + title.substring(0, 80)},
            ${paperId}
          )
        `
      }
      return NextResponse.json({
        success: true,
        message: "Analysis request submitted! You will be notified when it is ready.",
        requested: true,
      })
    }

    // --- Direct AI analysis flow (paid users or welcome credit) ---

    // Check welcome credit for free users
    if (user.plan === "free") {
      if (user.welcomeCreditUsed) {
        return NextResponse.json({
          error: "Free analysis credit used. Subscribe for more or request admin analysis.",
          needsUpgrade: true,
          canRequest: true,
        }, { status: 403 })
      }
      // Mark welcome credit as used
      await sql`UPDATE users SET welcome_credit_used = true WHERE id = ${user.id}`
    } else {
      // Check daily limit for paid plans
      const today = new Date().toISOString().split("T")[0]
      const usage = await sql`
        SELECT analyses_count FROM daily_usage
        WHERE user_id = ${user.id} AND usage_date = ${today}
        LIMIT 1
      `
      const usedToday = usage[0]?.analyses_count || 0
      if (usedToday >= plan.dailyLimit) {
        return NextResponse.json({
          error: `Daily limit reached (${plan.dailyLimit} analyses). Resets tomorrow.`,
          limitReached: true,
          canRequest: true,
        }, { status: 429 })
      }
      // Increment usage
      await sql`
        INSERT INTO daily_usage (user_id, usage_date, analyses_count)
        VALUES (${user.id}, ${today}, 1)
        ON CONFLICT (user_id, usage_date)
        DO UPDATE SET analyses_count = daily_usage.analyses_count + 1
      `
    }

    // Run AI analysis
    const { output } = await generateText({
      model: "google/gemini-2.0-flash",
      output: Output.object({ schema: paperAnalysisSchema }),
      messages: [
        {
          role: "user",
          content: `You are an expert research paper analyst. Analyze this academic paper critically.

TITLE: ${title}
AUTHORS: ${authors?.join(", ") || "Unknown"}
CATEGORIES: ${categories?.join(", ") || "Unknown"}
ABSTRACT: ${summary}

Be critical but fair. Consider novelty, rigor, claims vs methodology, and real-world impact.`,
        },
      ],
    })

    // If we have a paperId, save to DB
    if (paperId) {
      await sql`
        UPDATE papers SET
          bs_index = ${output.bsIndex},
          sota_score = ${output.sotaScore},
          is_sota = ${output.isSOTA},
          one_liner = ${output.oneLiner},
          core_claims = ${JSON.stringify(output.coreClaims)},
          red_flags = ${JSON.stringify(output.redFlags)},
          expert_commentary = ${output.expertCommentary},
          analyzed_at = NOW(),
          analyzed_by = 'user'
        WHERE id = ${paperId}
      `
    }

    // Notify user
    await sql`
      INSERT INTO notifications (user_id, type, title, message, paper_id)
      VALUES (
        ${user.id}, 'analysis_complete', 'Analysis ready!',
        ${"AI analysis for \"" + title.substring(0, 80) + "\" is complete."},
        ${paperId || null}
      )
    `

    return NextResponse.json({ analysis: output, success: true })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { error: "Failed to analyze paper", details: String(error) },
      { status: 500 }
    )
  }
}
