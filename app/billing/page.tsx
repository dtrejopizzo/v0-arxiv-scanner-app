"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { PLANS } from "@/lib/plans"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, Loader2, Sparkles, Lock } from "lucide-react"
import Link from "next/link"

export default function BillingPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

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
          <h1 className="text-2xl font-bold text-foreground">Plans & Billing</h1>
          <p className="text-sm text-muted-foreground">
            Manage your subscription and AI analysis credits
          </p>
        </div>
      </div>

      {/* Current plan summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Plan
            <Badge>{currentPlan === "free" ? "Free" : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</Badge>
          </CardTitle>
          <CardDescription>
            {currentPlan === "free"
              ? "You are on the free plan with 1 welcome AI analysis credit."
              : `You have up to ${PLANS.find((p) => p.id === currentPlan)?.dailyLimit || 0} analyses per day.`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Plans grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLANS.filter((p) => {
          if (p.id === "edu" && !isEduEmail) return false
          return true
        }).map((plan) => {
          const isCurrent = currentPlan === plan.id

          return (
            <Card
              key={plan.id}
              className={`flex flex-col ${plan.highlighted ? "border-primary shadow-md" : ""} ${isCurrent ? "border-emerald-400 bg-emerald-50/50" : ""}`}
            >
              {plan.highlighted && !isCurrent && (
                <div className="px-6 pt-4">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isCurrent && <Badge variant="outline" className="border-emerald-400 text-emerald-700">Current</Badge>}
                  {plan.requiresEdu && <Badge variant="secondary">Academic</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold text-foreground">
                    {plan.priceDisplay.includes("/") ? plan.priceDisplay.split("/")[0] : plan.priceDisplay}
                  </span>
                  {plan.priceMonthly > 0 && <span className="text-sm text-muted-foreground">/month</span>}
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
                ) : plan.id === "free" ? (
                  <Button variant="outline" className="w-full" disabled>
                    Free Tier
                  </Button>
                ) : (
                  <Button className="w-full" disabled>
                    <Lock className="mr-2 size-4" />
                    Coming Soon
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-6">
          <Sparkles className="size-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Stripe payments will be available soon. Contact the admin to upgrade your plan manually.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
