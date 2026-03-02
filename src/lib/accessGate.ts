import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccessTier = 'trial' | 'basic' | 'premium' | 'elite' | 'expired'

export type FeatureKey =
  | 'ai_chat'     // AI College Chat (dashboard)
  | 'college_plan'// College Plan + Application Tracker
  | 'gpa'         // GPA Calculator
  | 'courses'     // Course RAG Chat
  | 'study_tools' // Notes, flashcards, exam generator
  | 'workspace'   // Assignment workspace
  | 'essays'      // Essay Builder + AI Feedback
  | 'tutoring'    // Live Tutoring / Support

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIAL_DAYS = 14

/** Features available on each tier */
const TIER_FEATURES: Record<AccessTier, FeatureKey[]> = {
  trial: [
    'ai_chat', 'college_plan', 'gpa', 'courses',
    'study_tools', 'workspace', 'essays', 'tutoring',
  ],
  basic: [
    'ai_chat', 'college_plan', 'gpa', 'courses',
  ],
  premium: [
    'ai_chat', 'college_plan', 'gpa', 'courses',
    'study_tools', 'workspace',
  ],
  elite: [
    'ai_chat', 'college_plan', 'gpa', 'courses',
    'study_tools', 'workspace', 'essays', 'tutoring',
  ],
  expired: [],
}

const FEATURE_SETS: Record<AccessTier, Set<FeatureKey>> = Object.fromEntries(
  Object.entries(TIER_FEATURES).map(([tier, features]) => [tier, new Set(features)]),
) as Record<AccessTier, Set<FeatureKey>>

/** Maps Stripe plan names to tiers */
const PLAN_TO_TIER: Record<string, AccessTier> = {
  basic: 'basic',
  premium: 'premium',
  elite: 'elite',
}

/** Human-readable tier names for error messages */
export const TIER_LABELS: Record<'basic' | 'premium' | 'elite', string> = {
  basic: 'Basic ($49/mo)',
  premium: 'Premium ($89/mo)',
  elite: 'Elite ($149/mo)',
}

/** Human-readable feature names for upgrade prompts */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  ai_chat: 'AI College Chat',
  college_plan: 'College Plan & Tracker',
  gpa: 'GPA Calculator',
  courses: 'Course AI Chat',
  study_tools: 'Study Tools',
  workspace: 'Assignment Workspace',
  essays: 'Essay Builder & AI Feedback',
  tutoring: 'Live Tutoring & Support',
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Resolves the current access tier for a user.
 *
 * Priority:
 * 1. Active trial (trial_started_at within 14 days)
 * 2. Active subscription in `subscriptions` table
 * 3. Expired
 */
export async function resolveAccess(
  userId: string,
  sb: SupabaseClient,
): Promise<{ tier: AccessTier; daysLeft: number | null; trialStartedAt: string | null }> {
  // Fetch trial_started_at from user_profiles (service role bypasses RLS)
  const { data: profile } = await sb
    .from('user_profiles')
    .select('trial_started_at')
    .eq('id', userId)
    .maybeSingle()

  const trialStartedAt = profile?.trial_started_at ?? null

  if (trialStartedAt) {
    const trialStart = new Date(trialStartedAt)
    const now = new Date()
    const daysSinceStart = Math.floor(
      (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (daysSinceStart < TRIAL_DAYS) {
      const daysLeft = TRIAL_DAYS - daysSinceStart
      return { tier: 'trial', daysLeft, trialStartedAt }
    }
  }

  // No active trial — check subscription
  const activeStatuses = ['active', 'trialing']
  const { data: sub } = await sb
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', userId)
    .in('status', activeStatuses)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sub?.plan && PLAN_TO_TIER[sub.plan]) {
    return { tier: PLAN_TO_TIER[sub.plan], daysLeft: null, trialStartedAt }
  }

  return { tier: 'expired', daysLeft: 0, trialStartedAt }
}

/**
 * Returns true if the given tier has access to the feature.
 */
export function canAccess(tier: AccessTier, feature: FeatureKey): boolean {
  return FEATURE_SETS[tier]?.has(feature) ?? false
}

/**
 * Returns a 402 NextResponse for API routes when access is denied.
 */
export function denyAccess(
  feature: FeatureKey,
  requiredTier: 'basic' | 'premium' | 'elite',
): NextResponse {
  return NextResponse.json(
    {
      error: 'Subscription required',
      feature,
      featureLabel: FEATURE_LABELS[feature],
      requiredTier,
      requiredTierLabel: TIER_LABELS[requiredTier],
      upgradeUrl: '/tutoring#support-plans',
    },
    { status: 402 },
  )
}
