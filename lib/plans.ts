export interface Plan {
  id: string
  name: string
  description: string
  priceMonthly: number // in cents
  priceDisplay: string
  analysesPerMonth: number
  dailyLimit: number
  features: string[]
  highlighted?: boolean
  requiresEdu?: boolean
  stripePriceId?: string // set after Stripe products are created
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with one free AI analysis",
    priceMonthly: 0,
    priceDisplay: "$0",
    analysesPerMonth: 1,
    dailyLimit: 0,
    features: [
      "Browse all papers & categories",
      "1 free AI analysis (welcome credit)",
      "Request analyses from admin",
      "Basic search & filters",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "For casual researchers and students",
    priceMonthly: 499,
    priceDisplay: "$4.99/mo",
    analysesPerMonth: 50,
    dailyLimit: 2,
    features: [
      "Everything in Free",
      "50 AI analyses per month",
      "Bookmark papers",
      "Daily notifications",
      "Priority analysis queue",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For active researchers and teams",
    priceMonthly: 1499,
    priceDisplay: "$14.99/mo",
    analysesPerMonth: 500,
    dailyLimit: 17,
    highlighted: true,
    features: [
      "Everything in Starter",
      "500 AI analyses per month",
      "SOTA rankings & insights",
      "Batch analysis requests",
      "Export analysis reports",
      "Priority support",
    ],
  },
  {
    id: "edu",
    name: "EDU",
    description: "Subsidized Pro plan for academic emails (.edu)",
    priceMonthly: 799,
    priceDisplay: "$7.99/mo",
    analysesPerMonth: 500,
    dailyLimit: 17,
    requiresEdu: true,
    features: [
      "All Pro features",
      "500 AI analyses per month",
      "Requires .edu email address",
      "Academic pricing - 47% off Pro",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For organizations and large research groups",
    priceMonthly: 4999,
    priceDisplay: "$49.99/mo",
    analysesPerMonth: 999999,
    dailyLimit: 1000,
    features: [
      "Everything in Pro",
      "Unlimited AI analyses",
      "API access (coming soon)",
      "Custom integrations",
      "Dedicated support",
      "Team management (coming soon)",
    ],
  },
]

export function getPlan(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId)
}

export function getPlanLimits(planId: string) {
  const plan = getPlan(planId)
  if (!plan) return { dailyLimit: 0, monthlyLimit: 1 }
  return {
    dailyLimit: plan.dailyLimit,
    monthlyLimit: plan.analysesPerMonth,
  }
}

export function isEduEmail(email: string): boolean {
  const lower = email.toLowerCase()
  return lower.includes(".edu")
}
