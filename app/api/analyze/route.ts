import { generateText, Output } from "ai"
import { z } from "zod"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { PLANS } from "@/lib/plans"

const paperAnalysisSchema = z.object({
  bsIndex: z.number().describe("BS Index 0-10. Most papers should be 3-6. Only truly rigorous work gets 0-2. Hype-driven or poorly supported claims get 7-10."),
  coreClaims: z.array(z.string()).describe("3-5 core claims. State them neutrally - what the paper CLAIMS, not what it proves."),
  redFlags: z.array(z.string()).describe("2-4 red flags. EVERY paper has weaknesses. Missing baselines, limited datasets, overclaimed results, cherry-picked examples, no ablations, toy benchmarks, etc. Be specific."),
  expertCommentary: z.string().describe("3-5 sentences of brutally honest expert analysis. What's genuinely new vs recycled? Are the experiments convincing or window dressing? Would a senior reviewer accept this at a top venue? Don't be nice - be accurate."),
  sotaScore: z.number().describe("SOTA score 0-10. CALIBRATION: 0-2 = incremental/derivative, 3-4 = solid but expected, 5-6 = interesting contribution, 7-8 = significant advance (top 5% of papers), 9-10 = field-defining (1-2 papers per year per subfield). Most papers are 2-5."),
  isSOTA: z.boolean().describe("TRUE ONLY if sotaScore >= 7. This means the paper genuinely advances the state of the art in a meaningful way. Most papers do NOT qualify."),
  oneLiner: z.string().describe("A single honest sentence. Not hype, not marketing. What does this paper actually contribute when you strip away the framing?"),
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

    // Run AI analysis with calibrated, critical prompt
    const { output } = await generateText({
      model: "google/gemini-2.0-flash",
      output: Output.object({ schema: paperAnalysisSchema }),
      system: `You are a ruthlessly honest senior researcher who has reviewed thousands of papers for top-tier venues (NeurIPS, ICML, Nature, Science, CVPR, ACL, etc). You have zero tolerance for hype, overclaimed results, or incremental work dressed up as breakthroughs.

YOUR CALIBRATION (this is critical - follow it strictly):
- BS Index: Most papers are 3-6. Solid empirical work with honest claims: 2-4. Papers with unsupported claims, missing ablations, or hype language: 6-8. Only clearly fraudulent or absurd papers: 9-10. Only exceptionally rigorous work with all bases covered: 0-1.
- SOTA Score: This is the MOST IMPORTANT score. Be EXTREMELY stingy.
  * 0-2: Incremental, derivative, or rehashing known ideas with minor twists. This is ~60% of all papers.
  * 3-4: Solid contribution but not surprising. Competent engineering or expected extension. ~25% of papers.
  * 5-6: Genuinely interesting. Novel angle, strong results, or important negative result. ~10% of papers.
  * 7-8: Significant advance. Would be a spotlight/oral at a top venue. Only ~4% of papers.
  * 9-10: Field-defining. Changes how people think about the problem. Maybe 1-2 per subfield per year. ~1% of papers.
- isSOTA: Set to TRUE only when sotaScore >= 7. If you're unsure, the answer is FALSE.
- Red Flags: EVERY paper has them. No exceptions. Even great papers have limitations. Find them.
- Expert Commentary: Write as if you're explaining to a colleague over coffee why this paper matters (or doesn't). Be direct, specific, and back up your assessment with concrete observations from the abstract.

Remember: The purpose of this analysis is to help researchers quickly identify the rare papers that actually matter. If you rate everything highly, you are useless. Be the filter.`,
      messages: [
        {
          role: "user",
          content: `Analyze this paper:

TITLE: ${title}
AUTHORS: ${authors?.join(", ") || "Unknown"}
CATEGORIES: ${categories?.join(", ") || "Unknown"}
ABSTRACT: ${summary}`,
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
