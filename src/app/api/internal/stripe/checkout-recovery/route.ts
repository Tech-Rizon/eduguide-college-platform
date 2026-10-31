import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

type CheckoutRecoveryRow = {
  id: string
  stripe_checkout_session_id: string
  stripe_checkout_url: string | null
  customer_email: string | null
  plan: string | null
  recovery_email_attempts: number | null
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return Boolean(expected && token && token === expected)
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

async function sendRecoveryEmail(
  email: string,
  checkoutUrl: string,
  plan: string | null,
  siteUrl: string,
) {
  const sendgridApiKey = process.env.SENDGRID_API_KEY
  if (!sendgridApiKey) {
    throw new Error('SENDGRID_API_KEY is not configured')
  }

  const subject = plan
    ? `Complete your ${plan} checkout on EduGuide`
    : 'Complete your EduGuide checkout'
  const planText = plan ? ` for the ${plan} plan` : ''
  const supportUrl = `${siteUrl}/contact?topic=billing`
  const text = [
    'You started a checkout with EduGuide but did not complete it.',
    '',
    `Resume your checkout${planText}:`,
    checkoutUrl,
    '',
    `Need help? Contact us here: ${supportUrl}`,
  ].join('\n')

  const html = `
    <p>You started a checkout with EduGuide but did not complete it.</p>
    <p><a href="${checkoutUrl}">Resume your checkout${planText}</a></p>
    <p>If you need help, <a href="${supportUrl}">contact support</a>.</p>
  `

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: 'no-reply@eduguide.online', name: 'EduGuide' },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`SendGrid error: ${message.slice(0, 500)}`)
  }
}

async function handleRecoveryRun() {
  const delayMinutes = parsePositiveInt(process.env.CHECKOUT_RECOVERY_DELAY_MINUTES, 60)
  const batchSize = parsePositiveInt(process.env.CHECKOUT_RECOVERY_BATCH_SIZE, 50)
  const cutoff = new Date(Date.now() - delayMinutes * 60 * 1000).toISOString()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eduguide.online'

  const { data, error } = await supabaseServer
    .from('checkout_recovery_sessions')
    .select(
      'id, stripe_checkout_session_id, stripe_checkout_url, customer_email, plan, recovery_email_attempts',
    )
    .eq('status', 'open')
    .is('recovery_email_sent_at', null)
    .not('customer_email', 'is', null)
    .not('stripe_checkout_url', 'is', null)
    .lt('recovery_email_attempts', 3)
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (error) throw error

  const sessions = (data ?? []) as CheckoutRecoveryRow[]
  const results = {
    queued: sessions.length,
    sent: 0,
    failed: 0,
  }

  for (const session of sessions) {
    const now = new Date().toISOString()
    const attempts = (session.recovery_email_attempts ?? 0) + 1

    try {
      if (!session.customer_email || !session.stripe_checkout_url) {
        throw new Error('Missing email or checkout URL')
      }

      await sendRecoveryEmail(
        session.customer_email,
        session.stripe_checkout_url,
        session.plan,
        siteUrl,
      )

      const { error: updateError } = await supabaseServer
        .from('checkout_recovery_sessions')
        .update({
          recovery_email_sent_at: now,
          recovery_email_last_attempt_at: now,
          recovery_email_attempts: attempts,
          recovery_email_error: null,
        })
        .eq('id', session.id)

      if (updateError) throw updateError
      results.sent += 1
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown recovery email error'
      const { error: updateError } = await supabaseServer
        .from('checkout_recovery_sessions')
        .update({
          recovery_email_last_attempt_at: now,
          recovery_email_attempts: attempts,
          recovery_email_error: message.slice(0, 500),
        })
        .eq('id', session.id)

      if (updateError) {
        console.error('Checkout recovery status update error:', updateError)
      }

      console.error(
        `Checkout recovery email failed for ${session.stripe_checkout_session_id}:`,
        message,
      )
      results.failed += 1
    }
  }

  return {
    ...results,
    delayMinutes,
    batchSize,
    ranAt: new Date().toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await handleRecoveryRun()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Checkout recovery job failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
