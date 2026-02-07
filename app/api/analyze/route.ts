import { generateText, Output } from "ai"
import { z } from "zod"

const paperAnalysisSchema = z.object({
  bsIndex: z.number().describe("BS Index from 1 to 10 (1 = solid science, 10 = total BS)"),
  coreClaims: z.array(z.string()).describe("List of 3-5 core claims the paper makes"),
  redFlags: z.array(z.string()).describe("List of 2-4 red flags or methodological concerns"),
  expertCommentary: z.string().describe("A blunt, honest, witty expert commentary on the paper in 3-5 sentences. Be direct, insightful, and dont hold back on criticism or praise. Write as if you are a seasoned researcher giving your unfiltered opinion to a colleague."),
  sotaScore: z.number().describe("SOTA relevance score from 1-10 (10 = defines the frontier, 1 = incremental/rehash)"),
  isSOTA: z.boolean().describe("Whether this paper genuinely pushes the state-of-the-art forward"),
  oneLiner: z.string().describe("A single-sentence TL;DR of what the paper actually contributes"),
})

export async function POST(req: Request) {
  try {
    const { title, summary, authors, categories } = await req.json()

    if (!title || !summary) {
      return Response.json({ error: "Title and summary are required" }, { status: 400 })
    }

    const { output } = await generateText({
      model: "google/gemini-2.0-flash",
      output: Output.object({ schema: paperAnalysisSchema }),
      messages: [
        {
          role: "user",
          content: `You are an expert research paper analyst. You need to analyze the following academic paper and provide a critical, honest assessment. Be blunt and witty - researchers need truth, not hand-holding.

PAPER TITLE: ${title}

AUTHORS: ${authors?.join(", ") || "Unknown"}

CATEGORIES: ${categories?.join(", ") || "Unknown"}

ABSTRACT:
${summary}

Analyze this paper critically. Consider:
1. Is this genuinely novel or just incremental work dressed up as innovation?
2. Are the claims well-supported by the methodology described?
3. Does this push the state-of-the-art forward in its field?
4. What are the red flags a careful reviewer would catch?

Be especially critical of: hype without substance, overclaiming, poor baselines, and papers that are essentially "we fine-tuned X on Y" without real insight.`,
        },
      ],
    })

    return Response.json({ analysis: output })
  } catch (error) {
    console.error("Analysis error:", error)
    return Response.json(
      { error: "Failed to analyze paper", details: String(error) },
      { status: 500 }
    )
  }
}
