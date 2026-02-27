import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

type SbClient = Awaited<ReturnType<typeof import('@/lib/supabaseServer')['supabaseServer']['from']>> extends never
  ? never
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : any

let _sb: SbClient | null = null
function getSupabaseServer(): SbClient | null {
  if (_sb) return _sb
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { supabaseServer } = require('@/lib/supabaseServer')
    _sb = supabaseServer
    return _sb
  } catch (err) {
    console.error('Failed to load Supabase server client:', err)
    return null
  }
}

async function upsertSubscription(
  sb: SbClient,
  stripe: Stripe,
  subscriptionId: string,
  userId: string | null,
  plan: string | null,
) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  await sb.from('subscriptions').upsert(
    {
      stripe_subscription_id: sub.id,
      stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
      user_id: userId,
      plan: plan ?? sub.metadata?.plan ?? null,
      status: sub.status,
      current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      price_id: sub.items?.data?.[0]?.price?.id ?? null,
    },
    { onConflict: 'stripe_subscription_id' },
  )
}

async function issueReferralReward(
  sb: SbClient,
  stripe: Stripe,
  referrerUserId: string,
  refereeEmail: string | null,
  refereeUserId: string | null,
  code: string,
  stripeSessionId: string,
) {
  const rewardPercent = parseInt(process.env.REFERRAL_REWARD_PERCENT ?? '20', 10)
  const rewardMonths = parseInt(process.env.REFERRAL_REWARD_MONTHS ?? '3', 10)

  // Create a Stripe coupon for the referrer
  let couponId: string | null = null
  let expiresAt: string | null = null
  try {
    const coupon = await stripe.coupons.create({
      percent_off: rewardPercent,
      duration: 'repeating',
      duration_in_months: rewardMonths,
      max_redemptions: 1,
      metadata: { referrer_user_id: referrerUserId, type: 'referral_reward' },
    })
    couponId = coupon.id
    const exp = new Date()
    exp.setMonth(exp.getMonth() + rewardMonths)
    expiresAt = exp.toISOString()
  } catch (err) {
    console.error('Failed to create referral reward coupon:', err)
  }

  // Upsert referral record
  await sb.from('referrals').upsert(
    {
      referrer_id: referrerUserId,
      referee_email: refereeEmail,
      referee_user_id: refereeUserId,
      code,
      status: couponId ? 'rewarded' : 'converted',
      stripe_session_id: stripeSessionId,
      reward_coupon_id: couponId,
      reward_expires_at: expiresAt,
      converted_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_session_id' },
  )

  // Apply coupon to referrer's active subscription if possible
  if (couponId) {
    try {
      const { data: referrerSub } = await sb
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', referrerUserId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (referrerSub?.stripe_subscription_id) {
        await stripe.subscriptions.update(referrerSub.stripe_subscription_id, {
          discounts: [{ coupon: couponId }],
        })
      }
    } catch (err) {
      console.error('Failed to apply referral coupon to referrer subscription:', err)
    }
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeSecret = process.env.STRIPE_SECRET_KEY

  if (!webhookSecret || !stripeSecret) {
    console.error('Stripe webhook or secret key not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 501 })
  }

  const payload = await request.text()
  const sig = request.headers.get('stripe-signature') || ''
  const stripe = new Stripe(stripeSecret)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const sb = getSupabaseServer()

    // -------------------------------------------------------------------------
    // checkout.session.completed
    // -------------------------------------------------------------------------
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items'],
      })

      const customerEmail = fullSession.customer_details?.email ?? null
      const amountTotal = fullSession.amount_total ?? null
      const currency = fullSession.currency ?? null
      const paymentStatus = fullSession.payment_status ?? null
      const priceId = fullSession.line_items?.data?.[0]?.price?.id ?? null
      const plan = fullSession.metadata?.plan ?? null
      const referralCode = fullSession.metadata?.referralCode ?? ''
      const referrerUserId = fullSession.metadata?.referrerUserId ?? ''

      if (sb) {
        // Record payment
        try {
          await sb.from('payments').insert([
            {
              session_id: fullSession.id,
              customer_email: customerEmail,
              amount: amountTotal,
              currency,
              payment_status: paymentStatus,
              price_id: priceId,
              plan,
              metadata: fullSession.metadata,
            },
          ])
        } catch (dbErr) {
          console.error('Supabase payments insert error:', dbErr)
        }

        // Record subscription
        const subscriptionId =
          typeof fullSession.subscription === 'string'
            ? fullSession.subscription
            : (fullSession.subscription as Stripe.Subscription | null)?.id ?? null

        if (subscriptionId) {
          try {
            // Resolve user_id from email
            let userId: string | null = null
            if (customerEmail) {
              const { data: profile } = await sb
                .from('user_profiles')
                .select('id')
                .eq('email', customerEmail)
                .maybeSingle()
              userId = profile?.id ?? null
            }
            await upsertSubscription(sb, stripe, subscriptionId, userId, plan)

            // Issue referral reward if this checkout used a user-specific code
            if (referrerUserId && referralCode) {
              await issueReferralReward(
                sb,
                stripe,
                referrerUserId,
                customerEmail,
                null,
                referralCode,
                fullSession.id,
              )
            }
          } catch (subErr) {
            console.error('Subscription/referral processing error:', subErr)
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // customer.subscription.updated
    // -------------------------------------------------------------------------
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription
      if (sb) {
        try {
          await sb
            .from('subscriptions')
            .update({
              status: sub.status,
              current_period_end: new Date(
                (sub as unknown as { current_period_end: number }).current_period_end * 1000,
              ).toISOString(),
              cancel_at_period_end: sub.cancel_at_period_end,
            })
            .eq('stripe_subscription_id', sub.id)
        } catch (err) {
          console.error('subscriptions update error:', err)
        }
      }
    }

    // -------------------------------------------------------------------------
    // customer.subscription.deleted
    // -------------------------------------------------------------------------
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      if (sb) {
        try {
          await sb
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('stripe_subscription_id', sub.id)
        } catch (err) {
          console.error('subscriptions canceled update error:', err)
        }
      }
    }

    // -------------------------------------------------------------------------
    // invoice.payment_failed
    // -------------------------------------------------------------------------
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      // In Stripe API v2 the subscription ref lives under parent.subscription_details.subscription
      // Fall back to the raw object for backwards compatibility
      const invoiceRaw = invoice as unknown as Record<string, unknown>
      const rawSub =
        (invoiceRaw['parent'] as Record<string, unknown> | undefined)
          ?.['subscription_details'] as Record<string, unknown> | undefined
      const subId: string | null =
        typeof rawSub?.['subscription'] === 'string'
          ? rawSub['subscription']
          : typeof invoiceRaw['subscription'] === 'string'
          ? (invoiceRaw['subscription'] as string)
          : null
      if (subId && sb) {
        try {
          await sb
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subId)
        } catch (err) {
          console.error('subscriptions past_due update error:', err)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook handler error'
    console.error('Error handling webhook:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
