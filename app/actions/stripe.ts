"use server"

import { stripe } from "@/lib/stripe"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { PLANS } from "@/lib/plans"

export async function createCheckoutSession(planId: string) {
  const session = await getSession()
  if (!session) throw new Error("Not authenticated")

  const plan = PLANS.find((p) => p.id === planId)
  if (!plan || plan.priceMonthly === 0) throw new Error("Invalid plan")

  // Ensure user has a Stripe customer
  let customerId = session.user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      name: session.user.fullName,
      metadata: { userId: session.user.id },
    })
    customerId = customer.id
    await sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${session.user.id}`
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `arXiv Scanner ${plan.name}`,
            description: plan.description,
          },
          unit_amount: plan.priceMonthly,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        userId: session.user.id,
        planId: plan.id,
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/billing?canceled=true`,
  })

  return { url: checkoutSession.url }
}

export async function createPortalSession() {
  const session = await getSession()
  if (!session) throw new Error("Not authenticated")

  const customerId = session.user.stripeCustomerId
  if (!customerId) throw new Error("No billing account found")

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/billing`,
  })

  return { url: portalSession.url }
}
