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
    from: () => createQueryStub(),
    rpc: async () => ({ data: null, error: notConfiguredError }),
    storage: {
      from: () => ({
        createSignedUploadUrl: async () => ({ data: null, error: notConfiguredError }),
        createSignedUrl: async () => ({ data: null, error: notConfiguredError }),
      }),
    },
  } as any)

function createQueryStub() {
  let expectManyRows = true

  const buildResult = () => ({
    data: expectManyRows ? [] : null,
    error: notConfiguredError,
  })

  const proxy = new Proxy(
    {
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable for Promise-like chaining
      then: (resolve: (value: { data: unknown; error: Error }) => void) => resolve(buildResult()),
      single: async () => {
        expectManyRows = false
        return buildResult()
      },
      maybeSingle: async () => {
        expectManyRows = false
        return buildResult()
      },
    } as Record<string, any>,
    {
      get: (target, prop: string) => {
        if (prop in target) return target[prop]

        return (..._args: unknown[]) => {
          if (prop === 'insert' || prop === 'upsert' || prop === 'update' || prop === 'delete') {
            expectManyRows = false
          }
          return proxy
        }
      },
    }
  )

  return proxy
}

export const supabaseServer =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      })
    : createStubServer()
