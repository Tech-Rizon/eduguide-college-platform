'use client'

import Link from 'next/link'
import { useState } from 'react'
import { X, Clock } from 'lucide-react'
import type { AccessTier } from '@/lib/accessGate'

interface TrialBannerProps {
  tier: AccessTier
  daysLeft: number | null
}

export function TrialBanner({ tier, daysLeft }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null
  if (tier !== 'trial' || daysLeft === null) return null

  const urgency = daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-orange-500' : 'bg-amber-500'
  const dayText = daysLeft === 1 ? '1 day' : `${daysLeft} days`

  return (
    <div className={`${urgency} text-white`}>
      <div className="max-w-5xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            <strong>{dayText} left</strong> in your free trial &mdash; subscribe to keep full access after day 14.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/tutoring#support-plans"
            className="text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors rounded-full px-3 py-1 whitespace-nowrap"
          >
            Subscribe Now
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Dismiss trial banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
