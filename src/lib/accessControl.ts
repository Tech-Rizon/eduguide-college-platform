import type { User } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabaseServer'

export type CanonicalRole = 'student' | 'staff'
export type StaffLevel = 'tutor' | 'support' | 'manager' | 'super_admin'
export type AssignedTeam = 'tutor' | 'support'

const STAFF_LEVELS = new Set<StaffLevel>(['tutor', 'support', 'manager', 'super_admin'])
const LEGACY_ROLE_TO_STAFF_LEVEL: Record<string, StaffLevel> = {
  tutor: 'tutor',
  staff: 'support',
  admin: 'super_admin',
}

export function normalizeStaffLevel(value: unknown): StaffLevel | null {
  if (typeof value !== 'string') return null

  if (value === 'staff') return 'support'
  if (value === 'admin') return 'super_admin'

  return STAFF_LEVELS.has(value as StaffLevel) ? (value as StaffLevel) : null
}

export function normalizeRole(roleValue: unknown, staffLevelValue: unknown): { role: CanonicalRole; staffLevel: StaffLevel | null } {
  const role = typeof roleValue === 'string' ? roleValue : 'student'
  const staffLevel = normalizeStaffLevel(staffLevelValue)

  if (role === 'staff') {
    return {
      role: 'staff',
      staffLevel: staffLevel ?? 'support',
    }
  }

  if (LEGACY_ROLE_TO_STAFF_LEVEL[role]) {
    return {
      role: 'staff',
      staffLevel: LEGACY_ROLE_TO_STAFF_LEVEL[role],
    }
  }

  return {
    role: 'student',
    staffLevel: null,
  }
}

export function isStaffLevel(value: unknown): value is StaffLevel {
  return normalizeStaffLevel(value) !== null
}

export function toAssignedTeam(staffLevel: StaffLevel | null): AssignedTeam | null {
  if (staffLevel === 'tutor') return 'tutor'
  if (staffLevel === 'support') return 'support'
  return null
}

export function canManageRoles(staffLevel: StaffLevel | null): boolean {
  return staffLevel === 'super_admin'
}

export function canManageTickets(staffLevel: StaffLevel | null): boolean {
  return staffLevel === 'manager' || staffLevel === 'super_admin'
}

export function canViewAllTickets(staffLevel: StaffLevel | null): boolean {
  return canManageTickets(staffLevel)
}

export function dashboardPathForStaffLevel(staffLevel: StaffLevel | null): string {
  switch (staffLevel) {
    case 'super_admin':
      return '/backoffice/super-admin'
    case 'manager':
      return '/backoffice/manager'
    case 'tutor':
      return '/backoffice/tutor'
    case 'support':
      return '/backoffice/support'
    default:
      return '/staff/dashboard'
  }
}

export function defaultDashboardPath(role: CanonicalRole, staffLevel: StaffLevel | null): string {
  if (role === 'staff') return dashboardPathForStaffLevel(staffLevel)
  return '/dashboard'
}

export type AccessContext = {
  ok: true
  user: User
  role: CanonicalRole
  staffLevel: StaffLevel | null
  mfaAal: string | null
  mfaVerified: boolean
  mfaRequired: boolean
  isStaffView: boolean
  isManagerView: boolean
  isSuperAdmin: boolean
  canManageRoles: boolean
  canManageTickets: boolean
  dashboardPath: string
}

type AccessFailure = {
  ok: false
  status: number
  error: string
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const json = Buffer.from(padded, 'base64').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export function requiresStepUpMfa(staffLevel: StaffLevel | null, mfaVerified: boolean): boolean {
  if (staffLevel !== 'manager' && staffLevel !== 'super_admin') return false
  return !mfaVerified
}

export async function resolveAccessFromRequest(request: Request): Promise<AccessContext | AccessFailure> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing bearer token' }
  }

  const token = authHeader.replace('Bearer ', '')
  const tokenPayload = decodeJwtPayload(token)
  const mfaAal = typeof tokenPayload?.aal === 'string' ? (tokenPayload.aal as string) : null
  const mfaVerified = mfaAal === 'aal2' || mfaAal === 'aal3'
  const {
    data: { user },
    error: userErr,
  } = await supabaseServer.auth.getUser(token)

  if (userErr || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  const metadataRole = user.app_metadata?.role
  const metadataStaffLevel = user.app_metadata?.staff_level
  let resolved = normalizeRole(metadataRole, metadataStaffLevel)

  const { data: roleRow, error: roleErr } = await supabaseServer
    .from('user_roles')
    .select('role, staff_level')
    .eq('user_id', user.id)
    .single()

  if (!roleErr && roleRow?.role) {
    resolved = normalizeRole(roleRow.role, roleRow.staff_level)
  } else if (roleErr && roleErr.message?.toLowerCase().includes('staff_level')) {
    const { data: legacyRoleRow } = await supabaseServer
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (legacyRoleRow?.role) {
      resolved = normalizeRole(legacyRoleRow.role, null)
    }
  }

  const isStaffView = resolved.role === 'staff'
  const isSuperAdmin = resolved.staffLevel === 'super_admin'
  const managerTicketAccess = canManageTickets(resolved.staffLevel)
  const mfaRequired = requiresStepUpMfa(resolved.staffLevel, mfaVerified)

  return {
    ok: true,
    user,
    role: resolved.role,
    staffLevel: resolved.staffLevel,
    mfaAal,
    mfaVerified,
    mfaRequired,
    isStaffView,
    isManagerView: managerTicketAccess,
    isSuperAdmin,
    canManageRoles: canManageRoles(resolved.staffLevel),
    canManageTickets: managerTicketAccess,
    dashboardPath: defaultDashboardPath(resolved.role, resolved.staffLevel),
  }
}
