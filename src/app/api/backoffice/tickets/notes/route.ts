import { NextResponse } from 'next/server'
import { resolveAccessFromRequest } from '@/lib/accessControl'
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

    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 })
    }

    const supabaseUser = createUserScopedSupabaseClient(request)

    const { data: notes, error } = await supabaseUser
      .from('backoffice_ticket_internal_notes')
      .select('id, ticket_id, staff_user_id, note, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ notes: notes ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load internal notes'
    return NextResponse.json({ error: message }, { status: 500 })
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

    const body = await request.json()
    const ticketId = typeof body?.ticketId === 'string' ? body.ticketId : ''
    const note = typeof body?.note === 'string' ? body.note.trim() : ''

    if (!ticketId || !note) {
      return NextResponse.json({ error: 'ticketId and note are required' }, { status: 400 })
    }

    const supabaseUser = createUserScopedSupabaseClient(request)

    const { data: insertedNote, error } = await supabaseUser
      .from('backoffice_ticket_internal_notes')
      .insert({
        ticket_id: ticketId,
        staff_user_id: access.user.id,
        note,
      })
      .select()
      .single()

    if (error) throw error

    await supabaseUser.from('backoffice_ticket_events').insert({
      ticket_id: ticketId,
      actor_user_id: access.user.id,
      action: 'internal_note_added',
      metadata: {
        note_length: note.length,
      },
    })

    return NextResponse.json({ note: insertedNote }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add internal note'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
