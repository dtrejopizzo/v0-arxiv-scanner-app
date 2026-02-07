import type { ArxivPaper } from "@/lib/types"
import { getMedRxivSubjectName } from "@/lib/arxiv-categories"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const maxResults = parseInt(searchParams.get("max") || "50", 10)

  if (!category) {
    return Response.json({ error: "Category is required" }, { status: 400 })
  }

  const subjectName = getMedRxivSubjectName(category)
  if (!subjectName) {
    return Response.json({ error: "Invalid medRxiv category" }, { status: 400 })
  }

  try {
    // medRxiv API: fetch recent papers (last 30 days)
    const endDate = new Date().toISOString().split("T")[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const allPapers: ArxivPaper[] = []
    let cursor = 0
    const pageSize = 100

    // Paginate until we have enough or run out
    while (allPapers.length < maxResults) {
      const url = `https://api.medrxiv.org/details/medrxiv/${startDate}/${endDate}/${cursor}/${pageSize}`
      const response = await fetch(url, {
        headers: { "User-Agent": "ArxivScanner/1.0" },
      })

      if (!response.ok) {
        throw new Error(`medRxiv API returned ${response.status}`)
      }

      const data = await response.json()
      const collection = data.collection || []

      if (collection.length === 0) break

      // Filter by subject
      for (const item of collection) {
        if (item.category === subjectName && allPapers.length < maxResults) {
          allPapers.push({
            id: `medrxiv:${item.doi}`,
            title: item.title || "",
            summary: item.abstract || "",
            authors: (item.authors || "").split("; ").filter(Boolean),
            published: item.date || "",
            updated: item.date || "",
            categories: [category],
            primaryCategory: category,
            link: `https://www.medrxiv.org/content/${item.doi}v${item.version}`,
            pdfLink: `https://www.medrxiv.org/content/${item.doi}v${item.version}.full.pdf`,
          })
        }
      }

      // If we got fewer results than page size, we're done
      if (collection.length < pageSize) break
      cursor += pageSize
    }

    return Response.json({
      papers: allPapers,
      category,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("medRxiv fetch error:", error)
    return Response.json(
      { error: "Failed to fetch from medRxiv", details: String(error) },
      { status: 500 }
    )
  }
}
