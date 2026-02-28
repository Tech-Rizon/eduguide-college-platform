import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const STANDARD_CHECKLIST_TASKS = [
  'Create Common App or college portal account',
  'Request official transcript from your school',
  'Write personal statement / main essay',
  'Submit FAFSA financial aid form',
  'Add recommenders and request letters',
  'Complete application and review all sections',
  'Pay application fee or request fee waiver',
]

/**
 * POST /api/my-plan/colleges
 *
 * Adds a college to the student's shortlist and auto-inserts 7 standard
 * checklist items. Returns 409 if already in the plan.
 */
export async function POST(request: Request) {
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

  let body: { collegeId?: unknown; collegeName?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const collegeId = typeof body.collegeId === 'string' ? body.collegeId.trim() : ''
  const collegeName = typeof body.collegeName === 'string' ? body.collegeName.trim() : ''

  if (!collegeId || !collegeName) {
    return NextResponse.json({ error: 'Missing collegeId or collegeName' }, { status: 400 })
  }

  // Server-side validation: college must exist in static database
  const { collegeDatabase } = await import('@/lib/collegeDatabase')
  const college = collegeDatabase.find((c) => c.id === collegeId)
  if (!college) {
    return NextResponse.json({ error: 'College not found' }, { status: 404 })
  }

  // Insert into shortlist
  const { data: shortlistRow, error: insertError } = await sb
    .from('college_shortlist')
    .insert({ user_id: userId, college_id: collegeId, college_name: collegeName })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Already in plan' }, { status: 409 })
    }
    console.error('college_shortlist insert error:', insertError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  // Auto-insert standard checklist tasks (ignore duplicates)
  const checklistRows = STANDARD_CHECKLIST_TASKS.map((task) => ({
    user_id: userId,
    college_id: collegeId,
    task,
  }))

  const { error: checklistError } = await sb
    .from('college_checklist_items')
    .upsert(checklistRows, { onConflict: 'user_id,college_id,task', ignoreDuplicates: true })

  if (checklistError) {
    // Non-fatal — shortlist row was created
    console.error('college_checklist_items upsert error:', checklistError)
  }

  return NextResponse.json({ ok: true, id: shortlistRow?.id })
}
