import { NextResponse } from 'next/server'
import { resolveAccessFromRequest } from '@/lib/accessControl'
import { createUserScopedSupabaseClient } from '@/lib/supabaseRequest'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
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
    const fileName = typeof body?.fileName === 'string' ? body.fileName : ''
    const contentType = typeof body?.contentType === 'string' ? body.contentType : 'application/octet-stream'
    const fileSize = Number(body?.fileSize ?? 0)

    if (!ticketId || !fileName || !fileSize) {
      return NextResponse.json({ error: 'ticketId, fileName, and fileSize are required' }, { status: 400 })
    }

    const safeName = sanitizeFileName(fileName)
    const storagePath = `${ticketId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
    const supabaseUser = createUserScopedSupabaseClient(request)

    // RLS-enforced ticket access check.
    const { data: ticket, error: ticketError } = await supabaseUser
      .from('backoffice_tickets')
      .select('id')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Forbidden: ticket not accessible' }, { status: 403 })
    }

    const { data: attachmentRow, error: attachmentInsertError } = await supabaseUser
      .from('backoffice_ticket_attachments')
      .insert({
        ticket_id: ticketId,
        uploaded_by_user_id: access.user.id,
        storage_path: storagePath,
        file_name: safeName,
        content_type: contentType,
        file_size: fileSize,
      })
      .select('id, storage_path')
      .single()

    if (attachmentInsertError) throw attachmentInsertError

    const { data: uploadData, error: signedUploadError } = await supabaseServer.storage
      .from('backoffice-attachments')
      .createSignedUploadUrl(storagePath)

    if (signedUploadError) throw signedUploadError

    return NextResponse.json({
      attachmentId: attachmentRow.id,
      path: uploadData.path,
      token: uploadData.token,
      signedUrl: uploadData.signedUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create signed upload URL'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
