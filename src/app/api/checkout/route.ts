import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, plan, priceId } = body || {}

    const stripeSecret = process.env.STRIPE_SECRET_KEY
    if (!stripeSecret) {
      return NextResponse.json({ error: 'Stripe secret key not configured' }, { status: 501 })
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2022-11-15' })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eduguide.online'

    // If a Stripe Price ID is provided, prefer that (recommended). Otherwise fall back to inline price_data.
    const lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : amount && typeof amount === 'number'
      ? {
          price_data: {
            currency: 'usd',
            product_data: { name: plan || 'EduGuide Support' },
            unit_amount: amount,
          },
          quantity: 1,
        }
      : null

    if (!lineItem) {
      return NextResponse.json({ error: 'Missing priceId or amount' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [lineItem as any],
      mode: 'payment',
      success_url: `${siteUrl}/tutoring/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/tutoring/canceled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
