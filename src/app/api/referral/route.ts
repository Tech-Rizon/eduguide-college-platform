import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function generateCode(prefix: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${prefix}-${suffix}`
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8) || 'user'
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { supabaseServer: sb } = await import('@/lib/supabaseServer')

  const { data: userData, error: authError } = await sb.auth.getUser(token)
  if (authError || !userData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = userData.user.id

  // Check if user already has a referral code
  const { data: existing } = await sb
    .from('referral_codes')
    .select('code, clicks')
    .eq('user_id', userId)
    .maybeSingle()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eduguide.online'

  if (existing) {
    return NextResponse.json({
      code: existing.code,
      shareUrl: `${siteUrl}/tutoring?ref=${existing.code}`,
      clicks: existing.clicks,
    })
  }

  // Generate a new unique code based on the user's email prefix
  const emailPrefix = slugify((userData.user.email ?? '').split('@')[0])
  let code = generateCode(emailPrefix)

  // Retry on collision (extremely unlikely but safe)
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await sb
      .from('referral_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle()
    if (!clash) break
    code = generateCode(emailPrefix)
  }

  const { error: insertError } = await sb
    .from('referral_codes')
    .insert({ user_id: userId, code })

  if (insertError) {
    console.error('referral_codes insert error:', insertError)
    return NextResponse.json({ error: 'Could not create referral code' }, { status: 500 })
  }

  return NextResponse.json({
    code,
    shareUrl: `${siteUrl}/tutoring?ref=${code}`,
    clicks: 0,
  })
}
