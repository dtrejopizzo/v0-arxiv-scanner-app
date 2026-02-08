"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Loader2,
  Bell,
  BellOff,
  Check,
  Sparkles,
  CreditCard,
  AlertTriangle,
  Info,
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const typeIcons: Record<string, React.ReactNode> = {
  welcome: <Sparkles className="size-4 text-amber-500" />,
  analysis_complete: <Check className="size-4 text-emerald-500" />,
  daily_limit: <AlertTriangle className="size-4 text-amber-500" />,
  subscription: <CreditCard className="size-4 text-blue-500" />,
  system: <Info className="size-4 text-muted-foreground" />,
}

export default function NotificationsPage() {
  const { user, isAuthenticated, isLoading, refresh } = useAuth()
  const router = useRouter()
  const {
    data: notifications,
    isLoading: notifLoading,
    mutate,
  } = useSWR(isAuthenticated ? "/api/notifications" : null, fetcher)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    router.push("/")
    return null
  }

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" })
    mutate()
    refresh()
  }

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" })
    mutate()
    refresh()
  }

  const items = notifications?.notifications || []
  const unreadCount = items.filter((n: { read: boolean }) => !n.read).length

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="mr-1.5 size-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {notifLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <BellOff className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map(
            (notif: {
              id: string
              type: string
              title: string
              message: string
              read: boolean
              paper_id: string | null
              created_at: string
            }) => (
              <Card
                key={notif.id}
                className={`transition-colors ${!notif.read ? "border-primary/30 bg-primary/5" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{typeIcons[notif.type] || <Bell className="size-4" />}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">{notif.title}</CardTitle>
                        {!notif.read && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            New
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        {new Date(notif.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </CardDescription>
                    </div>
                    {!notif.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => markRead(notif.id)}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pl-11 pb-4">
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                  {notif.paper_id && (
                    <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" asChild>
                      <Link href={`/?paper=${notif.paper_id}`}>View paper</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  )
}
