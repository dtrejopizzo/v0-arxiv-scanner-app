"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { PLANS } from "@/lib/plans"
import { createCheckoutSession, createPortalSession } from "@/app/actions/stripe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, Loader2, ExternalLink, Sparkles } from "lucide-react"
import Link from "next/link"

export default function BillingPage() {
  const { user, isAuthenticated, isLoading, refresh } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const success = searchParams.get("success")
  const canceled = searchParams.get("canceled")

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

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId)
    try {
      const result = await createCheckoutSession(planId)
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      console.error("Checkout error:", error)
    }
    setCheckoutLoading(null)
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const result = await createPortalSession()
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      console.error("Portal error:", error)
    }
    setPortalLoading(false)
  }

  const currentPlan = user?.plan || "free"
  const isEduEmail = user?.email?.includes(".edu") || false

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Plans</h1>
          <p className="text-sm text-muted-foreground">
            Manage your subscription and AI analysis credits
          </p>
        </div>
      </div>

      {success && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Check className="mr-2 inline size-4" />
          Subscription activated successfully! Your plan is now active.
        </div>
      )}

      {canceled && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout was canceled. No charges were made.
        </div>
      )}

      {/* Current plan summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Plan
            <Badge>{currentPlan === "free" ? "Free" : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</Badge>
          </CardTitle>
          <CardDescription>
            {currentPlan === "free"
              ? "You are on the free plan. Upgrade to get AI analysis credits."
              : `You have ${user?.dailyAnalysisLimit || 0} analyses per day.`}
          </CardDescription>
        </CardHeader>
        {currentPlan !== "free" && (
          <CardFooter>
            <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 size-4" />
              )}
              Manage Subscription
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Plans grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLANS.filter((p) => {
          // Hide EDU if not .edu email
          if (p.id === "edu" && !isEduEmail) return false
          // Don't show free as an upgrade option
          if (p.id === "free") return false
          return true
        }).map((plan) => {
          const isCurrent = currentPlan === plan.id
          const isUpgrade =
            PLANS.findIndex((p) => p.id === plan.id) >
            PLANS.findIndex((p) => p.id === currentPlan)

          return (
            <Card
              key={plan.id}
              className={`flex flex-col ${plan.highlighted ? "border-primary shadow-md" : ""} ${isCurrent ? "border-emerald-400 bg-emerald-50/50" : ""}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {plan.highlighted && !isCurrent && (
                    <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                  )}
                  {isCurrent && <Badge variant="outline" className="border-emerald-400 text-emerald-700">Current</Badge>}
                  {plan.requiresEdu && <Badge variant="secondary">Academic</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold text-foreground">{plan.priceDisplay.split("/")[0]}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(plan.id)}
                    disabled={checkoutLoading !== null}
                  >
                    {checkoutLoading === plan.id ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-4" />
                    )}
                    Upgrade to {plan.name}
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" onClick={handlePortal}>
                    Switch Plan
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
