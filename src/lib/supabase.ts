import { createClient } from '@supabase/supabase-js'

// Fallback values for demo mode when Supabase is not configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo_key'

// Create a mock client for demo purposes when real Supabase is not available
const isDemoMode = supabaseUrl === 'https://demo.supabase.co' || supabaseAnonKey === 'demo_key'

// Create client with fallback configuration
export const supabase = isDemoMode
  ? createMockSupabaseClient()
  : createClient(supabaseUrl, supabaseAnonKey)

// Mock Supabase client for demo purposes
function createMockSupabaseClient() {
  return {
    auth: {
      signUp: async (credentials: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => {
        console.log('Demo mode: Mock sign up', credentials)
        return {
          data: {
            user: {
              id: `demo-user-${Date.now()}`,
              email: credentials.email,
              user_metadata: credentials.options?.data || {}
            }
          },
          error: null
        }
      },
      signInWithPassword: async (credentials: { email: string; password: string }) => {
        console.log('Demo mode: Mock sign in', credentials)
        return {
          data: {
            user: {
              id: `demo-user-${Date.now()}`,
              email: credentials.email
            }
          },
          error: null
        }
      },
      signOut: async () => {
        console.log('Demo mode: Mock sign out')
        return { error: null }
      },
      getSession: async () => {
        console.log('Demo mode: Mock get session')
        return { data: { session: null } }
      },
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        console.log('Demo mode: Mock auth state change listener')
        return {
          data: {
            subscription: {
              unsubscribe: () => console.log('Demo mode: Mock unsubscribe')
            }
          }
        }
      },
      updateUser: async (updates: Record<string, unknown>) => {
        console.log('Demo mode: Mock update user', updates)
        return { data: { user: null }, error: null }
      }
    },
    from: (table: string) => ({
      insert: async (data: Record<string, unknown>) => {
        console.log(`Demo mode: Mock insert into ${table}`, data)
        return { data: { id: `demo-id-${Date.now()}` }, error: null }
      },
      select: async () => {
        console.log(`Demo mode: Mock select from ${table}`)
        return { data: [], error: null }
      },
      update: async (data: Record<string, unknown>) => {
        console.log(`Demo mode: Mock update in ${table}`, data)
        return { data: null, error: null }
      },
      delete: async () => {
        console.log(`Demo mode: Mock delete from ${table}`)
        return { data: null, error: null }
      }
    })
  }
}

// Database Types
export interface Database {
  public: {
    Tables: {
      tutoring_requests: {
        Row: {
          id: string
          created_at: string
          user_id: string
          subject: string
          description: string
          file_url: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high'
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          subject: string
          description: string
          file_url?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high'
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          subject?: string
          description?: string
          file_url?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high'
        }
      }
      user_profiles: {
        Row: {
          id: string
          created_at: string
          user_id: string
          first_name: string
          last_name: string
          date_of_birth: string | null
          current_school: string | null
          school_type: string | null
          graduation_year: string | null
          high_school: string | null
          high_school_grad_year: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          first_name: string
          last_name: string
          date_of_birth?: string | null
          current_school?: string | null
          school_type?: string | null
          graduation_year?: string | null
          high_school?: string | null
          high_school_grad_year?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string | null
          current_school?: string | null
          school_type?: string | null
          graduation_year?: string | null
          high_school?: string | null
          high_school_grad_year?: string | null
        }
      }
    }
  }
}

export type TutoringRequest = Database['public']['Tables']['tutoring_requests']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
