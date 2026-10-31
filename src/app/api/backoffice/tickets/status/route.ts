import { NextResponse } from 'next/server'
import { resolveAccessFromRequest, canManageTickets } from '@/lib/accessControl'
import { supabaseServer } from '@/lib/supabaseServer'
import { createUserScopedSupabaseClient } from '@/lib/supabaseRequest'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set(['new', 'assigned', 'in_progress', 'waiting_on_student', 'resolved', 'closed'])

function mapTicketStatusToTutoring(status: string): string {
  switch (status) {
    case 'assigned':
      return 'assigned'
    case 'in_progress':
    case 'waiting_on_student':
      return 'in_progress'
    case 'resolved':
    case 'closed':
      return 'completed'
    default:
      return 'new'
  }
}

function mapTicketStatusToSupport(status: string): string {
  switch (status) {
    case 'assigned':
    case 'in_progress':
    case 'waiting_on_student':
      return 'in_progress'
    case 'resolved':
      return 'resolved'
    case 'closed':
      return 'closed'
    default:
      return 'new'
  }
}

export async function POST(request: Request) {
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

    const body = await request.json()
    const ticketId = typeof body?.ticketId === 'string' ? body.ticketId : ''
    const nextStatus = typeof body?.status === 'string' ? body.status : ''
    const note = typeof body?.note === 'string' ? body.note : null

    if (!ticketId || !ALLOWED_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: 'ticketId and a valid status are required' }, { status: 400 })
    }

    const { data: currentTicket, error: ticketError } = await supabaseUser
      .from('backoffice_tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (ticketError) throw ticketError

    const canManageAnyTicket = canManageTickets(access.staffLevel)
    if (!canManageAnyTicket && currentTicket.assigned_to_user_id !== access.user.id) {
      return NextResponse.json({ error: 'Forbidden: not assigned to this ticket' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {
      status: nextStatus,
    }

    if (nextStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString()
    }
    if (nextStatus === 'closed') {
      updates.closed_at = new Date().toISOString()
    }

    const { data: updatedTicket, error: updateError } = await supabaseUser
      .from('backoffice_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single()

    if (updateError) throw updateError

    await supabaseUser
      .from('backoffice_ticket_events')
      .insert({
        ticket_id: ticketId,
        actor_user_id: access.user.id,
        action: 'status_changed',
        old_status: currentTicket.status,
        new_status: nextStatus,
        old_assignee_user_id: currentTicket.assigned_to_user_id,
        new_assignee_user_id: currentTicket.assigned_to_user_id,
        metadata: note ? { note } : null,
      })

    if (currentTicket.source_type === 'tutoring_request' && currentTicket.source_id) {
      await supabaseServer
        .from('tutoring_requests')
        .update({ status: mapTicketStatusToTutoring(nextStatus) })
        .eq('id', currentTicket.source_id)
    }

    if (currentTicket.source_type === 'support_request' && currentTicket.source_id) {
      await supabaseServer
        .from('support_requests')
        .update({ status: mapTicketStatusToSupport(nextStatus) })
        .eq('id', currentTicket.source_id)
    }

    return NextResponse.json({ ticket: updatedTicket })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update ticket status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
