import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/my-plan
 *
 * Returns the student's college shortlist and checklist items.
 * Requires Authorization: Bearer <token>.
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

  const userId = userData.user.id

  const [shortlistResult, checklistResult] = await Promise.all([
    sb
      .from('college_shortlist')
      .select('id, college_id, college_name, status, deadline, notes, added_at, updated_at')
      .eq('user_id', userId)
      .order('added_at', { ascending: false }),
    sb
      .from('college_checklist_items')
      .select('id, college_id, task, completed, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ])

  if (shortlistResult.error || checklistResult.error) {
    console.error('my-plan GET error:', shortlistResult.error || checklistResult.error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({
    shortlist: shortlistResult.data ?? [],
    checklist: checklistResult.data ?? [],
  })
}
