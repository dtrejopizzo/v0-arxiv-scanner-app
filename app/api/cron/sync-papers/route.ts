import { NextResponse } from "next/server"

// All categories to sync daily
const ALL_CATEGORIES = [
  "cs.AI","cs.AR","cs.CC","cs.CE","cs.CG","cs.CL","cs.CR","cs.CV",
  "cs.CY","cs.DB","cs.DC","cs.DM","cs.DS","cs.ET","cs.FL","cs.GT",
  "cs.HC","cs.IR","cs.IT","cs.LG","cs.LO","cs.MA","cs.NI","cs.OS",
  "cs.PL","cs.RO","cs.SE","cs.SI","cs.SY",
  "econ.EM","econ.GN","econ.TH",
  "eess.AS","eess.IV","eess.SP","eess.SY",
  "math.AC","math.AG","math.AP","math.CO","math.NT","math.PR","math.ST",
  "astro-ph.CO","astro-ph.GA","astro-ph.HE",
  "cond-mat.mtrl-sci","cond-mat.str-el","cond-mat.supr-con",
  "hep-ph","hep-th","quant-ph",
  "q-bio.GN","q-bio.NC","q-bio.PE",
  "stat.ML","stat.ME","stat.TH",
]

export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"
  const adminKey = "Santander2728,2025*34erASsa35"
  const results: Array<{ category: string; status: string; papersAnalyzed?: number }> = []

  for (const category of ALL_CATEGORIES) {
    try {
      const res = await fetch(`${baseUrl}/api/sync/arxiv`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ category }),
      })
      const data = await res.json()
      results.push({ category, status: data.success ? "ok" : "error", papersAnalyzed: data.papersAnalyzed })
    } catch (err) {
      results.push({ category, status: "error" })
    }
    // Respect arXiv rate limit between categories
    await new Promise((r) => setTimeout(r, 4000))
  }

  return NextResponse.json({ success: true, categoriesProcessed: results.length, results })
}
