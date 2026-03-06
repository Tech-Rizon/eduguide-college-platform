import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/my-plan/checklist/[id]
 *
 * Toggles the completed state of a checklist item.
 * Only the authenticated owner can update their own items.
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

  let body: { completed?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.completed !== 'boolean') {
    return NextResponse.json({ error: 'completed must be a boolean' }, { status: 400 })
  }

  const { error } = await sb
    .from('college_checklist_items')
    .update({ completed: body.completed })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('college_checklist_items PATCH error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
