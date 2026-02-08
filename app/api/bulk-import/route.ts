import { NextResponse } from "next/server"
import { bulkImportPapers } from "@/scripts/bulk-import-papers"
import { createServiceClient } from "@/lib/supabase/client"

/**
 * POST /api/bulk-import
 * 
 * Triggers bulk import of papers from a JSON file
 * 
 * Body:
 * {
 *   "filePath": "public/data/cs-ai-191k.json",
 *   "dryRun": false  // Optional: test without actually inserting
 * }
 * 
 * Note: For very large files (5M+ papers), consider running the script
 * directly on the server or using a background job queue.
 */
export async function POST(request: Request) {
  try {
    const { filePath, dryRun } = await request.json()

    if (!filePath) {
      return NextResponse.json(
        { error: "filePath is required" },
        { status: 400 }
      )
    }

    // Verify Supabase connection
    const supabase = createServiceClient()
    const { error: connectionError } = await supabase
      .from("papers")
      .select("id")
      .limit(1)

    if (connectionError) {
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: connectionError.message,
        },
        { status: 500 }
      )
    }

    if (dryRun) {
      return NextResponse.json({
        message: "Dry run - no import performed",
        filePath,
      })
    }

    // Start import (this will take a while for large files)
    console.log(`[v0] Starting bulk import via API: ${filePath}`)

    // For production, consider using a job queue here
    // For now, we'll run it synchronously (may timeout on Vercel after 60s)
    const stats = await bulkImportPapers(filePath)

    return NextResponse.json({
      success: true,
      message: "Import completed successfully",
      stats,
    })
  } catch (error) {
    console.error("[v0] Bulk import API error:", error)

    return NextResponse.json(
      {
        error: "Import failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/bulk-import?status=true
 * 
 * Check database status and paper counts
 */
export async function GET(request: Request) {
  try {
    const supabase = createServiceClient()

    // Get paper counts
    const { count: totalPapers, error: countError } = await supabase
      .from("papers")
      .select("*", { count: "exact", head: true })

    if (countError) {
      throw countError
    }

    // Get analysis count
    const { count: totalAnalyses, error: analysisError } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true })

    if (analysisError) {
      throw analysisError
    }

    // Get category breakdown
    const { data: categoryData, error: categoryError } = await supabase
      .from("papers")
      .select("primary_category")

    if (categoryError) {
      throw categoryError
    }

    const categoryCounts = categoryData?.reduce(
      (acc, p) => {
        acc[p.primary_category] = (acc[p.primary_category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const topCategories = Object.entries(categoryCounts || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }))

    return NextResponse.json({
      database: "connected",
      total_papers: totalPapers || 0,
      total_analyses: totalAnalyses || 0,
      analysis_coverage:
        totalPapers && totalAnalyses
          ? ((totalAnalyses / totalPapers) * 100).toFixed(2) + "%"
          : "0%",
      top_categories: topCategories,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch database status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
