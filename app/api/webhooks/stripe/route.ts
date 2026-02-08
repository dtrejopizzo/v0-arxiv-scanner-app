import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db"
import { getPlanLimits } from "@/lib/plans"
import type Stripe from "stripe"

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = session.subscription as string
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const userId = sub.metadata.userId
        const planId = sub.metadata.planId || "starter"

        if (userId) {
          const limits = getPlanLimits(planId)

          // Create subscription record
          await sql`
            INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_price_id, plan, status, current_period_start, current_period_end)
            VALUES (
              ${userId},
              ${subscriptionId},
              ${sub.items.data[0]?.price?.id || ""},
              ${planId},
              'active',
              ${new Date(sub.current_period_start * 1000).toISOString()},
              ${new Date(sub.current_period_end * 1000).toISOString()}
            )
            ON CONFLICT (stripe_subscription_id) DO UPDATE SET
              plan = ${planId},
              status = 'active',
              current_period_start = ${new Date(sub.current_period_start * 1000).toISOString()},
              current_period_end = ${new Date(sub.current_period_end * 1000).toISOString()},
              updated_at = NOW()
          `

          // Update user plan
          await sql`
            UPDATE users SET
              plan = ${planId},
              daily_analysis_limit = ${limits.dailyLimit},
              updated_at = NOW()
            WHERE id = ${userId}
          `

          // Send notification
          await sql`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (
              ${userId},
              'subscription',
              'Subscription activated!',
              ${"Your " + planId.charAt(0).toUpperCase() + planId.slice(1) + " plan is now active. You can now analyze up to " + limits.monthlyLimit + " papers per month."}
            )
          `
        }
        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata.userId
        if (userId) {
          const status = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : sub.cancel_at_period_end ? "canceled" : "active"

          await sql`
            UPDATE subscriptions SET
              status = ${status},
              cancel_at_period_end = ${sub.cancel_at_period_end},
              current_period_end = ${new Date(sub.current_period_end * 1000).toISOString()},
              updated_at = NOW()
            WHERE stripe_subscription_id = ${sub.id}
          `
        }
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata.userId
        if (userId) {
          await sql`
            UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
            WHERE stripe_subscription_id = ${sub.id}
          `
          await sql`
            UPDATE users SET plan = 'free', daily_analysis_limit = 0, updated_at = NOW()
            WHERE id = ${userId}
          `
          await sql`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (${userId}, 'subscription', 'Subscription ended', 'Your subscription has been canceled. You are now on the Free plan.')
          `
        }
        break
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
