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
    if (access.mfaRequired) {
      return NextResponse.json({ error: 'MFA required for this account level' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 })
    }

    const supabaseUser = createUserScopedSupabaseClient(request)

    const { data: ticket, error: ticketError } = await supabaseUser
      .from('backoffice_tickets')
      .select('id, is_sensitive')
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 403 })
    }

    const { data: messages, error: messageError } = await supabaseUser
      .from('backoffice_ticket_messages')
      .select('id, ticket_id, author_user_id, visibility, body, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (messageError) throw messageError

    const { data: attachments, error: attachmentError } = await supabaseUser
      .from('backoffice_ticket_attachments')
      .select('id, ticket_id, message_id, file_name, content_type, file_size, storage_path, created_at')
      .eq('ticket_id', ticketId)
      .not('message_id', 'is', null)
      .order('created_at', { ascending: true })

    if (attachmentError) throw attachmentError

    const attachmentsByMessageId = new Map<string, Array<Record<string, unknown>>>()
    for (const attachment of attachments ?? []) {
      if (!attachment.message_id) continue
      const existing = attachmentsByMessageId.get(attachment.message_id) ?? []
      existing.push(attachment)
      attachmentsByMessageId.set(attachment.message_id, existing)
    }

    const messagePayload = (messages ?? []).map((message: any) => ({
      ...message,
      attachments: attachmentsByMessageId.get(message.id) ?? [],
    }))

    if (ticket?.is_sensitive && access.isStaffView) {
      await supabaseUser.from('backoffice_ticket_events').insert({
        ticket_id: ticketId,
        actor_user_id: access.user.id,
        action: 'sensitive_ticket_accessed',
        metadata: { source: 'message_thread' },
      })
    }

    return NextResponse.json({ messages: messagePayload })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load ticket thread'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const access = await resolveAccessFromRequest(request)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    if (access.mfaRequired) {
      return NextResponse.json({ error: 'MFA required for this account level' }, { status: 403 })
    }

    const body = await request.json()
    const ticketId = typeof body?.ticketId === 'string' ? body.ticketId : ''
    const content = typeof body?.body === 'string' ? body.body.trim() : ''
    const requestedVisibility = typeof body?.visibility === 'string' ? body.visibility : 'public'
    const attachmentIds = Array.isArray(body?.attachmentIds)
      ? body.attachmentIds.filter((item: unknown): item is string => typeof item === 'string')
      : []

    if (!ticketId || !content) {
      return NextResponse.json({ error: 'ticketId and body are required' }, { status: 400 })
    }

    const visibility = access.isStaffView ? (requestedVisibility === 'internal' ? 'internal' : 'public') : 'public'
    const supabaseUser = createUserScopedSupabaseClient(request)

    const { data: insertedMessage, error: insertError } = await supabaseUser
      .from('backoffice_ticket_messages')
      .insert({
        ticket_id: ticketId,
        author_user_id: access.user.id,
        visibility,
        body: content,
      })
      .select()
      .single()

    if (insertError) throw insertError

    if (attachmentIds.length > 0) {
      const { error: attachmentUpdateError } = await supabaseUser
        .from('backoffice_ticket_attachments')
        .update({ message_id: insertedMessage.id })
        .in('id', attachmentIds)
        .eq('ticket_id', ticketId)
        .eq('uploaded_by_user_id', access.user.id)

      if (attachmentUpdateError) throw attachmentUpdateError
    }

    await supabaseUser.from('backoffice_ticket_events').insert({
      ticket_id: ticketId,
      actor_user_id: access.user.id,
      action: visibility === 'internal' ? 'internal_message_added' : 'message_added',
      metadata: {
        attachment_count: attachmentIds.length,
      },
    })

    return NextResponse.json({ message: insertedMessage }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create ticket message'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
