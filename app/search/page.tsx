"use client"

import { useState } from "react"
import { Search, Filter, Calendar, Tag, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface SearchResult {
  id: string
  title: string
  summary: string
  authors: string[]
  primary_category: string
  published: string
  source: string
  has_analysis: boolean
  analysis?: {
    bs_index: number
    sota_score: number
    is_sota: boolean
    one_liner: string
  } | null
}

interface SearchFilters {
  query: string
  category: string
  from: string
  to: string
  analyzed: string
  sota: string
}

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    category: "cs.AI", // Updated default value
    from: "",
    to: "",
    analyzed: "",
    sota: "",
  })
  
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  })

  const handleSearch = async (page = 1) => {
    setIsLoading(true)

    const params = new URLSearchParams()
    if (filters.query) params.set("q", filters.query)
    if (filters.category) params.set("category", filters.category)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (filters.analyzed) params.set("analyzed", filters.analyzed)
    if (filters.sota) params.set("sota", filters.sota)
    params.set("page", page.toString())
    params.set("limit", "50")

    try {
      const response = await fetch(`/api/search?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setResults(data.results)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("[v0] Search error:", error)
    }

    setIsLoading(false)
  }

  const categories = [
    "cs.AI", "cs.LG", "cs.CV", "cs.CL", "cs.NE", "cs.RO",
    "stat.ML", "q-bio.NC", "q-bio.QM"
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Search Papers</h1>
          <p className="text-muted-foreground">
            Search through {pagination.total.toLocaleString()} papers with advanced filters
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Search Query */}
          <div className="col-span-full flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Search papers by title, abstract, or authors..."
                value={filters.query}
                onChange={(e) =>
                  setFilters({ ...filters, query: e.target.value })
                }
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleSearch()} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>

          {/* Category Filter */}
          <div>
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select
              value={filters.category}
              onValueChange={(value) =>
                setFilters({ ...filters, category: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div>
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </div>

          {/* Date To */}
          <div>
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>

          {/* Filters */}
          <div className="flex items-end gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="analyzed"
                checked={filters.analyzed === "true"}
                onCheckedChange={(checked) =>
                  setFilters({
                    ...filters,
                    analyzed: checked ? "true" : "",
                  })
                }
              />
              <Label
                htmlFor="analyzed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Analyzed only
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sota"
                checked={filters.sota === "true"}
                onCheckedChange={(checked) =>
                  setFilters({
                    ...filters,
                    sota: checked ? "true" : "",
                  })
                }
              />
              <Label
                htmlFor="sota"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                SOTA only
              </Label>
            </div>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {results.length} of {pagination.total.toLocaleString()}{" "}
              results
            </div>

            <div className="space-y-4">
              {results.map((paper) => (
                <Card key={paper.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <CardTitle className="text-lg leading-tight">
                          <a
                            href={`https://arxiv.org/abs/${paper.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary"
                          >
                            {paper.title}
                          </a>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {paper.authors.slice(0, 3).join(", ")}
                          {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-xs">
                          {paper.primary_category}
                        </Badge>
                        {paper.has_analysis && paper.analysis?.is_sota && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-800">
                            SOTA
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {paper.summary}
                    </p>

                    {paper.has_analysis && paper.analysis && (
                      <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                        <p className="text-sm italic">
                          {paper.analysis.one_liner}
                        </p>
                        <div className="flex gap-3 text-xs">
                          <span>
                            BS Index:{" "}
                            <span className="font-mono font-semibold">
                              {paper.analysis.bs_index}/10
                            </span>
                          </span>
                          <span>
                            SOTA Score:{" "}
                            <span className="font-mono font-semibold">
                              {paper.analysis.sota_score}/10
                            </span>
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="size-3" />
                      {new Date(paper.published).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => handleSearch(pagination.page - 1)}
                disabled={!pagination.has_prev || isLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                onClick={() => handleSearch(pagination.page + 1)}
                disabled={!pagination.has_next || isLoading}
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="size-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No results found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your search query or filters
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
