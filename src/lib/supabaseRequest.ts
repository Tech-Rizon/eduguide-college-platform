import { createClient } from '@supabase/supabase-js'

export function getBearerTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice('Bearer '.length)
}

export function createUserScopedSupabaseClient(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const token = getBearerTokenFromRequest(request)

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase client env vars missing for request-scoped client.')
  }
  if (!token) {
    throw new Error('Missing bearer token for request-scoped client.')
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}
