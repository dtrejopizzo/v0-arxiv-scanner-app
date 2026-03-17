"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import {
  Loader2, Play, CheckCircle, AlertCircle, RefreshCw, Shield, ArrowLeft, Lock,
  HeartPulse, BookOpen, Users, BarChart3, Bell, Database, Cloud, FileJson,
  Clock, X, Zap, Trophy,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ARXIV_CATEGORIES } from "@/lib/arxiv-categories"
import Link from "next/link"

const baseFetcher = (url: string) => fetch(url).then((r) => r.json())

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
  // Ingest state
  const [ingestFile, setIngestFile] = useState<File | null>(null)
  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestProgress, setIngestProgress] = useState({ current: 0, total: 0, inserted: 0, updated: 0, errors: 0 })
  const [ingestLog, setIngestLog] = useState<string[]>([])
  const [ingestBatchSize, setIngestBatchSize] = useState("500")

  // Authenticated fetcher that sends x-admin-key header
  const adminFetcher = useCallback(
    (url: string) =>
      fetch(url, { headers: { "x-admin-key": password } }).then((r) => r.json()),
    [password]
  )

  const { data: stats, isLoading: statsLoading } = useSWR(
    authenticated ? "/api/admin/stats" : null,
    adminFetcher,
    { refreshInterval: 15000 }
  )

  const { data: requests, isLoading: requestsLoading, mutate: mutateRequests } = useSWR(
    authenticated ? "/api/admin/requests" : null,
    adminFetcher,
    { refreshInterval: 10000 }
  )

  const { data: statusData } = useSWR(
    authenticated ? "/api/admin/status" : null,
    adminFetcher
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
      mutateRequests()
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

  // Sync from arXiv — single category or the 3 ranked ones
  const handleSync = async (categoriesToSync?: string[]) => {
    const cats = categoriesToSync || (syncCategory.trim() ? [syncCategory.trim()] : ["cs.AI", "cs.AR", "cs.CR"])
    setIsSyncing(true)
    setSyncLog(`Starting sync for: ${cats.join(", ")}...`)
    try {
      const res = await fetch("/api/admin/trigger-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": password },
        body: JSON.stringify({ categories: cats }),
      })
      const result = await res.json()
      if (result.success) {
        const summary = result.results
          .map((r: { category: string; status: string; papersAnalyzed?: number }) =>
            `${r.category}: ${r.status === "ok" ? `${r.papersAnalyzed} analyzed` : "error"}`
          )
          .join(" | ")
        setSyncLog(`Done. ${summary}`)
      } else {
        setSyncLog("Error: " + (result.error || "Failed"))
      }
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
        headers: { "Content-Type": "application/json", "x-admin-key": password },
        body: JSON.stringify({ requestId }),
      })
      const result = await res.json()
      if (result.success) {
        mutateRequests()
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

  // Bulk ingest from JSON file
  const handleIngest = async () => {
    if (!ingestFile) return
    setIsIngesting(true)
    setIngestLog([])
    setIngestProgress({ current: 0, total: 0, inserted: 0, updated: 0, errors: 0 })

    try {
      const text = await ingestFile.text()
      setIngestLog((prev) => [...prev, "Parsing JSON file..."])

      let allPapers: Record<string, unknown>[] = []
      const parsed = JSON.parse(text)

      // Support both array and object-with-categories format
      if (Array.isArray(parsed)) {
        allPapers = parsed
      } else if (typeof parsed === "object") {
        // Object keyed by category or with a "papers" field
        for (const key of Object.keys(parsed)) {
          const val = parsed[key]
          if (Array.isArray(val)) {
            allPapers.push(...val)
          }
        }
        if (allPapers.length === 0 && parsed.papers && Array.isArray(parsed.papers)) {
          allPapers = parsed.papers
        }
      }

      if (allPapers.length === 0) {
        setIngestLog((prev) => [...prev, "ERROR: No papers found in file. Expected an array or an object with category keys."])
        setIsIngesting(false)
        return
      }

      const batchSz = parseInt(ingestBatchSize) || 500
      const totalPapers = allPapers.length
      setIngestProgress((p) => ({ ...p, total: totalPapers }))
      setIngestLog((prev) => [...prev, `Found ${totalPapers.toLocaleString()} papers. Uploading in batches of ${batchSz}...`])

      let totalInserted = 0
      let totalUpdated = 0
      let totalErrors = 0

      for (let i = 0; i < totalPapers; i += batchSz) {
        const batch = allPapers.slice(i, i + batchSz)
        const batchNum = Math.floor(i / batchSz) + 1
        const totalBatches = Math.ceil(totalPapers / batchSz)

        try {
          const res = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-key": password },
            body: JSON.stringify({ papers: batch }),
          })

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData.error || `HTTP ${res.status}`)
          }

          const result = await res.json()
          totalInserted += result.inserted || 0
          totalUpdated += result.updated || 0
          totalErrors += result.errors || 0

          setIngestProgress({
            current: Math.min(i + batchSz, totalPapers),
            total: totalPapers,
            inserted: totalInserted,
            updated: totalUpdated,
            errors: totalErrors,
          })

          setIngestLog((prev) => [
            ...prev,
            `Batch ${batchNum}/${totalBatches}: +${result.inserted} new, ${result.updated} updated, ${result.errors} errors`,
          ])
        } catch (err) {
          totalErrors += batch.length
          setIngestProgress((p) => ({ ...p, current: Math.min(i + batchSz, totalPapers), errors: totalErrors }))
          setIngestLog((prev) => [...prev, `Batch ${batchNum}/${totalBatches} FAILED: ${String(err)}`])
        }
      }

      setIngestLog((prev) => [
        ...prev,
        `DONE: ${totalInserted.toLocaleString()} inserted, ${totalUpdated.toLocaleString()} updated, ${totalErrors} errors out of ${totalPapers.toLocaleString()} total.`,
      ])
    } catch (err) {
      setIngestLog((prev) => [...prev, `FATAL ERROR: ${String(err)}`])
    }
    setIsIngesting(false)
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
            <Button size="sm" variant="outline" onClick={() => { mutateRequests() }} disabled={statsLoading}>
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
            <TabsTrigger value="ingest" className="gap-1.5">
              <Database className="size-3.5" />
              Ingest JSON
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

          {/* ─── Ingest JSON Tab ──────────────────────────────── */}
          <TabsContent value="ingest" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bulk Paper Import</CardTitle>
                <CardDescription>
                  Upload a JSON file with papers. Supports arrays or objects keyed by category.
                  Papers are uploaded in batches to avoid timeout issues. For 191K+ papers, use batch size 500.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">JSON file</label>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={(e) => setIngestFile(e.target.files?.[0] || null)}
                      className="text-sm"
                    />
                  </div>
                  <div className="w-32">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Batch size</label>
                    <Input
                      type="number"
                      value={ingestBatchSize}
                      onChange={(e) => setIngestBatchSize(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleIngest} disabled={isIngesting || !ingestFile}>
                    {isIngesting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Database className="mr-1.5 size-4" />}
                    {isIngesting ? "Ingesting..." : "Start Import"}
                  </Button>
                </div>

                {ingestFile && !isIngesting && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {ingestFile.name} ({(ingestFile.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}

                {ingestProgress.total > 0 && (
                  <div className="space-y-2">
                    <Progress value={(ingestProgress.current / ingestProgress.total) * 100} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{ingestProgress.current.toLocaleString()} / {ingestProgress.total.toLocaleString()} papers</span>
                      <span className="flex items-center gap-3">
                        <span className="text-emerald-600">+{ingestProgress.inserted.toLocaleString()} new</span>
                        <span className="text-blue-600">{ingestProgress.updated.toLocaleString()} updated</span>
                        {ingestProgress.errors > 0 && <span className="text-red-600">{ingestProgress.errors} errors</span>}
                      </span>
                    </div>
                  </div>
                )}

                {ingestLog.length > 0 && (
                  <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
                    {ingestLog.map((line, i) => (
                      <div key={i} className={`py-0.5 ${line.startsWith("DONE") ? "font-bold text-emerald-600" : line.startsWith("FATAL") || line.includes("FAILED") ? "text-red-500" : "text-muted-foreground"}`}>
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── arXiv Sync Tab ────────────────────────────────── */}
          <TabsContent value="sync" className="space-y-4">
            {/* Quick-sync ranked categories */}
            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="size-4 text-amber-500" />
                  Sync Ranked Categories Now
                </CardTitle>
                <CardDescription>
                  Fetches the latest 100 papers for <strong>cs.AI, cs.AR, cs.CR</strong>, runs full AI analysis,
                  and computes the top-10 SOTA ranking for each. Takes ~5-10 minutes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleSync(["cs.AI", "cs.AR", "cs.CR"])}
                  disabled={isSyncing}
                  className="bg-amber-500 text-white hover:bg-amber-600"
                >
                  {isSyncing
                    ? <><Loader2 className="mr-1.5 size-4 animate-spin" />Syncing...</>
                    : <><Cloud className="mr-1.5 size-4" />Sync cs.AI + cs.AR + cs.CR</>}
                </Button>
                {syncLog && (
                  <div className="mt-3 flex items-start gap-2 rounded-md border bg-white px-3 py-2 text-sm">
                    {isSyncing
                      ? <Loader2 className="mt-0.5 size-3.5 animate-spin shrink-0" />
                      : <CheckCircle className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />}
                    <span className="text-muted-foreground">{syncLog}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Custom single-category sync */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sync Any Category</CardTitle>
                <CardDescription>
                  Fetch and analyze the latest 100 papers for any arXiv category.
                  The daily cron runs automatically at 02:00 UTC (Tue-Fri).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category (e.g. cs.LG)</label>
                    <Input
                      placeholder="cs.LG"
                      value={syncCategory}
                      onChange={(e) => setSyncCategory(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => handleSync()} disabled={isSyncing || !syncCategory.trim()} variant="outline">
                    {isSyncing ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Cloud className="mr-1.5 size-4" />}
                    {isSyncing ? "Syncing..." : "Sync"}
                  </Button>
                </div>
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
