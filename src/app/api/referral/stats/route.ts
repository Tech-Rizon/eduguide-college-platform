import { NextResponse } from 'next/server'

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

  type ReferralRow = {
    id: string
    status: string
    referee_email: string | null
    reward_coupon_id: string | null
    reward_expires_at: string | null
    qualified_at: string | null
    rewarded_at: string | null
    converted_at: string | null
    created_at: string
  }

  const { data: rows, error } = await sb
    .from('referrals')
    .select(
      'id, status, referee_email, reward_coupon_id, reward_expires_at, qualified_at, rewarded_at, converted_at, created_at',
    )
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('referrals select error:', error)
    return NextResponse.json({ error: 'Could not load referral stats' }, { status: 500 })
  }

  const typedRows: ReferralRow[] = (rows ?? []) as ReferralRow[]
  const total = typedRows.length
  const converted = typedRows.filter(
    (r) => r.status === 'qualified' || r.status === 'rewarded',
  ).length

  // Active reward: most recent rewarded referral whose reward hasn't expired yet
  const now = new Date()
  const activeReward =
    typedRows
      .filter(
        (r) =>
          r.status === 'rewarded' &&
          r.reward_expires_at !== null &&
          new Date(r.reward_expires_at) > now,
      )
      .sort(
        (a, b) =>
          new Date(b.reward_expires_at!).getTime() - new Date(a.reward_expires_at!).getTime(),
      )[0] ?? null

  const rewardPercent = parseInt(process.env.REFERRAL_REWARD_PERCENT ?? '20', 10)

  // Partially mask referee emails for privacy in the dashboard
  const history = typedRows.map((r) => ({
    id: r.id,
    status: r.status,
    referee_email: r.referee_email
      ? r.referee_email.replace(/(?<=^.{3}).(?=.*@)/g, '*')
      : null,
    created_at: r.created_at,
    qualified_at: r.qualified_at,
    rewarded_at: r.rewarded_at,
    reward_expires_at: r.reward_expires_at,
  }))

  return NextResponse.json({
    totalReferrals: total,
    converted,
    activeReward: activeReward
      ? {
          discountPercent: rewardPercent,
          expiresAt: activeReward.reward_expires_at,
          couponId: activeReward.reward_coupon_id,
        }
      : null,
    history,
  })
}
