import { useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface DemoUser {
  id: string
  email: string
  user_metadata?: Record<string, unknown>
  firstName?: string
  lastName?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | DemoUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing demo user in localStorage
    if (typeof window !== 'undefined') {
      try {
        const existingUser = localStorage.getItem('demoUser')
        if (existingUser) {
          const userData = JSON.parse(existingUser)
          setUser(userData)
          setLoading(false)
          return
        }
      } catch (error) {
        console.log('No existing demo user found')
      }
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.log('Demo mode: No real session available')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      )

      return () => subscription.unsubscribe()
    } catch (error) {
      console.log('Demo mode: Auth state change listener not available')
      setLoading(false)
    }
  }, [])

  const signUp = async (email: string, password: string, userData?: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })

      // In demo mode, also store user in localStorage
      if (data.user && typeof window !== 'undefined') {
        const demoUser = {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
          firstName: userData?.first_name || 'Demo',
          lastName: userData?.last_name || 'User'
        }
        localStorage.setItem('demoUser', JSON.stringify(demoUser))
        setUser(demoUser)
      }

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      // In demo mode, create and store demo user
      if (data.user && typeof window !== 'undefined') {
        const demoUser = {
          id: data.user.id,
          email: data.user.email,
          firstName: 'Demo',
          lastName: 'User'
        }
        localStorage.setItem('demoUser', JSON.stringify(demoUser))
        setUser(demoUser)
      }

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()

      // Clear demo user from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('demoUser')
      }

      setUser(null)
      setSession(null)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const updatePassword = async (password: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updatePassword
  }
}
