import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { priceId, plan, referralCode } = body || {}

    const stripeSecret = process.env.STRIPE_SECRET_KEY
    if (!stripeSecret) {
      return NextResponse.json({ error: 'Stripe secret key not configured' }, { status: 501 })
    }

    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid priceId' }, { status: 400 })
    }

    const normalizedReferralCode =
      typeof referralCode === 'string' ? referralCode.trim().toUpperCase() : ''
    const validReferralCodes = (process.env.REFERRAL_CODES || 'EDUGUIDE30')
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean)
    const isReferralApplied = Boolean(
      normalizedReferralCode && validReferralCodes.includes(normalizedReferralCode),
    )
    const referralCouponId = process.env.STRIPE_REFERRAL_COUPON_ID

    if (normalizedReferralCode && !isReferralApplied) {
      return NextResponse.json({ error: 'Invalid referral code.' }, { status: 400 })
    }

    if (isReferralApplied && !referralCouponId) {
      return NextResponse.json(
        { error: 'Referral discount is not configured yet. Please contact support.' },
        { status: 501 },
      )
    }

    const stripe = new Stripe(stripeSecret)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eduguide.online'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      metadata: {
        plan: plan ?? '',
        referralCode: isReferralApplied ? normalizedReferralCode : '',
        referralDiscountPercent: isReferralApplied ? '30' : '0',
      },
      ...(isReferralApplied && referralCouponId
        ? {
            discounts: [{ coupon: referralCouponId }],
          }
        : {}),
      success_url: `${siteUrl}/tutoring/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/tutoring/canceled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
