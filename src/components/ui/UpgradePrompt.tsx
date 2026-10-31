'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TIER_LABELS } from '@/lib/accessGate'

interface UpgradePromptProps {
  /** Human-readable feature name shown in the prompt */
  feature: string
  /** The minimum tier required to unlock this feature */
  requiredTier: 'basic' | 'premium' | 'elite'
  /** Optional extra description */
  description?: string
  /** Layout variant */
  variant?: 'card' | 'inline'
}

const TIER_COLORS: Record<'basic' | 'premium' | 'elite', string> = {
  basic: 'text-blue-600',
  premium: 'text-purple-600',
  elite: 'text-amber-600',
}

const TIER_BG: Record<'basic' | 'premium' | 'elite', string> = {
  basic: 'bg-blue-50 border-blue-100',
  premium: 'bg-purple-50 border-purple-100',
  elite: 'bg-amber-50 border-amber-100',
}

const TIER_BUTTON: Record<'basic' | 'premium' | 'elite', string> = {
  basic: 'bg-blue-600 hover:bg-blue-700',
  premium: 'bg-purple-600 hover:bg-purple-700',
  elite: 'bg-amber-600 hover:bg-amber-700',
}

export function UpgradePrompt({
  feature,
  requiredTier,
  description,
  variant = 'card',
}: UpgradePromptProps) {
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${TIER_BG[requiredTier]}`}>
        <Lock className={`h-4 w-4 shrink-0 ${TIER_COLORS[requiredTier]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">
            {feature} requires {TIER_LABELS[requiredTier]}
          </p>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <Button asChild size="sm" className={`text-xs text-white shrink-0 ${TIER_BUTTON[requiredTier]}`}>
          <Link href="/tutoring#support-plans">Upgrade</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border-2 border-dashed p-10 flex flex-col items-center text-center ${TIER_BG[requiredTier]}`}>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
        requiredTier === 'basic' ? 'bg-blue-100' :
        requiredTier === 'premium' ? 'bg-purple-100' : 'bg-amber-100'
      }`}>
        <Lock className={`h-6 w-6 ${TIER_COLORS[requiredTier]}`} />
      </div>
      <h3 className="font-semibold text-gray-900 text-lg mb-1">{feature}</h3>
      <p className="text-sm text-gray-500 mb-1">
        Available on{' '}
        <span className={`font-semibold ${TIER_COLORS[requiredTier]}`}>
          {TIER_LABELS[requiredTier]}
        </span>{' '}
        and above
      </p>
      {description && (
        <p className="text-xs text-gray-400 mb-4 max-w-xs">{description}</p>
      )}
      {!description && <div className="mb-4" />}
      <Button asChild className={`text-white ${TIER_BUTTON[requiredTier]}`}>
        <Link href="/tutoring#support-plans">View Plans &amp; Upgrade</Link>
      </Button>
    </div>
  )
}
