'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { AccessTier, FeatureKey } from '@/lib/accessGate'
import { canAccess as _canAccess } from '@/lib/accessGate'

interface SubscriptionState {
  tier: AccessTier
  daysLeft: number | null
  trialStartedAt: string | null
  isLoading: boolean
}

interface UseSubscriptionReturn extends SubscriptionState {
  /** Returns true if the current tier can access the given feature */
  canAccess: (feature: FeatureKey) => boolean
  /** Reload subscription status (call after checkout completion) */
  refresh: () => void
}

const DEFAULT_STATE: SubscriptionState = {
  tier: 'trial',
  daysLeft: null,
  trialStartedAt: null,
  isLoading: true,
}

export function useSubscription(): UseSubscriptionReturn {
  const { session, loading: authLoading } = useAuth()
  const [state, setState] = useState<SubscriptionState>(DEFAULT_STATE)

  const fetchStatus = useCallback(async (token: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const res = await fetch('/api/subscriptions/status', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) {
        // If unauthorized or error, treat as expired to be safe
        setState({ tier: 'expired', daysLeft: 0, trialStartedAt: null, isLoading: false })
        return
      }
      const data = await res.json()
      setState({
        tier: (data.tier as AccessTier) ?? 'expired',
        daysLeft: data.days_left ?? null,
        trialStartedAt: data.trial_started_at ?? null,
        isLoading: false,
      })
    } catch {
      setState({ tier: 'expired', daysLeft: 0, trialStartedAt: null, isLoading: false })
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!session?.access_token) {
      setState({ tier: 'expired', daysLeft: 0, trialStartedAt: null, isLoading: false })
      return
    }
    fetchStatus(session.access_token)
  }, [authLoading, session, fetchStatus])

  return {
    ...state,
    canAccess: (feature: FeatureKey) => _canAccess(state.tier, feature),
    refresh: () => {
      if (session?.access_token) fetchStatus(session.access_token)
    },
  }
}
