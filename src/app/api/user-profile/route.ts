import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

const getSupabaseServer = async () => {
  try {
    const { supabaseServer } = await import('@/lib/supabaseServer')
    return supabaseServer
  } catch {
    return null
  }
}

/** Extract the authenticated user ID from the Supabase bearer token. */
async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  const sb = await getSupabaseServer()
  if (!sb) return null

  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

function normalizeOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeUsername(value: unknown): { value?: string | null; error?: string } {
  const normalized = normalizeOptionalText(value)
  if (normalized === undefined || normalized === null) {
    return { value: normalized }
  }

  const lower = normalized.toLowerCase()
  if (!USERNAME_REGEX.test(lower)) {
    return {
      error: 'Username must be 3-30 characters and use only letters, numbers, and underscores'
    }
  }

  return { value: lower }
}

export async function GET(request: Request) {
  try {
    const authenticatedUserId = await getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = await getSupabaseServer()
    if (!sb) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 501 })
    }

    const { data, error } = await sb
      .from('user_profiles')
      .select('*')
      .eq('id', authenticatedUserId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({ profile: data || null })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch profile'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const authenticatedUserId = await getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as Record<string, unknown>

    const usernameResult = normalizeUsername(body.username)
    if (usernameResult.error) {
      return NextResponse.json({ error: usernameResult.error }, { status: 400 })
    }

    const username = usernameResult.value
    const email = normalizeOptionalText(body.email)
    const full_name = normalizeOptionalText(body.full_name)
    const avatar_url = normalizeOptionalText(body.avatar_url)
    const phone = normalizeOptionalText(body.phone)
    const location = normalizeOptionalText(body.location)
    const bio = normalizeOptionalText(body.bio)

    const sb = await getSupabaseServer()
    if (!sb) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 501 })
    }

    // Check username uniqueness (excluding current user)
    if (typeof username === 'string') {
      const { data: conflict, error: conflictError } = await sb
        .from('user_profiles')
        .select('id')
        .eq('username', username)
        .neq('id', authenticatedUserId)
        .maybeSingle()

      if (conflictError) throw conflictError

      if (conflict) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
      }
    }

    const profilePayload: Record<string, unknown> = {
      id: authenticatedUserId,
      updated_at: new Date().toISOString(),
    }
    if (email !== undefined) profilePayload.email = email
    if (full_name !== undefined) profilePayload.full_name = full_name
    if (avatar_url !== undefined) profilePayload.avatar_url = avatar_url
    if (phone !== undefined) profilePayload.phone = phone
    if (location !== undefined) profilePayload.location = location
    if (bio !== undefined) profilePayload.bio = bio
    if (username !== undefined) profilePayload.username = username

    // UPSERT — avoids SELECT + INSERT/UPDATE race condition
    const { data, error } = await sb
      .from('user_profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()

    if (error) throw error

    return NextResponse.json({ profile: data?.[0] ?? null })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update profile'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
