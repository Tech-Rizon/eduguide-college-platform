import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/referrals
 *
 * Admin-only endpoint. Returns paginated referral records with optional
 * status filtering. Requires super_admin staff level.
 *
 * Query params:
 *   status   — filter by status (pending|qualified|rewarded|reversed)
 *   page     — 1-based page number (default 1)
 *   limit    — rows per page (default 50, max 100)
 */
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

  // Verify super_admin role
  const { data: roleRow } = await sb
    .from('user_roles')
    .select('role, staff_level')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!roleRow || roleRow.role !== 'staff' || roleRow.staff_level !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const statusFilter = url.searchParams.get('status') || ''
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)))
  const offset = (page - 1) * limit

  type ReferralAdminRow = {
    id: string
    referrer_id: string
    referee_email: string | null
    code: string
    status: string
    stripe_session_id: string | null
    stripe_subscription_id: string | null
    reward_coupon_id: string | null
    reward_expires_at: string | null
    qualified_at: string | null
    rewarded_at: string | null
    converted_at: string | null
    created_at: string
  }

  let query = sb
    .from('referrals')
    .select(
      'id, referrer_id, referee_email, code, status, stripe_session_id, stripe_subscription_id, reward_coupon_id, reward_expires_at, qualified_at, rewarded_at, converted_at, created_at',
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const validStatuses = ['pending', 'qualified', 'rewarded', 'reversed', 'converted']
  if (statusFilter && validStatuses.includes(statusFilter)) {
    query = query.eq('status', statusFilter)
  }

  const { data: rows, error, count } = await query

  if (error) {
    console.error('admin/referrals select error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({
    referrals: (rows ?? []) as ReferralAdminRow[],
    page,
    limit,
    total: count ?? null,
  })
}
