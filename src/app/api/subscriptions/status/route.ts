import { NextResponse } from 'next/server'
import { resolveAccess } from '@/lib/accessGate'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { supabaseServer: sb } = await import('@/lib/supabaseServer')

  const { data: userData, error: authError } = await sb.auth.getUser(token)
  if (authError || !userData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = userData.user.id

  // Run subscription fetch and access resolution in parallel
  const [subResult, access] = await Promise.all([
    sb
      .from('subscriptions')
      .select('plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    resolveAccess(userId, sb),
  ])

  return NextResponse.json({
    subscription: subResult.data ?? null,
    tier: access.tier,
    days_left: access.daysLeft,
    trial_started_at: access.trialStartedAt,
  })
}
