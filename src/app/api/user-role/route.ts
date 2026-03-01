import { NextResponse } from 'next/server'
import { resolveAccessFromRequest } from '@/lib/accessControl'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const access = await resolveAccessFromRequest(request)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    return NextResponse.json({
      role: access.role,
      staffLevel: access.staffLevel,
      mfaAal: access.mfaAal,
      mfaVerified: access.mfaVerified,
      mfaRequired: access.mfaRequired,
      isStaffView: access.isStaffView,
      isManagerView: access.isManagerView,
      isSuperAdmin: access.isSuperAdmin,
      isAdmin: access.isSuperAdmin,
      canManageRoles: access.canManageRoles,
      canManageTickets: access.canManageTickets,
      dashboardPath: access.dashboardPath,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to determine role'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
