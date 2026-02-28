import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbClient = any
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

/**
 * Creates a pending referral record when checkout completes.
 * The actual reward (coupon) is issued later by the process-rewards cron
 * after the 14-day hold window elapses.
 */
async function createPendingReferral(
  sb: SbClient,
  referrerUserId: string,
  refereeEmail: string | null,
  code: string,
  stripeSessionId: string,
  stripeSubscriptionId: string | null,
) {
  await sb.from('referrals').upsert(
    {
      referrer_id: referrerUserId,
      referee_email: refereeEmail,
      code,
      status: 'pending',
      stripe_session_id: stripeSessionId,
      stripe_subscription_id: stripeSubscriptionId,
    },
    { onConflict: 'stripe_session_id' },
  )
}

async function upsertCheckoutRecoverySession(
  sb: SbClient,
  params: {
    sessionId: string
    sessionUrl?: string | null
    customerEmail?: string | null
    plan?: string | null
    priceId?: string | null
    referralCode?: string | null
    status: 'open' | 'completed' | 'expired'
    completedAt?: string | null
    expiredAt?: string | null
  },
) {
  const normalizedEmail =
    typeof params.customerEmail === 'string' ? params.customerEmail.trim().toLowerCase() : null

  let userId: string | null = null
  if (normalizedEmail) {
    const { data: profile } = await sb
      .from('user_profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()
    userId = profile?.id ?? null
  }

  await sb.from('checkout_recovery_sessions').upsert(
    {
      stripe_checkout_session_id: params.sessionId,
      stripe_checkout_url: params.sessionUrl ?? null,
      customer_email: normalizedEmail,
      user_id: userId,
      plan: params.plan ?? null,
      price_id: params.priceId ?? null,
      referral_code: params.referralCode ?? null,
      status: params.status,
      completed_at: params.completedAt ?? null,
      expired_at: params.expiredAt ?? null,
    },
    { onConflict: 'stripe_checkout_session_id' },
  )
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

      const subscriptionId =
        typeof fullSession.subscription === 'string'
          ? fullSession.subscription
          : (fullSession.subscription as Stripe.Subscription | null)?.id ?? null

      if (sb) {
        // Mark checkout recovery as completed
        try {
          await upsertCheckoutRecoverySession(sb, {
            sessionId: fullSession.id,
            sessionUrl: fullSession.url,
            customerEmail,
            plan,
            priceId,
            referralCode,
            status: 'completed',
            completedAt: new Date().toISOString(),
            expiredAt: null,
          })
        } catch (trackingErr) {
          console.error('Checkout recovery completion upsert error:', trackingErr)
        }

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
        if (subscriptionId) {
          try {
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
          } catch (subErr) {
            console.error('Subscription processing error:', subErr)
          }
        }

        // Create a PENDING referral — reward is issued after the 14-day hold via cron
        if (referrerUserId && referralCode) {
          try {
            await createPendingReferral(
              sb,
              referrerUserId,
              customerEmail,
              referralCode,
              fullSession.id,
              subscriptionId,
            )
          } catch (refErr) {
            console.error('Pending referral creation error:', refErr)
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // checkout.session.expired
    // -------------------------------------------------------------------------
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session
      if (sb) {
        try {
          await upsertCheckoutRecoverySession(sb, {
            sessionId: session.id,
            sessionUrl: session.url,
            customerEmail: session.customer_details?.email ?? null,
            plan: session.metadata?.plan ?? null,
            priceId: null,
            referralCode: session.metadata?.referralCode ?? null,
            status: 'expired',
            completedAt: null,
            expiredAt: new Date().toISOString(),
          })
        } catch (trackingErr) {
          console.error('Checkout recovery expiry upsert error:', trackingErr)
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
    // invoice.paid
    // - billing_reason='subscription_creation' → first invoice → mark referral
    //   as 'qualified' so the 14-day hold timer starts
    // - billing_reason='subscription_cycle'/'subscription_update' → renewal
    // -------------------------------------------------------------------------
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice
      const invoiceRaw = invoice as unknown as Record<string, unknown>
      const rawParent = invoiceRaw['parent'] as Record<string, unknown> | undefined
      const rawSubDetails = rawParent?.['subscription_details'] as Record<string, unknown> | undefined
      const subId: string | null =
        typeof rawSubDetails?.['subscription'] === 'string'
          ? rawSubDetails['subscription']
          : typeof invoiceRaw['subscription'] === 'string'
          ? (invoiceRaw['subscription'] as string)
          : null

      const billingReason = (invoiceRaw['billing_reason'] as string | undefined) ?? ''
      const isFirstInvoice = billingReason === 'subscription_creation'
      const isRenewal = billingReason === 'subscription_cycle' || billingReason === 'subscription_update'

      // First invoice → start the 14-day referral hold timer
      if (isFirstInvoice && subId && sb) {
        try {
          await sb
            .from('referrals')
            .update({ status: 'qualified', qualified_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subId)
            .eq('status', 'pending')
        } catch (err) {
          console.error('referrals qualified update error:', err)
        }
      }

      // Renewals → record payment row
      if (isRenewal && sb) {
        try {
          const customerEmail =
            typeof invoiceRaw['customer_email'] === 'string' ? invoiceRaw['customer_email'] : null
          const amountPaid =
            typeof invoiceRaw['amount_paid'] === 'number' ? invoiceRaw['amount_paid'] : null
          const currency =
            typeof invoiceRaw['currency'] === 'string' ? invoiceRaw['currency'] : null

          await sb.from('payments').insert([
            {
              session_id: invoice.id,
              customer_email: customerEmail,
              amount: amountPaid,
              currency,
              payment_status: 'paid',
              price_id: null,
              plan: subId ?? null,
              metadata: { stripe_subscription_id: subId, billing_reason: billingReason },
            },
          ])
        } catch (err) {
          console.error('invoice.paid renewal insert error:', err)
        }
      }
    }

    // -------------------------------------------------------------------------
    // invoice.payment_failed → mark subscription past_due
    // -------------------------------------------------------------------------
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
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

    // -------------------------------------------------------------------------
    // charge.refunded — if within 14-day hold window, reverse the referral
    // so the reward is never issued by the cron
    // -------------------------------------------------------------------------
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const chargeRaw = charge as unknown as Record<string, unknown>
      // The subscription ID can be inferred via payment_intent → invoice → subscription
      // but it is not directly on charge. Use customer ID to find the subscription.
      const customerId =
        typeof chargeRaw['customer'] === 'string'
          ? chargeRaw['customer']
          : (chargeRaw['customer'] as Record<string, unknown> | null)?.['id'] as string | undefined
          ?? null

      if (customerId && sb) {
        try {
          // Find the subscription(s) for this customer
          const { data: subs } = await sb
            .from('subscriptions')
            .select('stripe_subscription_id')
            .eq('stripe_customer_id', customerId)

          const subIds: string[] = (subs ?? []).map(
            (s: Record<string, unknown>) => s['stripe_subscription_id'] as string,
          ).filter(Boolean)

          if (subIds.length > 0) {
            const holdWindowAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
            // Reverse any qualified referrals that are still in the hold window
            await sb
              .from('referrals')
              .update({ status: 'reversed' })
              .in('stripe_subscription_id', subIds)
              .eq('status', 'qualified')
              .gte('qualified_at', holdWindowAgo)
          }
        } catch (err) {
          console.error('charge.refunded referral reversal error:', err)
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
