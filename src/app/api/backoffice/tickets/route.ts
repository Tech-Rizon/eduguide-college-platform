import { NextResponse } from 'next/server'
import { resolveAccessFromRequest, canViewAllTickets, canManageTickets, toAssignedTeam } from '@/lib/accessControl'
import { createUserScopedSupabaseClient } from '@/lib/supabaseRequest'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await resolveAccessFromRequest(request)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    if (!access.isStaffView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (access.mfaRequired) {
      return NextResponse.json({ error: 'MFA required for this account level' }, { status: 403 })
    }

    const supabaseUser = createUserScopedSupabaseClient(request)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const sourceType = searchParams.get('sourceType')
    const unassigned = searchParams.get('unassigned') === 'true'
    const mine = searchParams.get('mine') === 'true'

    let query = supabaseUser
      .from('backoffice_tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (sourceType) query = query.eq('source_type', sourceType)

    if (canViewAllTickets(access.staffLevel)) {
      if (unassigned) {
        query = query.is('assigned_to_user_id', null)
      } else if (mine) {
        query = query.eq('assigned_to_user_id', access.user.id)
      }
    } else {
      query = query.eq('assigned_to_user_id', access.user.id)

      const ownTeam = toAssignedTeam(access.staffLevel)
      if (ownTeam) {
        query = query.eq('assigned_team', ownTeam)
      }
    }

    const { data: tickets, error } = await query
    if (error) throw error

    return NextResponse.json({ tickets: tickets ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch ticket queue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const access = await resolveAccessFromRequest(request)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    if (!canManageTickets(access.staffLevel)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (access.mfaRequired) {
      return NextResponse.json({ error: 'MFA required for manager and super admin actions' }, { status: 403 })
    }

    const supabaseUser = createUserScopedSupabaseClient(request)

    const body = await request.json()
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const category = typeof body?.category === 'string' ? body.category : 'general'
    const priority = typeof body?.priority === 'string' ? body.priority : 'medium'
    const assignedTeam = typeof body?.assignedTeam === 'string' ? body.assignedTeam : null

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const { data, error } = await supabaseUser
      .from('backoffice_tickets')
      .insert({
        source_type: 'manual',
        source_id: null,
        student_user_id: body?.studentUserId ?? null,
        requester_email: body?.requesterEmail ?? null,
        title,
        description: body?.description ?? null,
        category,
        priority,
        status: 'new',
        assigned_team: assignedTeam,
        created_by_user_id: access.user.id,
      })
      .select()
      .single()

    if (error) throw error

    await supabaseUser
      .from('backoffice_ticket_events')
      .insert({
        ticket_id: data.id,
        actor_user_id: access.user.id,
        action: 'ticket_created',
        new_status: 'new',
        metadata: {
          source: 'manual',
          assigned_team: assignedTeam,
        },
      })

    return NextResponse.json({ ticket: data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create ticket'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
