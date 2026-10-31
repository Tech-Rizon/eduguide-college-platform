import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const token = request.headers.get('x-admin-bootstrap-token')
    if (!token || token !== process.env.ADMIN_BOOTSTRAP_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = process.env.ADMIN_SEED_EMAIL
    const password = process.env.ADMIN_SEED_PASSWORD

    if (!email || !password) {
      return NextResponse.json(
        { error: 'ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be configured' },
        { status: 500 }
      )
    }

    const { data: existingUsers, error: listError } = await supabaseServer.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listError) throw listError

    const existingUser = existingUsers?.users?.find((candidate: any) => candidate.email?.toLowerCase() === email.toLowerCase())

    let userId = existingUser?.id

    if (!userId) {
      const { data: created, error: createError } = await supabaseServer.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: 'EduGuide Admin',
        },
        app_metadata: {
          role: 'staff',
          staff_level: 'super_admin',
          backend_only: true,
        },
      })

      if (createError) throw createError
      userId = created.user?.id
    } else {
      const { error: updateError } = await supabaseServer.auth.admin.updateUserById(userId, {
        app_metadata: {
          role: 'staff',
          staff_level: 'super_admin',
          backend_only: true,
        },
      })

      if (updateError) throw updateError
    }

    if (!userId) {
      return NextResponse.json({ error: 'Failed to create or update admin user' }, { status: 500 })
    }

    const { error: roleError } = await supabaseServer
      .from('user_roles')
      .upsert({ user_id: userId, role: 'staff', staff_level: 'super_admin' }, { onConflict: 'user_id' })

    if (roleError) throw roleError

    const { error: auditError } = await supabaseServer
      .from('admin_audit_logs')
      .insert({
        actor_user_id: userId,
        action: 'bootstrap_admin_account',
        target: email,
        metadata: { backend_only: true },
      })

    if (auditError) throw auditError

    return NextResponse.json({ success: true, email, userId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin bootstrap failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
