import { generateText, Output } from "ai"
import { z } from "zod"
import { neon } from "@neondatabase/serverless"

const ADMIN_PASSWORD = "Santander2728,2025*34erASsa35"

const paperAnalysisSchema = z.object({
  bsIndex: z.number().describe("BS Index from 1 to 10 (1 = solid science, 10 = total BS)"),
  coreClaims: z.array(z.string()).describe("List of 3-5 core claims the paper makes"),
  redFlags: z.array(z.string()).describe("List of 2-4 red flags or methodological concerns"),
  expertCommentary: z.string().describe("A blunt, honest, witty expert commentary on the paper in 3-5 sentences."),
  sotaScore: z.number().describe("SOTA relevance score from 1-10 (10 = defines the frontier)"),
  isSOTA: z.boolean().describe("Whether this paper genuinely pushes the state-of-the-art forward"),
  oneLiner: z.string().describe("A single-sentence TL;DR of what the paper actually contributes"),
})

export const maxDuration = 300

export async function POST(req: Request) {
  try {
    const { category, maxResults = 50, password } = await req.json()

    if (password !== ADMIN_PASSWORD) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!category) {
      return Response.json({ error: "Category is required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Get unanalyzed papers from the DB for this category
    const papers = await sql`
      SELECT id, title, abstract, authors, categories, primary_category
      FROM papers
      WHERE primary_category = ${category}
        AND ai_bs_index IS NULL
      ORDER BY published_date DESC
      LIMIT ${maxResults}
    `

    if (papers.length === 0) {
      return Response.json({ success: true, category, analyzed: 0, message: "All papers already analyzed" })
    }

    let analyzedCount = 0

    for (const paper of papers) {
      try {
        const { output } = await generateText({
          model: "google/gemini-2.0-flash",
          output: Output.object({ schema: paperAnalysisSchema }),
          messages: [{
            role: "user",
            content: `You are an expert research paper analyst. Analyze this academic paper critically. Be blunt and witty.

PAPER TITLE: ${paper.title}
AUTHORS: ${(paper.authors as string[]).join(", ")}
CATEGORIES: ${(paper.categories as string[]).join(", ")}
ABSTRACT:
${paper.abstract}

Consider: Is this genuinely novel? Are claims well-supported? Does it push SOTA forward? What red flags would a careful reviewer catch?`,
          }],
        })

        const analysis = output as z.infer<typeof paperAnalysisSchema>

        await sql`
          UPDATE papers SET
            ai_bs_index = ${analysis.bsIndex},
            ai_sota_score = ${analysis.sotaScore},
            ai_is_sota = ${analysis.isSOTA},
            ai_one_liner = ${analysis.oneLiner},
            ai_core_claims = ${JSON.stringify(analysis.coreClaims)},
            ai_red_flags = ${JSON.stringify(analysis.redFlags)},
            ai_expert_commentary = ${analysis.expertCommentary},
            ai_analyzed_at = NOW()
          WHERE id = ${paper.id}
        `

        analyzedCount++
      } catch (error) {
        console.error(`Failed to analyze paper: ${paper.title}`, error)
      }

      // Rate limit between API calls
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    return Response.json({
      success: true,
      category,
      analyzed: analyzedCount,
      total: papers.length,
    })
  } catch (error) {
    console.error("Generate error:", error)
    return Response.json(
      { error: "Failed to generate analysis", details: String(error) },
      { status: 500 }
    )
  }
}
