"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Mail, CreditCard, Shield } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <Button variant="outline" asChild>
            <Link href="/">Back to Papers</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            {user.full_name && (
              <div className="flex items-center gap-3">
                <User className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Full Name</p>
                  <p className="text-sm text-muted-foreground">{user.full_name}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <CreditCard className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">AI Analysis Credits</p>
                <p className="text-sm text-muted-foreground">
                  {user.credits} credits available for on-demand paper analysis
                </p>
              </div>
            </div>

            {user.is_admin && (
              <div className="flex items-center gap-3">
                <Shield className="size-4 text-emerald-600" />
                <div>
                  <Badge variant="default" className="bg-emerald-600">
                    Admin
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bookmarks</CardTitle>
            <CardDescription>Manage your saved papers</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/bookmarks">View My Bookmarks</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upgrade</CardTitle>
            <CardDescription>Get more credits for AI analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Free users can bookmark up to 5 papers for manual analysis. Upgrade to get more credits and
              instant AI-powered analysis for any paper.
            </p>
            <Button disabled>Coming Soon</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
