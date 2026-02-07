import { readdirSync, existsSync, readFileSync } from "fs"
import { join } from "path"
import type { CachedCategoryData } from "@/lib/cache"

export async function GET() {
  const dataDir = join(process.cwd(), "public", "data", "analyses")

  if (!existsSync(dataDir)) {
    return Response.json({ categories: [] })
  }

  const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"))

  const categories = files.map((file) => {
    try {
      const content = readFileSync(join(dataDir, file), "utf-8")
      const data: CachedCategoryData = JSON.parse(content)
      return {
        category: data.category,
        categoryName: data.categoryName,
        generatedAt: data.generatedAt,
        paperCount: data.paperCount,
        analyzedCount: data.analyzedCount,
        sotaCount: data.sotaRanking.length,
        filename: file,
      }
    } catch {
      return null
    }
  }).filter(Boolean)

  return Response.json({ categories })
}
