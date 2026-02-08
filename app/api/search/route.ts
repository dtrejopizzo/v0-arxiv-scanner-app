import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/client"

/**
 * GET /api/search
 * 
 * Search papers with filters and pagination
 * 
 * Query params:
 * - q: search query (full-text search)
 * - category: filter by category
 * - from: date range start (YYYY-MM-DD)
 * - to: date range end (YYYY-MM-DD)
 * - analyzed: filter by analysis status (true/false)
 * - sota: filter SOTA papers only (true/false)
 * - page: page number (default: 1)
 * - limit: results per page (default: 50, max: 100)
 * - sort: sort field (published, bs_index, sota_score)
 * - order: sort order (asc, desc)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const query = searchParams.get("q") || ""
    const category = searchParams.get("category")
    const fromDate = searchParams.get("from")
    const toDate = searchParams.get("to")
    const analyzedFilter = searchParams.get("analyzed")
    const sotaFilter = searchParams.get("sota")
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "50"))
    )
    const sortField = searchParams.get("sort") || "published"
    const sortOrder = searchParams.get("order") === "asc" ? "asc" : "desc"

    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    // Build query
    let queryBuilder = supabase
      .from("papers")
      .select(
        `
        id,
        title,
        summary,
        authors,
        primary_category,
        published,
        source,
        analyses (
          bs_index,
          sota_score,
          is_sota,
          one_liner
        )
      `,
        { count: "exact" }
      )

    // Apply filters
    if (category) {
      queryBuilder = queryBuilder.contains("categories", [category])
    }

    if (fromDate) {
      queryBuilder = queryBuilder.gte("published", fromDate)
    }

    if (toDate) {
      queryBuilder = queryBuilder.lte("published", toDate)
    }

    // Text search
    if (query) {
      queryBuilder = queryBuilder.textSearch("search_vector", query, {
        type: "websearch",
        config: "english",
      })
    }

    // Analysis filter
    if (analyzedFilter === "true") {
      queryBuilder = queryBuilder.not("analyses", "is", null)
    } else if (analyzedFilter === "false") {
      queryBuilder = queryBuilder.is("analyses", null)
    }

    // Sorting
    if (sortField === "published") {
      queryBuilder = queryBuilder.order("published", { ascending: sortOrder === "asc" })
    }

    // Pagination
    queryBuilder = queryBuilder.range(offset, offset + limit - 1)

    const { data: papers, error, count } = await queryBuilder

    if (error) {
      throw error
    }

    // Post-process to filter by SOTA if needed
    let results = papers || []

    if (sotaFilter === "true") {
      results = results.filter((p) => p.analyses?.[0]?.is_sota === true)
    }

    // Transform results
    const transformedResults = results.map((paper) => {
      const analysis = Array.isArray(paper.analyses) ? paper.analyses[0] : null

      return {
        id: paper.id,
        title: paper.title,
        summary: paper.summary,
        authors: paper.authors,
        primary_category: paper.primary_category,
        published: paper.published,
        source: paper.source,
        has_analysis: !!analysis,
        analysis: analysis
          ? {
              bs_index: analysis.bs_index,
              sota_score: analysis.sota_score,
              is_sota: analysis.is_sota,
              one_liner: analysis.one_liner,
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      results: transformedResults,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next: offset + limit < (count || 0),
        has_prev: page > 1,
      },
      filters: {
        query,
        category,
        from: fromDate,
        to: toDate,
        analyzed: analyzedFilter,
        sota: sotaFilter,
      },
    })
  } catch (error) {
    console.error("[v0] Search error:", error)
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
