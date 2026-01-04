import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, plan } = body || {}

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY
    if (!stripeSecret) {
      return NextResponse.json({ error: 'Stripe secret key not configured' }, { status: 501 })
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2022-11-15' })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eduguide.online'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan || 'EduGuide Support',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/tutoring?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/tutoring?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
