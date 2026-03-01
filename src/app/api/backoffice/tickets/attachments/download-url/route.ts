import { NextResponse } from 'next/server'
import { resolveAccessFromRequest } from '@/lib/accessControl'
import { createUserScopedSupabaseClient } from '@/lib/supabaseRequest'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

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
    const attachmentId = typeof body?.attachmentId === 'string' ? body.attachmentId : ''
    if (!attachmentId) {
      return NextResponse.json({ error: 'attachmentId is required' }, { status: 400 })
    }

    const supabaseUser = createUserScopedSupabaseClient(request)

    const { data: attachment, error: attachmentError } = await supabaseUser
      .from('backoffice_ticket_attachments')
      .select('id, storage_path, file_name, content_type, file_size')
      .eq('id', attachmentId)
      .single()

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found or not accessible' }, { status: 404 })
    }

    const { data: signedData, error: signedError } = await supabaseServer.storage
      .from('backoffice-attachments')
      .createSignedUrl(attachment.storage_path, 60 * 10)

    if (signedError) throw signedError

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      attachment: {
        id: attachment.id,
        fileName: attachment.file_name,
        contentType: attachment.content_type,
        fileSize: attachment.file_size,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create signed download URL'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
