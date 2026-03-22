import { NextResponse } from 'next/server'
import { resolveAccessFromRequest, isStaffLevel } from '@/lib/accessControl'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

type AssignRoleBody = {
  userId?: string
  email?: string
  role: 'student' | 'staff'
  staffLevel?: string | null
  transferSuperAdmin?: boolean
}

async function resolveUserIdFromInput(body: AssignRoleBody): Promise<string | null> {
  if (body.userId) return body.userId
  if (!body.email) return null

  const { data, error } = await supabaseServer.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error

  const target = data?.users?.find((candidate: any) => candidate.email?.toLowerCase() === body.email?.toLowerCase())
  return target?.id ?? null
}

export async function GET(request: Request) {
  const access = await resolveAccessFromRequest(request)
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  if (!access.canManageRoles) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (access.mfaRequired) {
    return NextResponse.json({ error: 'MFA required for role management' }, { status: 403 })
  }

  const { data, error } = await supabaseServer
    .from('user_roles')
    .select('user_id, role, staff_level, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ roles: data ?? [] })
}

export async function POST(request: Request) {
  try {
    const access = await resolveAccessFromRequest(request)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    if (!access.canManageRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (access.mfaRequired) {
      return NextResponse.json({ error: 'MFA required for role management' }, { status: 403 })
    }

    const body = (await request.json()) as AssignRoleBody
    if (!body?.role) {
      return NextResponse.json({ error: 'role is required' }, { status: 400 })
    }

    const targetUserId = await resolveUserIdFromInput(body)
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    if (body.role !== 'student' && body.role !== 'staff') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const requestedStaffLevel =
      body.role === 'staff'
        ? body.staffLevel
        : null

    if (body.role === 'staff' && !isStaffLevel(requestedStaffLevel)) {
      return NextResponse.json({ error: 'staffLevel is required for staff and must be one of tutor/support/manager/super_admin' }, { status: 400 })
    }

    if (requestedStaffLevel === 'super_admin') {
      const { data: existingSuperAdmin } = await supabaseServer
        .from('user_roles')
        .select('user_id')
        .eq('role', 'staff')
        .eq('staff_level', 'super_admin')
        .maybeSingle()

      if (existingSuperAdmin?.user_id && existingSuperAdmin.user_id !== targetUserId) {
        if (!body.transferSuperAdmin) {
          return NextResponse.json(
            {
              error: 'A super admin already exists. Set transferSuperAdmin=true to transfer ownership.',
              existingSuperAdminUserId: existingSuperAdmin.user_id,
            },
            { status: 409 }
          )
        }

        const { error: demoteError } = await supabaseServer
          .from('user_roles')
          .update({ role: 'staff', staff_level: 'manager' })
          .eq('user_id', existingSuperAdmin.user_id)

        if (demoteError) throw demoteError
      }
    }

    const nextRole = body.role
    const nextStaffLevel = body.role === 'staff' ? requestedStaffLevel : null

    const { error: roleUpsertError } = await supabaseServer
      .from('user_roles')
      .upsert(
        {
          user_id: targetUserId,
          role: nextRole,
          staff_level: nextStaffLevel,
        },
        { onConflict: 'user_id' }
      )

    if (roleUpsertError) throw roleUpsertError

    const { error: metadataError } = await supabaseServer.auth.admin.updateUserById(targetUserId, {
      app_metadata: {
        role: nextRole,
        staff_level: nextStaffLevel,
      },
    })

    if (metadataError) throw metadataError

    await supabaseServer
      .from('admin_audit_logs')
      .insert({
        actor_user_id: access.user.id,
        action: 'assign_user_role',
        target: targetUserId,
        metadata: {
          role: nextRole,
          staff_level: nextStaffLevel,
        },
      })

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      role: nextRole,
      staffLevel: nextStaffLevel,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign role'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
