import { NextResponse } from 'next/server'
import { resolveAccessFromRequest } from '@/lib/accessControl'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await resolveAccessFromRequest(request)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    if (!access.canManageTickets && !access.canManageRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (access.mfaRequired) {
      return NextResponse.json({ error: 'MFA required for manager and super admin access' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')

    let query = supabaseServer
      .from('user_roles')
      .select('user_id, role, staff_level, created_at, updated_at')
      .eq('role', 'staff')

    if (level) {
      query = query.eq('staff_level', level)
    }

    const { data: roles, error: rolesError } = await query
      .order('staff_level', { ascending: true })
      .order('created_at', { ascending: true })

    if (rolesError) {
      throw rolesError
    }

    const { data: usersData, error: usersError } = await supabaseServer.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (usersError) {
      throw usersError
    }

    const emailByUserId = new Map<string, string>()
    for (const user of usersData?.users ?? []) {
      if (user.id && user.email) {
        emailByUserId.set(user.id, user.email)
      }
    }

    const staff = (roles ?? []).map((row: any) => ({
      userId: row.user_id,
      email: emailByUserId.get(row.user_id) ?? null,
      role: row.role,
      staffLevel: row.staff_level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ staff })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load staff list'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
