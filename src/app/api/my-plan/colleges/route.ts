import { NextResponse } from 'next/server'
import { buildCollegePlanningResearchById } from '@/lib/firecrawlMagic'

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

  let body: { collegeId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const collegeId = typeof body.collegeId === 'string' ? body.collegeId.trim() : ''
  if (!collegeId) {
    return NextResponse.json({ error: 'Missing collegeId' }, { status: 400 })
  }

  const { findCollegeCatalogEntryById } = await import('@/lib/collegeCatalogServer')
  const college = await findCollegeCatalogEntryById(collegeId)
  if (!college) {
    return NextResponse.json({ error: 'College not found' }, { status: 404 })
  }

  // Insert into shortlist
  const { data: shortlistRow, error: insertError } = await sb
    .from('college_shortlist')
    .insert({ user_id: userId, college_id: college.id, college_name: college.name })
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
    college_id: college.id,
    task,
  }))

  const { error: checklistError } = await sb
    .from('college_checklist_items')
    .upsert(checklistRows, { onConflict: 'user_id,college_id,task', ignoreDuplicates: true })

  if (checklistError) {
    // Non-fatal — shortlist row was created
    console.error('college_checklist_items upsert error:', checklistError)
  }

  const planningResearch = await buildCollegePlanningResearchById(college.id).catch(() => null)
  if (planningResearch) {
    const normalizedDeadline = planningResearch.deadline
      ? new Date(planningResearch.deadline)
      : null
    await sb
      .from('college_shortlist')
      .update({
        notes: `${planningResearch.summary}\n\nSource: ${planningResearch.sourceUrl}`.slice(0, 2000),
        deadline:
          normalizedDeadline && !Number.isNaN(normalizedDeadline.getTime())
            ? normalizedDeadline.toISOString().slice(0, 10)
            : null,
      })
      .eq('id', shortlistRow.id)
      .eq('user_id', userId)
  }

  return NextResponse.json({ ok: true, id: shortlistRow?.id })
}
