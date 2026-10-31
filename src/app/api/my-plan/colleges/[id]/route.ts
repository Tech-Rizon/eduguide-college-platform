import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = [
  'planning',
  'applying',
  'submitted',
  'accepted',
  'rejected',
  'waitlisted',
  'enrolled',
]

/**
 * PATCH /api/my-plan/colleges/[id]
 *
 * Updates status, notes, or deadline on a shortlist entry.
 * Only the authenticated owner can update their own rows.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

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

  let body: { status?: unknown; notes?: unknown; deadline?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    updates.status = body.status
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes === null ? null : String(body.notes).slice(0, 2000)
  }

  if (body.deadline !== undefined) {
    updates.deadline = body.deadline === null || body.deadline === '' ? null : String(body.deadline)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await sb
    .from('college_shortlist')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('college_shortlist PATCH error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/my-plan/colleges/[id]
 *
 * Removes a college from the shortlist and deletes its checklist items.
 * Only the authenticated owner can delete their own rows.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

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

  // Fetch college_id to clean up checklist items
  const { data: row } = await sb
    .from('college_shortlist')
    .select('college_id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Delete checklist items for this college
  await sb
    .from('college_checklist_items')
    .delete()
    .eq('user_id', userId)
    .eq('college_id', row.college_id)

  // Delete the shortlist entry
  const { error } = await sb
    .from('college_shortlist')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('college_shortlist DELETE error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
