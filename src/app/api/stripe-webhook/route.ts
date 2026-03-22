import { after, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbClient = any

function normalizeEmail(email: string | null | undefined): string | null {
  if (typeof email !== 'string') return null

  const normalized = email.trim().toLowerCase()
  return normalized || null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runSupabase(operation: Promise<any>): Promise<any> {
  const result = await operation

  if (result && typeof result === 'object' && 'error' in result && result.error) {
    throw result.error
  }

  return result
}

async function findUserIdByEmail(sb: SbClient, email: string): Promise<string | null> {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null

  const { data: profile } = await runSupabase(
    sb.from('user_profiles').select('id').eq('email', normalizedEmail).maybeSingle(),
  )

  return profile?.id ?? null
}

async function upsertSubscriptionFromEvent(
  sb: SbClient,
  sub: Stripe.Subscription,
  options: {
    userId?: string
    plan?: string
  } = {},
) {
  const row: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    stripe_customer_id:
      typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
    status: sub.status,
    current_period_end: new Date(
      (sub as unknown as { current_period_end: number }).current_period_end * 1000,
    ).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    price_id: sub.items?.data?.[0]?.price?.id ?? null,
  }

  if (options.userId) {
    row.user_id = options.userId
  }

  const plan = options.plan ?? sub.metadata?.plan
  if (plan) {
    row.plan = plan
  }

  await runSupabase(
    sb.from('subscriptions').upsert(row, { onConflict: 'stripe_subscription_id' }),
  )
}

async function upsertSubscriptionLink(
  sb: SbClient,
  subscriptionId: string,
  options: {
    userId?: string
    plan?: string
  } = {},
) {
  const row: Record<string, unknown> = {
    stripe_subscription_id: subscriptionId,
  }

  if (options.userId) {
    row.user_id = options.userId
  }

  if (options.plan) {
    row.plan = options.plan
  }

  await runSupabase(
    sb.from('subscriptions').upsert(row, { onConflict: 'stripe_subscription_id' }),
  )
}

async function createPendingReferral(
  sb: SbClient,
  referrerUserId: string,
  refereeEmail: string | null,
  code: string,
  stripeSessionId: string,
  stripeSubscriptionId: string | null,
) {
  await runSupabase(
    sb.from('referrals').upsert(
      {
        referrer_id: referrerUserId,
        referee_email: refereeEmail,
        code,
        status: 'pending',
        stripe_session_id: stripeSessionId,
        stripe_subscription_id: stripeSubscriptionId,
      },
      { onConflict: 'stripe_session_id' },
    ),
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
  const normalizedEmail = normalizeEmail(params.customerEmail)
  const userId = normalizedEmail ? await findUserIdByEmail(sb, normalizedEmail) : null

  const row: Record<string, unknown> = {
    stripe_checkout_session_id: params.sessionId,
    customer_email: normalizedEmail,
    user_id: userId,
    status: params.status,
  }

  if (params.sessionUrl !== undefined) {
    row.stripe_checkout_url = params.sessionUrl
  }

  if (params.plan !== undefined) {
    row.plan = params.plan
  }

  if (params.priceId !== undefined) {
    row.price_id = params.priceId
  }

  if (params.referralCode !== undefined) {
    row.referral_code = params.referralCode
  }

  if (params.completedAt !== undefined) {
    row.completed_at = params.completedAt
  }

  if (params.expiredAt !== undefined) {
    row.expired_at = params.expiredAt
  }

  await runSupabase(
    sb.from('checkout_recovery_sessions').upsert(row, {
      onConflict: 'stripe_checkout_session_id',
    }),
  )
}

async function processCheckoutCompleted(sb: SbClient, session: Stripe.Checkout.Session) {
  const customerEmail = normalizeEmail(session.customer_details?.email ?? null)
  const amountTotal = session.amount_total ?? null
  const currency = session.currency ?? null
  const paymentStatus = session.payment_status ?? null
  const plan = session.metadata?.plan ?? null
  const referralCode = session.metadata?.referralCode ?? ''
  const referrerUserId = session.metadata?.referrerUserId ?? ''
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as Stripe.Subscription | null)?.id ?? null

  let userId: string | null = null
  if (customerEmail) {
    try {
      userId = await findUserIdByEmail(sb, customerEmail)
    } catch (err) {
      console.error('Stripe webhook user lookup error:', err)
    }
  }

  try {
    await upsertCheckoutRecoverySession(sb, {
      sessionId: session.id,
      sessionUrl: session.url,
      customerEmail,
      plan,
      referralCode,
      status: 'completed',
      completedAt: new Date().toISOString(),
      expiredAt: null,
    })
  } catch (trackingErr) {
    console.error('Checkout recovery completion upsert error:', trackingErr)
  }

  try {
    await runSupabase(
      sb.from('payments').upsert(
        [
          {
            session_id: session.id,
            customer_email: customerEmail,
            amount: amountTotal,
            currency,
            payment_status: paymentStatus,
            price_id: null,
            plan,
            metadata: session.metadata,
          },
        ],
        { onConflict: 'session_id' },
      ),
    )
  } catch (dbErr) {
    console.error('Supabase payments upsert error:', dbErr)
  }

  if (subscriptionId) {
    try {
      await upsertSubscriptionLink(sb, subscriptionId, {
        userId: userId ?? undefined,
        plan: plan ?? undefined,
      })
    } catch (subErr) {
      console.error('Subscription link upsert error:', subErr)
    }
  }

  if (referrerUserId && referralCode) {
    try {
      await createPendingReferral(
        sb,
        referrerUserId,
        customerEmail,
        referralCode,
        session.id,
        subscriptionId,
      )
    } catch (refErr) {
      console.error('Pending referral creation error:', refErr)
    }
  }
}

async function processCheckoutExpired(sb: SbClient, session: Stripe.Checkout.Session) {
  try {
    await upsertCheckoutRecoverySession(sb, {
      sessionId: session.id,
      sessionUrl: session.url,
      customerEmail: session.customer_details?.email ?? null,
      plan: session.metadata?.plan ?? null,
      referralCode: session.metadata?.referralCode ?? null,
      status: 'expired',
      completedAt: null,
      expiredAt: new Date().toISOString(),
    })
  } catch (trackingErr) {
    console.error('Checkout recovery expiry upsert error:', trackingErr)
  }
}

async function processInvoicePaid(sb: SbClient, invoice: Stripe.Invoice) {
  const invoiceRaw = invoice as unknown as Record<string, unknown>
  const rawParent = invoiceRaw.parent as Record<string, unknown> | undefined
  const rawSubDetails = rawParent?.subscription_details as
    | Record<string, unknown>
    | undefined

  const subId: string | null =
    typeof rawSubDetails?.subscription === 'string'
      ? rawSubDetails.subscription
      : typeof invoiceRaw.subscription === 'string'
        ? (invoiceRaw.subscription as string)
        : null

  const billingReason = (invoiceRaw.billing_reason as string | undefined) ?? ''
  const isFirstInvoice = billingReason === 'subscription_creation'
  const isRenewal =
    billingReason === 'subscription_cycle' || billingReason === 'subscription_update'

  if (isFirstInvoice && subId) {
    try {
      await runSupabase(
        sb
          .from('referrals')
          .update({ status: 'qualified', qualified_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subId)
          .eq('status', 'pending'),
      )
    } catch (err) {
      console.error('Referrals qualified update error:', err)
    }
  }

  if (isRenewal) {
    try {
      const customerEmail =
        typeof invoiceRaw.customer_email === 'string' ? invoiceRaw.customer_email : null
      const amountPaid =
        typeof invoiceRaw.amount_paid === 'number' ? invoiceRaw.amount_paid : null
      const currency =
        typeof invoiceRaw.currency === 'string' ? invoiceRaw.currency : null

      await runSupabase(
        sb.from('payments').upsert(
          [
            {
              session_id: invoice.id,
              customer_email: customerEmail,
              amount: amountPaid,
              currency,
              payment_status: 'paid',
              price_id: null,
              plan: subId ?? null,
              metadata: {
                stripe_subscription_id: subId,
                billing_reason: billingReason,
              },
            },
          ],
          { onConflict: 'session_id' },
        ),
      )
    } catch (err) {
      console.error('Invoice.paid renewal upsert error:', err)
    }
  }
}

async function processInvoicePaymentFailed(sb: SbClient, invoice: Stripe.Invoice) {
  const invoiceRaw = invoice as unknown as Record<string, unknown>
  const rawSub = (invoiceRaw.parent as Record<string, unknown> | undefined)
    ?.subscription_details as Record<string, unknown> | undefined

  const subId: string | null =
    typeof rawSub?.subscription === 'string'
      ? rawSub.subscription
      : typeof invoiceRaw.subscription === 'string'
        ? (invoiceRaw.subscription as string)
        : null

  if (!subId) return

  try {
    await runSupabase(
      sb.from('subscriptions').update({ status: 'past_due' }).eq('stripe_subscription_id', subId),
    )
  } catch (err) {
    console.error('Subscriptions past_due update error:', err)
  }
}

async function processChargeRefunded(sb: SbClient, charge: Stripe.Charge) {
  const chargeRaw = charge as unknown as Record<string, unknown>
  const customerId =
    typeof chargeRaw.customer === 'string'
      ? chargeRaw.customer
      : ((chargeRaw.customer as Record<string, unknown> | null)?.id as
          | string
          | undefined) ?? null

  if (!customerId) return

  try {
    const { data: subs } = await runSupabase(
      sb
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('stripe_customer_id', customerId),
    )

    const subIds: string[] = (subs ?? [])
      .map((sub: Record<string, unknown>) => sub.stripe_subscription_id as string)
      .filter(Boolean)

    if (subIds.length === 0) return

    const holdWindowAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    await runSupabase(
      sb
        .from('referrals')
        .update({ status: 'reversed' })
        .in('stripe_subscription_id', subIds)
        .eq('status', 'qualified')
        .gte('qualified_at', holdWindowAgo),
    )
  } catch (err) {
    console.error('Charge.refunded referral reversal error:', err)
  }
}

async function processStripeWebhookEvent(event: Stripe.Event) {
  const sb = supabaseServer

  if (event.type === 'checkout.session.completed') {
    await processCheckoutCompleted(sb, event.data.object as Stripe.Checkout.Session)
    return
  }

  if (event.type === 'checkout.session.expired') {
    await processCheckoutExpired(sb, event.data.object as Stripe.Checkout.Session)
    return
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    try {
      await upsertSubscriptionFromEvent(sb, event.data.object as Stripe.Subscription)
    } catch (err) {
      console.error(`Subscription sync error for ${event.type}:`, err)
    }
    return
  }

  if (event.type === 'invoice.paid') {
    await processInvoicePaid(sb, event.data.object as Stripe.Invoice)
    return
  }

  if (event.type === 'invoice.payment_failed') {
    await processInvoicePaymentFailed(sb, event.data.object as Stripe.Invoice)
    return
  }

  if (event.type === 'charge.refunded') {
    await processChargeRefunded(sb, event.data.object as Stripe.Charge)
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
  const signature = request.headers.get('stripe-signature') || ''
  const stripe = new Stripe(stripeSecret)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  after(async () => {
    try {
      await processStripeWebhookEvent(event)
    } catch (err) {
      console.error(`Unhandled Stripe webhook error for ${event.type} (${event.id}):`, err)
    }
  })

  return NextResponse.json({ received: true })
}
