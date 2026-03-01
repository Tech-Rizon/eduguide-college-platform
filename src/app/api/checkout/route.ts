import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

type CheckoutPlanKey = 'basic' | 'premium' | 'elite'

function isCheckoutPlanKey(value: unknown): value is CheckoutPlanKey {
  return value === 'basic' || value === 'premium' || value === 'elite'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { priceId, plan, planKey, referralCode, userEmail } = body || {}

    const stripeSecret = process.env.STRIPE_SECRET_KEY
    if (!stripeSecret) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 501 })
    }

    const configuredPriceIds: Record<CheckoutPlanKey, string | undefined> = {
      basic: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC,
      premium: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM,
      elite: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE,
    }
    const allowedPriceIds = Object.values(configuredPriceIds).filter(
      (value): value is string => Boolean(value),
    )

    if (allowedPriceIds.length === 0) {
      return NextResponse.json({ error: 'Stripe prices are not configured' }, { status: 501 })
    }

    if (planKey !== undefined && !isCheckoutPlanKey(planKey)) {
      return NextResponse.json({ error: 'Invalid plan selection' }, { status: 400 })
    }

    const resolvedPriceId = isCheckoutPlanKey(planKey)
      ? configuredPriceIds[planKey]
      : typeof priceId === 'string'
        ? priceId
        : undefined

    if (!resolvedPriceId) {
      return NextResponse.json(
        { error: 'That subscription plan is not configured yet. Please contact support.' },
        { status: 501 },
      )
    }

    if (!allowedPriceIds.includes(resolvedPriceId)) {
      return NextResponse.json({ error: 'Invalid priceId' }, { status: 400 })
    }

    const normalizedCode =
      typeof referralCode === 'string' ? referralCode.trim().toLowerCase() : ''

    // --- Referral validation ---
    // 1. Check global env var codes (e.g. EDUGUIDE30 → case-insensitive)
    const globalCodes = (process.env.REFERRAL_CODES || 'EDUGUIDE30')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)
    const isGlobalCode = Boolean(
      normalizedCode && globalCodes.includes(normalizedCode.toUpperCase()),
    )

    // 2. Check per-user referral codes in DB
    let referrerUserId: string | null = null
    let isUserCode = false

    if (normalizedCode && !isGlobalCode) {
      const { supabaseServer: sb } = await import('@/lib/supabaseServer')
      const { data: refRow } = await sb
        .from('referral_codes')
        .select('user_id')
        .eq('code', normalizedCode)
        .maybeSingle()
      if (refRow?.user_id) {
        isUserCode = true
        referrerUserId = refRow.user_id
      }
    }

    const isReferralApplied = isGlobalCode || isUserCode
    const referralCouponId = process.env.STRIPE_REFERRAL_COUPON_ID

    if (normalizedCode && !isReferralApplied) {
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
    const normalizedUserEmail =
      typeof userEmail === 'string' && userEmail.includes('@')
        ? userEmail.trim().toLowerCase()
        : null

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      mode: 'subscription',
      ...(normalizedUserEmail ? { customer_email: normalizedUserEmail } : {}),
      subscription_data: {
        metadata: {
          plan: plan ?? '',
          referralCode: isReferralApplied ? normalizedCode : '',
          referrerUserId: referrerUserId ?? '',
        },
      },
      metadata: {
        plan: plan ?? '',
        referralCode: isReferralApplied ? normalizedCode : '',
        referralDiscountPercent: isReferralApplied ? '30' : '0',
        referrerUserId: referrerUserId ?? '',
      },
      ...(isReferralApplied && referralCouponId
        ? { discounts: [{ coupon: referralCouponId }] }
        : {}),
      success_url: `${siteUrl}/tutoring/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/tutoring/canceled`,
    })

    try {
      const { supabaseServer: sb } = await import('@/lib/supabaseServer')
      let resolvedUserId: string | null = null

      if (normalizedUserEmail) {
        const { data: profile } = await sb
          .from('user_profiles')
          .select('id')
          .eq('email', normalizedUserEmail)
          .maybeSingle()
        resolvedUserId = profile?.id ?? null
      }

      await sb.from('checkout_recovery_sessions').upsert(
        {
          stripe_checkout_session_id: session.id,
          stripe_checkout_url: session.url,
          customer_email: normalizedUserEmail,
          user_id: resolvedUserId,
          plan: plan ?? null,
          price_id: resolvedPriceId,
          referral_code: isReferralApplied ? normalizedCode : null,
          status: 'open',
          completed_at: null,
          expired_at: null,
        },
        { onConflict: 'stripe_checkout_session_id' },
      )
    } catch (trackingErr) {
      console.error('Checkout recovery tracking insert error:', trackingErr)
    }

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('Stripe checkout error:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
