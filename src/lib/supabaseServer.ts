import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const notConfiguredError = new Error(
  'Supabase server client not configured (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing).'
)

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(notConfiguredError.message)
}

const createStubServer = () =>
  ({
    auth: {
      getUser: async () => ({ data: { user: null }, error: notConfiguredError }),
      admin: {
        listUsers: async () => ({ data: { users: [] }, error: notConfiguredError }),
        createUser: async () => ({ data: { user: null }, error: notConfiguredError }),
        updateUserById: async () => ({ data: { user: null }, error: notConfiguredError }),
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: notConfiguredError }),
        }),
        order: async () => ({ data: [], error: notConfiguredError }),
      }),
      insert: async () => ({ data: null, error: notConfiguredError }),
      upsert: async () => ({ data: null, error: notConfiguredError }),
      update: () => ({
        eq: () => ({ select: async () => ({ data: null, error: notConfiguredError }) }),
      }),
    }),
  } as any)

export const supabaseServer =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      })
    : createStubServer()
