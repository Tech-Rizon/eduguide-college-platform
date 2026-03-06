import { NextResponse } from 'next/server'
import { resolveAccessFromRequest, canManageTickets } from '@/lib/accessControl'
import { createUserScopedSupabaseClient } from '@/lib/supabaseRequest'

export const dynamic = 'force-dynamic'

const ASSIGNABLE_TEAMS = new Set(['tutor', 'support'])

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
    const ticketId = typeof body?.ticketId === 'string' ? body.ticketId : ''
    const assigneeUserId = typeof body?.assigneeUserId === 'string' ? body.assigneeUserId : ''
    const assignedTeam = typeof body?.assignedTeam === 'string' ? body.assignedTeam : ''
    const managerNotes = typeof body?.managerNotes === 'string' ? body.managerNotes : null

    if (!ticketId || !assigneeUserId || !ASSIGNABLE_TEAMS.has(assignedTeam)) {
      return NextResponse.json({ error: 'ticketId, assigneeUserId, and assignedTeam(tutor|support) are required' }, { status: 400 })
    }

    const { data: assigneeRole, error: assigneeRoleError } = await supabaseUser
      .from('user_roles')
      .select('role, staff_level')
      .eq('user_id', assigneeUserId)
      .single()

    if (assigneeRoleError) throw assigneeRoleError

    if (assigneeRole?.role !== 'staff' || assigneeRole?.staff_level !== assignedTeam) {
      return NextResponse.json({ error: 'Assignee does not match required staff level for this team' }, { status: 400 })
    }

    const { data: currentTicket, error: currentTicketError } = await supabaseUser
      .from('backoffice_tickets')
      .select('id, status, assigned_to_user_id')
      .eq('id', ticketId)
      .single()

    if (currentTicketError) throw currentTicketError

    const { data: updatedTicket, error: updateError } = await supabaseUser
      .from('backoffice_tickets')
      .update({
        assigned_to_user_id: assigneeUserId,
        assigned_by_user_id: access.user.id,
        assigned_team: assignedTeam,
        manager_notes: managerNotes,
        status: currentTicket.status === 'new' ? 'assigned' : currentTicket.status,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select()
      .single()

    if (updateError) throw updateError

    await supabaseUser
      .from('backoffice_ticket_events')
      .insert({
        ticket_id: ticketId,
        actor_user_id: access.user.id,
        action: 'ticket_assigned',
        old_status: currentTicket.status,
        new_status: updatedTicket.status,
        old_assignee_user_id: currentTicket.assigned_to_user_id,
        new_assignee_user_id: assigneeUserId,
        metadata: {
          assigned_team: assignedTeam,
          manager_notes: managerNotes,
          assignment_mode: 'manual_override',
        },
      })

    return NextResponse.json({ ticket: updatedTicket })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign ticket'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
