import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { generateText } from "ai"

// GET /api/admin/requests - Get pending analysis requests
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const requests = await sql`
      SELECT ar.*, u.email as user_email, u.full_name as user_name, u.plan as user_plan,
             p.title as paper_title, p.primary_category, p.analyzed_at
      FROM analysis_requests ar
      JOIN users u ON ar.user_id = u.id
      JOIN papers p ON ar.paper_id = p.id
      ORDER BY
        CASE ar.status
          WHEN 'pending' THEN 0
          WHEN 'processing' THEN 1
          WHEN 'done' THEN 2
          WHEN 'failed' THEN 3
        END,
        ar.priority DESC,
        ar.requested_at ASC
      LIMIT 100
    `

    return NextResponse.json({ requests })
  } catch (error) {
    console.error("Admin requests error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

// POST /api/admin/requests - Process a pending request
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { requestId } = await request.json()
    if (!requestId) return NextResponse.json({ error: "requestId required" }, { status: 400 })

    // Get the request
    const reqRows = await sql`
      SELECT ar.*, p.title, p.abstract, p.authors, p.categories
      FROM analysis_requests ar
      JOIN papers p ON ar.paper_id = p.id
      WHERE ar.id = ${requestId} AND ar.status = 'pending'
      LIMIT 1
    `

    if (reqRows.length === 0) {
      return NextResponse.json({ error: "Request not found or already processed" }, { status: 404 })
    }

    const req = reqRows[0]

    // Mark as processing
    await sql`UPDATE analysis_requests SET status = 'processing', processed_at = NOW() WHERE id = ${requestId}`

    try {
      // Run AI analysis
      const { text } = await generateText({
        model: "openai/gpt-4o-mini",
        prompt: `You are an expert research paper analyst. Analyze this paper and return ONLY valid JSON.

Title: ${req.title}
Abstract: ${req.abstract}
Authors: ${(req.authors || []).join(", ")}
Categories: ${(req.categories || []).join(", ")}

Return: {"bsIndex":<0-10>,"coreClaims":["..."],"redFlags":["..."],"expertCommentary":"...","sotaScore":<0-10>,"isSOTA":<bool>,"oneLiner":"..."}`,
        temperature: 0.3,
      })

      let jsonStr = text.trim()
      const codeBlock = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
      if (codeBlock) jsonStr = codeBlock[1]
      else {
        const m = jsonStr.match(/\{[\s\S]*\}/)
        if (m) jsonStr = m[0]
      }

      const analysis = JSON.parse(jsonStr)
      const bsIndex = Math.min(10, Math.max(0, analysis.bsIndex || 5))
      const sotaScore = Math.min(10, Math.max(0, analysis.sotaScore || 5))

      // Save to paper
      await sql`
        UPDATE papers SET
          bs_index = ${bsIndex},
          sota_score = ${sotaScore},
          is_sota = ${analysis.isSOTA || sotaScore >= 7},
          one_liner = ${analysis.oneLiner || req.title},
          core_claims = ${analysis.coreClaims || []},
          red_flags = ${analysis.redFlags || []},
          expert_commentary = ${analysis.expertCommentary || ""},
          analyzed_at = NOW(),
          analyzed_by = 'admin'
        WHERE id = ${req.paper_id}
      `

      // Mark request as done
      await sql`UPDATE analysis_requests SET status = 'done', completed_at = NOW() WHERE id = ${requestId}`

      // Notify the user
      await sql`
        INSERT INTO notifications (user_id, type, title, message, paper_id)
        VALUES (
          ${req.user_id},
          'analysis_complete',
          'Analysis ready!',
          ${"The AI analysis for \"" + req.title.substring(0, 80) + "\" is now available. Check it out!"},
          ${req.paper_id}
        )
      `

      return NextResponse.json({ success: true, analysis })
    } catch (err) {
      await sql`
        UPDATE analysis_requests SET status = 'failed', error_message = ${String(err)}, completed_at = NOW()
        WHERE id = ${requestId}
      `
      return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
    }
  } catch (error) {
    console.error("Admin process error:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
