import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

const STAFF_ROLES = new Set(['tutor', 'staff', 'admin'])

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userErr,
    } = await supabaseServer.auth.getUser(token)

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const metadataRole = user.app_metadata?.role
    let role = typeof metadataRole === 'string' ? metadataRole : 'student'

    const { data: roleRow } = await supabaseServer
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleRow?.role) {
      role = roleRow.role
    }

    return NextResponse.json({
      role,
      isStaffView: STAFF_ROLES.has(role),
      isAdmin: role === 'admin',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to determine role'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
