"use client"

import { useState, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { Loader2, Play, CheckCircle, AlertCircle, RefreshCw, Shield, ArrowLeft, Lock, HeartPulse, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { ARXIV_CATEGORIES } from "@/lib/arxiv-categories"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface GeneratedCategory {
  category: string
  categoryName: string
  generatedAt: string
  paperCount: number
  analyzedCount: number
  sotaCount: number
}

interface GenerationLog {
  category: string
  status: "pending" | "running" | "done" | "error"
  message?: string
}

export default function AdminPage() {
  const [password, setPassword] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState(false)

  const { data: statusData, isLoading: statusLoading } = useSWR(
    authenticated ? "/api/admin/status" : null,
    fetcher
  )
  const [generationLogs, setGenerationLogs] = useState<GenerationLog[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<string | null>(null)

  const handleLogin = () => {
    if (password === "Santander2728,2025*34erASsa35") {
      setAuthenticated(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  const generatedMap = new Map<string, GeneratedCategory>()
  if (statusData?.categories) {
    for (const cat of statusData.categories) {
      generatedMap.set(cat.category, cat)
    }
  }

  const allSubcategories = ARXIV_CATEGORIES.flatMap((cat) =>
    cat.subcategories.map((sub) => ({
      ...sub,
      parentName: cat.name,
      parentCode: cat.code,
      source: cat.source,
    }))
  )

  const generateCategory = useCallback(async (categoryCode: string) => {
    setCurrentCategory(categoryCode)
    setGenerationLogs((prev) => [
      ...prev.filter((l) => l.category !== categoryCode),
      { category: categoryCode, status: "running", message: "Fetching papers and analyzing with AI..." },
    ])

    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryCode, maxResults: 100, password }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.details || error.error || "Unknown error")
      }

      const result = await res.json()

      setGenerationLogs((prev) =>
        prev.map((l) =>
          l.category === categoryCode
            ? {
                ...l,
                status: "done",
                message: `Done! ${result.paperCount} papers, ${result.analyzedCount} analyzed, ${result.sotaCount} SOTA`,
              }
            : l
        )
      )

      mutate("/api/admin/status")
    } catch (err) {
      setGenerationLogs((prev) =>
        prev.map((l) =>
          l.category === categoryCode
            ? { ...l, status: "error", message: String(err) }
            : l
        )
      )
    }

    setCurrentCategory(null)
  }, [password])

  const generateMultiple = useCallback(
    async (categories: string[]) => {
      setIsGenerating(true)
      for (const cat of categories) {
        await generateCategory(cat)
      }
      setIsGenerating(false)
    },
    [generateCategory]
  )

  // Password gate
  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <Lock className="size-6 text-muted-foreground" />
            </div>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>Enter the admin password to access the analysis generator.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(false) }}
              onKeyDown={(e) => { if (e.key === "Enter") handleLogin() }}
            />
            {authError && (
              <p className="text-sm text-destructive">Incorrect password. Try again.</p>
            )}
            <Button className="w-full" onClick={handleLogin}>
              <Shield className="mr-2 size-4" />
              Access Admin Panel
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 size-4" />
                Back to Scanner
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingCategories = allSubcategories
    .filter((sub) => !generatedMap.has(sub.code))
    .map((sub) => sub.code)

  const totalGenerated = generatedMap.size
  const totalCategories = allSubcategories.length
  const progressPercent = totalCategories > 0 ? (totalGenerated / totalCategories) * 100 : 0

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-1 size-4" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-foreground" />
              <div>
                <h1 className="text-lg font-bold text-foreground">Admin - Analysis Generator</h1>
                <p className="text-xs text-muted-foreground">Generate and cache AI analyses locally before publishing</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => mutate("/api/admin/status")}
              disabled={statusLoading}
            >
              <RefreshCw className={`mr-1 size-3 ${statusLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        {/* Progress Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generation Progress</CardTitle>
            <CardDescription>
              {totalGenerated} of {totalCategories} categories generated (arXiv + medRxiv)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex items-center gap-3">
              <Button
                onClick={() => generateMultiple(pendingCategories)}
                disabled={isGenerating || pendingCategories.length === 0}
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Generating {currentCategory}...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 size-4" />
                    Generate All ({pendingCategories.length} pending)
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => generateMultiple(allSubcategories.map((s) => s.code))}
                disabled={isGenerating}
                size="sm"
              >
                <RefreshCw className="mr-2 size-4" />
                Regenerate All ({totalCategories})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generation Logs */}
        {generationLogs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Generation Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {generationLogs.slice().reverse().map((log) => (
                  <div key={log.category} className="flex items-center gap-2 text-sm">
                    {log.status === "running" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    {log.status === "done" && <CheckCircle className="size-4 text-emerald-600" />}
                    {log.status === "error" && <AlertCircle className="size-4 text-red-600" />}
                    <span className="font-mono text-xs text-muted-foreground">{log.category}</span>
                    <span className="text-xs text-muted-foreground">{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories Grid */}
        {ARXIV_CATEGORIES.map((parentCat) => (
          <Card key={parentCat.code}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {parentCat.source === "medrxiv" ? (
                  <HeartPulse className="size-4 text-rose-500" />
                ) : (
                  <BookOpen className="size-4" />
                )}
                {parentCat.name}
                {parentCat.source === "medrxiv" && (
                  <Badge variant="outline" className="ml-1 text-[10px] border-rose-200 bg-rose-50 text-rose-700">
                    medRxiv
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {parentCat.subcategories.filter((s) => generatedMap.has(s.code)).length} of{" "}
                {parentCat.subcategories.length} subcategories generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {parentCat.subcategories.map((sub) => {
                  const cached = generatedMap.get(sub.code)
                  const log = generationLogs.find((l) => l.category === sub.code)
                  const isRunning = log?.status === "running"

                  return (
                    <div
                      key={sub.code}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {sub.code.replace("medrxiv.", "")}
                          </span>
                          {cached && (
                            <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-emerald-300 bg-emerald-50 text-emerald-700">
                              {cached.analyzedCount} analyzed
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-sm font-medium text-foreground">{sub.name}</p>
                        {cached && (
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(cached.generatedAt).toLocaleDateString()} - {cached.sotaCount} SOTA
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={cached ? "outline" : "default"}
                        onClick={() => generateCategory(sub.code)}
                        disabled={isGenerating || isRunning}
                        className="ml-2 h-7 shrink-0 text-xs"
                      >
                        {isRunning ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : cached ? (
                          <RefreshCw className="size-3" />
                        ) : (
                          <Play className="size-3" />
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}
