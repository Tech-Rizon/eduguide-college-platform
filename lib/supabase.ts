import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
