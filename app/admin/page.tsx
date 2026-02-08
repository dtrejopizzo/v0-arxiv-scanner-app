"use client"

import { useState, useCallback } from "react"
import useSWR, { mutate } from "swr"
import {
  Loader2, Play, CheckCircle, AlertCircle, RefreshCw, Shield, ArrowLeft, Lock,
  HeartPulse, BookOpen, Users, BarChart3, Bell, Database, Cloud, FileJson,
  Clock, X, Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ARXIV_CATEGORIES } from "@/lib/arxiv-categories"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface GenerationLog {
  category: string
  status: "pending" | "running" | "done" | "error"
  message?: string
}

export default function AdminPage() {
  const [password, setPassword] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [generationLogs, setGenerationLogs] = useState<GenerationLog[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<string | null>(null)
  const [syncCategory, setSyncCategory] = useState("")
  const [syncMaxResults, setSyncMaxResults] = useState("200")
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncLog, setSyncLog] = useState("")

  const { data: stats, isLoading: statsLoading } = useSWR(
    authenticated ? "/api/admin/stats" : null,
    fetcher,
    { refreshInterval: 15000 }
  )

  const { data: requests, isLoading: requestsLoading, mutate: mutateRequests } = useSWR(
    authenticated ? "/api/admin/requests" : null,
    fetcher,
    { refreshInterval: 10000 }
  )

  const { data: statusData } = useSWR(
    authenticated ? "/api/admin/status" : null,
    fetcher
  )

  const handleLogin = () => {
    if (password === "Santander2728,2025*34erASsa35") {
      setAuthenticated(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  const generatedMap = new Map<string, { analyzedCount: number; generatedAt: string; sotaCount: number }>()
  if (statusData?.categories) {
    for (const cat of statusData.categories) {
      generatedMap.set(cat.category, cat)
    }
  }

  const allSubcategories = ARXIV_CATEGORIES.flatMap((cat) =>
    cat.subcategories.map((sub) => ({ ...sub, parentName: cat.name, source: cat.source }))
  )

  const generateCategory = useCallback(async (categoryCode: string) => {
    setCurrentCategory(categoryCode)
    setGenerationLogs((prev) => [
      ...prev.filter((l) => l.category !== categoryCode),
      { category: categoryCode, status: "running", message: "Fetching & analyzing..." },
    ])
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryCode, maxResults: 100, password }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.details || error.error || "Failed")
      }
      const result = await res.json()
      setGenerationLogs((prev) =>
        prev.map((l) =>
          l.category === categoryCode
            ? { ...l, status: "done", message: `${result.paperCount} papers, ${result.analyzedCount} analyzed` }
            : l
        )
      )
      mutate("/api/admin/status")
      mutate("/api/admin/stats")
    } catch (err) {
      setGenerationLogs((prev) =>
        prev.map((l) =>
          l.category === categoryCode ? { ...l, status: "error", message: String(err) } : l
        )
      )
    }
    setCurrentCategory(null)
  }, [password])

  const generateMultiple = useCallback(async (categories: string[]) => {
    setIsGenerating(true)
    for (const cat of categories) { await generateCategory(cat) }
    setIsGenerating(false)
  }, [generateCategory])

  // Sync from arXiv
  const handleSync = async () => {
    if (!syncCategory.trim()) return
    setIsSyncing(true)
    setSyncLog("Starting sync for " + syncCategory + "...")
    try {
      const res = await fetch("/api/sync/arxiv", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": password },
        body: JSON.stringify({ category: syncCategory, maxResults: parseInt(syncMaxResults), analyzeWithAI: true }),
      })
      const result = await res.json()
      if (result.success) {
        setSyncLog(`Done: ${result.papersFound} found, ${result.papersNew} new, ${result.papersAnalyzed} analyzed`)
      } else {
        setSyncLog("Error: " + (result.error || "Failed"))
      }
      mutate("/api/admin/stats")
    } catch (err) {
      setSyncLog("Error: " + String(err))
    }
    setIsSyncing(false)
  }

  // Process analysis request
  const processRequest = async (requestId: string) => {
    try {
      const res = await fetch("/api/admin/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      })
      const result = await res.json()
      if (result.success) {
        mutateRequests()
        mutate("/api/admin/stats")
      }
    } catch (err) {
      console.error("Process request error:", err)
    }
  }

  // Process all pending requests
  const processAllRequests = async () => {
    const pending = requests?.requests?.filter((r: { status: string }) => r.status === "pending") || []
    for (const req of pending) {
      await processRequest(req.id)
    }
  }

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
            <CardDescription>Enter admin password to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(false) }}
              onKeyDown={(e) => { if (e.key === "Enter") handleLogin() }}
            />
            {authError && <p className="text-sm text-destructive">Incorrect password.</p>}
            <Button className="w-full" onClick={handleLogin}>
              <Shield className="mr-2 size-4" />
              Access Admin
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/"><ArrowLeft className="mr-2 size-4" />Back to Scanner</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingCategories = allSubcategories.filter((sub) => !generatedMap.has(sub.code)).map((s) => s.code)
  const pendingRequestCount = requests?.requests?.filter((r: { status: string }) => r.status === "pending").length || 0

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/"><ArrowLeft className="mr-1 size-4" />Back</Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-foreground" />
              <div>
                <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">Papers, users, sync, requests</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingRequestCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <Bell className="size-3" />
                {pendingRequestCount} pending requests
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => { mutate("/api/admin/stats"); mutateRequests() }} disabled={statsLoading}>
              <RefreshCw className={`mr-1 size-3 ${statsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        {/* Stats Row */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Papers</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-foreground">{Number(stats.papers?.total || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">Analyzed</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{Number(stats.papers?.analyzed || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">SOTA</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-amber-600">{Number(stats.papers?.sota || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Users</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-blue-600">{Number(stats.users?.total || 0)}</p>
                <p className="text-xs text-muted-foreground">{stats.users?.paid || 0} paid, {stats.users?.recent || 0} this week</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Requests</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-red-600">{Number(stats.requests?.pending || 0)}</p>
                <p className="text-xs text-muted-foreground">{stats.requests?.done || 0} completed</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="requests" className="gap-1.5">
              <Bell className="size-3.5" />
              Requests
              {pendingRequestCount > 0 && (
                <Badge variant="destructive" className="ml-1 size-5 rounded-full p-0 text-[10px] flex items-center justify-center">
                  {pendingRequestCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sync" className="gap-1.5">
              <Cloud className="size-3.5" />
              arXiv Sync
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-1.5">
              <FileJson className="size-3.5" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5">
              <BarChart3 className="size-3.5" />
              Categories
            </TabsTrigger>
          </TabsList>

          {/* ─── Analysis Requests Tab ────────────────────────────── */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Analysis Requests</CardTitle>
                    <CardDescription>User-submitted requests for AI paper analysis</CardDescription>
                  </div>
                  {pendingRequestCount > 0 && (
                    <Button size="sm" onClick={processAllRequests}>
                      <Play className="mr-1.5 size-3.5" />
                      Process All ({pendingRequestCount})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !requests?.requests?.length ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No requests yet.</p>
                ) : (
                  <div className="space-y-2">
                    {requests.requests.map((req: {
                      id: string
                      status: string
                      user_email: string
                      user_name: string
                      user_plan: string
                      paper_title: string
                      primary_category: string
                      requested_at: string
                      paper_id: string
                    }) => (
                      <div key={req.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{req.paper_title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{req.user_name} ({req.user_email})</span>
                            <Badge variant="outline" className="text-[10px]">{req.user_plan}</Badge>
                            <span className="font-mono">{req.primary_category}</span>
                            <span>{new Date(req.requested_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            req.status === "pending" ? "destructive"
                            : req.status === "processing" ? "default"
                            : req.status === "done" ? "secondary"
                            : "outline"
                          }
                          className="shrink-0 text-xs"
                        >
                          {req.status}
                        </Badge>
                        {req.status === "pending" && (
                          <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" onClick={() => processRequest(req.id)}>
                            <Zap className="mr-1 size-3" />
                            Analyze
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── arXiv Sync Tab ────────────────────────────────── */}
          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Manual arXiv Sync</CardTitle>
                <CardDescription>
                  Fetch new papers from arXiv API for a category. Papers are automatically analyzed with AI.
                  arXiv updates Mon-Thu ~20:00 EST. A cron job runs automatically at 21:00 EST.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category (e.g. cs.AI)</label>
                    <Input
                      placeholder="cs.AI"
                      value={syncCategory}
                      onChange={(e) => setSyncCategory(e.target.value)}
                    />
                  </div>
                  <div className="w-28">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Max results</label>
                    <Input
                      type="number"
                      value={syncMaxResults}
                      onChange={(e) => setSyncMaxResults(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSync} disabled={isSyncing || !syncCategory.trim()}>
                    {isSyncing ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Cloud className="mr-1.5 size-4" />}
                    {isSyncing ? "Syncing..." : "Sync"}
                  </Button>
                </div>
                {syncLog && (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                    {isSyncing ? <Loader2 className="size-3.5 animate-spin shrink-0" /> : <CheckCircle className="size-3.5 shrink-0 text-emerald-500" />}
                    <span className="text-muted-foreground">{syncLog}</span>
                  </div>
                )}
                {/* Recent syncs */}
                {stats?.recentSyncs?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Recent Syncs</p>
                    <div className="max-h-40 space-y-1.5 overflow-y-auto">
                      {stats.recentSyncs.map((s: {
                        id: string
                        category: string
                        status: string
                        papers_found: number
                        papers_new: number
                        papers_analyzed: number
                        started_at: string
                        duration_seconds: number
                      }) => (
                        <div key={s.id} className="flex items-center gap-2 text-xs">
                          {s.status === "completed" ? (
                            <CheckCircle className="size-3 text-emerald-500" />
                          ) : s.status === "failed" ? (
                            <X className="size-3 text-red-500" />
                          ) : (
                            <Clock className="size-3 text-muted-foreground" />
                          )}
                          <span className="font-mono text-muted-foreground">{s.category}</span>
                          <span className="text-muted-foreground">
                            {s.papers_found || 0} found, {s.papers_new || 0} new, {s.papers_analyzed || 0} analyzed
                          </span>
                          {s.duration_seconds && (
                            <span className="text-muted-foreground">({s.duration_seconds}s)</span>
                          )}
                          <span className="ml-auto text-muted-foreground">
                            {new Date(s.started_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Generate Tab (legacy JSON generation) ────────── */}
          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">JSON Generation</CardTitle>
                <CardDescription>Generate cached JSON files for static serving (legacy system)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress
                  value={allSubcategories.length > 0 ? (generatedMap.size / allSubcategories.length) * 100 : 0}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {generatedMap.size} of {allSubcategories.length} categories cached
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    onClick={() => generateMultiple(pendingCategories)}
                    disabled={isGenerating || pendingCategories.length === 0}
                    size="sm"
                  >
                    {isGenerating ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" />Generating {currentCategory}...</>
                    ) : (
                      <><Play className="mr-2 size-4" />Generate Pending ({pendingCategories.length})</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => generateMultiple(allSubcategories.map((s) => s.code))}
                    disabled={isGenerating}
                    size="sm"
                  >
                    <RefreshCw className="mr-2 size-4" />
                    Regenerate All
                  </Button>
                </div>
                {generationLogs.length > 0 && (
                  <div className="max-h-48 space-y-1 overflow-y-auto pt-2">
                    {generationLogs.slice().reverse().map((log) => (
                      <div key={log.category} className="flex items-center gap-2 text-xs">
                        {log.status === "running" && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                        {log.status === "done" && <CheckCircle className="size-3 text-emerald-500" />}
                        {log.status === "error" && <AlertCircle className="size-3 text-red-500" />}
                        <span className="font-mono text-muted-foreground">{log.category}</span>
                        <span className="text-muted-foreground">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Categories Tab ──────────────────────────────── */}
          <TabsContent value="categories" className="space-y-4">
            {stats?.categories?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Papers by Category (Database)</CardTitle>
                  <CardDescription>Distribution of papers stored in Neon database</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-y-auto">
                    <div className="space-y-2">
                      {stats.categories.map((cat: { primary_category: string; count: number; analyzed: number }) => {
                        const pct = cat.count > 0 ? (Number(cat.analyzed) / Number(cat.count)) * 100 : 0
                        return (
                          <div key={cat.primary_category} className="flex items-center gap-3">
                            <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{cat.primary_category}</span>
                            <div className="flex-1">
                              <Progress value={pct} className="h-1.5" />
                            </div>
                            <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                              {Number(cat.analyzed)}/{Number(cat.count)} ({pct.toFixed(0)}%)
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => {
                                setSyncCategory(cat.primary_category)
                                document.querySelector('[data-value="sync"]')
                              }}
                            >
                              Sync
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Static JSON categories */}
            {ARXIV_CATEGORIES.map((parentCat) => (
              <Card key={parentCat.code}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {parentCat.source === "medrxiv" ? <HeartPulse className="size-4 text-rose-500" /> : <BookOpen className="size-4" />}
                    {parentCat.name}
                    {parentCat.source === "medrxiv" && (
                      <Badge variant="outline" className="ml-1 text-[10px] border-rose-200 bg-rose-50 text-rose-700">medRxiv</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {parentCat.subcategories.filter((s) => generatedMap.has(s.code)).length} of{" "}
                    {parentCat.subcategories.length} cached
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {parentCat.subcategories.map((sub) => {
                      const cached = generatedMap.get(sub.code)
                      const log = generationLogs.find((l) => l.category === sub.code)
                      const isRunning = log?.status === "running"
                      return (
                        <div key={sub.code} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{sub.code}</span>
                              {cached && (
                                <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-emerald-300 bg-emerald-50 text-emerald-700">
                                  {cached.analyzedCount}
                                </Badge>
                              )}
                            </div>
                            <p className="truncate text-sm font-medium text-foreground">{sub.name}</p>
                          </div>
                          <Button
                            size="sm"
                            variant={cached ? "outline" : "default"}
                            onClick={() => generateCategory(sub.code)}
                            disabled={isGenerating || isRunning}
                            className="ml-2 h-7 shrink-0 text-xs"
                          >
                            {isRunning ? <Loader2 className="size-3 animate-spin" /> : cached ? <RefreshCw className="size-3" /> : <Play className="size-3" />}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
