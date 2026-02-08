import { generateText, Output } from "ai"
import { z } from "zod"
import { sql } from "@/lib/db"

const ADMIN_PASSWORD = "Santander2728,2025*34erASsa35"

const paperAnalysisSchema = z.object({
  bsIndex: z.number().describe("BS Index 0-10. Most papers 3-6. Only exceptional rigor: 0-1. Hype without substance: 7-10."),
  coreClaims: z.array(z.string()).describe("3-5 core claims stated neutrally."),
  redFlags: z.array(z.string()).describe("2-4 specific weaknesses. EVERY paper has them."),
  expertCommentary: z.string().describe("3-5 sentences of brutally honest analysis."),
  sotaScore: z.number().describe("0-2 incremental (~60%). 3-4 solid (~25%). 5-6 interesting (~10%). 7-8 significant (~4%). 9-10 field-defining (~1%)."),
  isSOTA: z.boolean().describe("TRUE ONLY if sotaScore >= 7."),
  oneLiner: z.string().describe("Honest single sentence, no hype."),
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

    // Get unanalyzed papers from the DB for this category
    const papers = await sql`
      SELECT id, title, abstract, authors, categories, primary_category
      FROM papers
      WHERE primary_category = ${category}
        AND analyzed_at IS NULL
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
          system: `You are a ruthlessly honest senior researcher who has reviewed thousands of papers for top-tier venues (NeurIPS, ICML, Nature, Science, etc). Zero tolerance for hype or overclaimed results.

CALIBRATION (critical - follow strictly):
- bsIndex: Most papers 3-6. Only 0-1 for exceptionally rigorous work. 7-10 for unsupported or hyped claims.
- sotaScore: THE MOST IMPORTANT SCORE. 0-2 = incremental/derivative (~60% of all papers). 3-4 = solid but expected (~25%). 5-6 = genuinely interesting (~10%). 7-8 = significant advance, oral at top venue (~4%). 9-10 = field-defining, 1-2 per subfield per year (~1%).
- isSOTA: TRUE ONLY if sotaScore >= 7. If unsure, FALSE.
- redFlags: EVERY paper has weaknesses. No exceptions.
- expertCommentary: Write as if explaining to a colleague why this paper matters or doesn't. Be direct and specific.

You are a filter. If you rate everything highly, you are useless. Help researchers find the rare papers that actually matter.`,
          messages: [{
            role: "user",
            content: `Analyze this paper:

TITLE: ${paper.title}
AUTHORS: ${(paper.authors as string[]).join(", ")}
CATEGORIES: ${(paper.categories as string[]).join(", ")}
ABSTRACT: ${paper.abstract}`,
          }],
        })

        const analysis = output as z.infer<typeof paperAnalysisSchema>

        await sql`
          UPDATE papers SET
            bs_index = ${analysis.bsIndex},
            sota_score = ${analysis.sotaScore},
            is_sota = ${analysis.isSOTA},
            one_liner = ${analysis.oneLiner},
            core_claims = ${JSON.stringify(analysis.coreClaims)},
            red_flags = ${JSON.stringify(analysis.redFlags)},
            expert_commentary = ${analysis.expertCommentary},
            analyzed_at = NOW(),
            analyzed_by = 'admin'
          WHERE id = ${paper.id}
        `

        analyzedCount++
      } catch (error) {
        console.error("Failed to analyze paper:", paper.title, error)
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
