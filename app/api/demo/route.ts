import { generateDemoData } from "@/lib/demo-data"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const count = parseInt(searchParams.get("count") || "20", 10)

  if (!category) {
    return Response.json({ error: "Category is required" }, { status: 400 })
  }

  const data = generateDemoData(category, count)
  return Response.json(data)
}
