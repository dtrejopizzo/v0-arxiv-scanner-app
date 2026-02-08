import { NextResponse } from "next/server"

// Stripe webhook handler - will be configured when Stripe is set up
export async function POST() {
  return NextResponse.json(
    { error: "Stripe is not configured yet" },
    { status: 503 }
  )
}
