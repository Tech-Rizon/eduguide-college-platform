import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/internal/referral/process-rewards
 *
 * Daily cron job (Vercel). Finds referrals that have passed the 14-day
 * anti-abuse hold, issues a Stripe coupon to the referrer, applies it to
 * their active subscription (if any), and marks the referral as 'rewarded'.
 *
 * Protected by CRON_SECRET to prevent unauthorised triggering.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 501 })
  }

  const authHeader = request.headers.get('Authorization') || ''
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 501 })
  }

  const { supabaseServer: sb } = await import('@/lib/supabaseServer')
  const stripe = new Stripe(stripeSecret)

  const rewardPercent = parseInt(process.env.REFERRAL_REWARD_PERCENT ?? '20', 10)
  const rewardMonths = parseInt(process.env.REFERRAL_REWARD_MONTHS ?? '3', 10)

  // Find qualified referrals whose 14-day hold has elapsed (and not yet rewarded/reversed)
  const holdWindowCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  type QualifiedReferral = {
    id: string
    referrer_id: string
    referee_email: string | null
    code: string
    stripe_session_id: string | null
  }

  const { data: candidates, error } = await sb
    .from('referrals')
    .select('id, referrer_id, referee_email, code, stripe_session_id')
    .eq('status', 'qualified')
    .lte('qualified_at', holdWindowCutoff)
    .limit(50) // process up to 50 per run to stay within cron timeout

  if (error) {
    console.error('process-rewards: referrals select error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const rows = (candidates ?? []) as QualifiedReferral[]
  let rewarded = 0
  let failed = 0

  for (const row of rows) {
    try {
      const exp = new Date()
      exp.setMonth(exp.getMonth() + rewardMonths)

      // Create a single-use coupon for the referrer
      const coupon = await stripe.coupons.create({
        percent_off: rewardPercent,
        duration: 'repeating',
        duration_in_months: rewardMonths,
        max_redemptions: 1,
        metadata: {
          referrer_user_id: row.referrer_id,
          referral_id: row.id,
          type: 'referral_reward',
        },
      })

      // Apply coupon to the referrer's active subscription if one exists
      const { data: referrerSub } = await sb
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', row.referrer_id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (referrerSub?.stripe_subscription_id) {
        try {
          await stripe.subscriptions.update(referrerSub.stripe_subscription_id, {
            discounts: [{ coupon: coupon.id }],
          })
        } catch (applyErr) {
          console.error(`process-rewards: failed to apply coupon to subscription ${referrerSub.stripe_subscription_id}:`, applyErr)
        }
      }

      // Mark as rewarded
      await sb
        .from('referrals')
        .update({
          status: 'rewarded',
          reward_coupon_id: coupon.id,
          reward_expires_at: exp.toISOString(),
          rewarded_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      rewarded++
    } catch (err) {
      console.error(`process-rewards: failed for referral ${row.id}:`, err)
      failed++
    }
  }

  console.log(`process-rewards: rewarded=${rewarded} failed=${failed} total_candidates=${rows.length}`)
  return NextResponse.json({ rewarded, failed, total: rows.length })
}
