import type { ArxivPaper } from "@/lib/types"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const maxResults = searchParams.get("max") || "50"

  if (!category) {
    return Response.json({ error: "Category is required" }, { status: 400 })
  }

  try {
    const url = `http://export.arxiv.org/api/query?search_query=cat:${encodeURIComponent(category)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`
    
    const response = await fetch(url, {
      headers: { "User-Agent": "ArxivScanner/1.0" },
    })

    if (!response.ok) {
      throw new Error(`arXiv API returned ${response.status}`)
    }

    const xml = await response.text()
    const papers = parseArxivXml(xml)

    return Response.json({ papers, category, fetchedAt: new Date().toISOString() })
  } catch (error) {
    console.error("arXiv fetch error:", error)
    return Response.json(
      { error: "Failed to fetch from arXiv", details: String(error) },
      { status: 500 }
    )
  }
}

function parseArxivXml(xml: string): ArxivPaper[] {
  const papers: ArxivPaper[] = []
  const entries = xml.split("<entry>").slice(1)

  for (const entry of entries) {
    const id = extractTag(entry, "id")
    const title = extractTag(entry, "title").replace(/\s+/g, " ").trim()
    const summary = extractTag(entry, "summary").replace(/\s+/g, " ").trim()
    const published = extractTag(entry, "published")
    const updated = extractTag(entry, "updated")

    const authors: string[] = []
    const authorMatches = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)
    if (authorMatches) {
      for (const match of authorMatches) {
        const name = match.match(/<name>([\s\S]*?)<\/name>/)
        if (name) authors.push(name[1].trim())
      }
    }

    const categories: string[] = []
    const catMatches = entry.match(/term="([^"]+)"/g)
    if (catMatches) {
      for (const match of catMatches) {
        const term = match.match(/term="([^"]+)"/)
        if (term) categories.push(term[1])
      }
    }

    const primaryCatMatch = entry.match(/<arxiv:primary_category[^>]*term="([^"]+)"/)
    const primaryCategory = primaryCatMatch ? primaryCatMatch[1] : categories[0] || ""

    const linkMatch = entry.match(/<link[^>]*href="(https:\/\/arxiv\.org\/abs\/[^"]+)"/)
    const link = linkMatch ? linkMatch[1] : id

    const pdfMatch = entry.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/)
    const pdfLink = pdfMatch ? pdfMatch[1] : `${id.replace("abs", "pdf")}`

    papers.push({
      id,
      title,
      summary,
      authors,
      published,
      updated,
      categories,
      primaryCategory,
      link,
      pdfLink,
    })
  }

  return papers
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  return match ? match[1].trim() : ""
}
