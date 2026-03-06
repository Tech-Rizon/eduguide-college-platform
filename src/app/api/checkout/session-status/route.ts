import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 501 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')?.trim()

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  try {
    const stripe = new Stripe(stripeSecret)
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    return NextResponse.json({
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email ?? null,
      plan: session.metadata?.plan ?? null,
    })
  } catch (err: unknown) {
    console.error('Session status lookup error:', err)
    const message = err instanceof Error ? err.message : 'Unable to retrieve checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
