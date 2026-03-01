import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const code = typeof body?.code === 'string' ? body.code.trim().toLowerCase() : ''
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    }

    // Optional attribution fields sent by the tutoring page
    const visitorId = typeof body?.visitor_id === 'string' ? body.visitor_id.slice(0, 64) : null
    const landingUrl = typeof body?.landing_url === 'string' ? body.landing_url.slice(0, 512) : null
    const utmSource = typeof body?.utm_source === 'string' ? body.utm_source.slice(0, 64) : null
    const utmMedium = typeof body?.utm_medium === 'string' ? body.utm_medium.slice(0, 64) : null
    const utmCampaign = typeof body?.utm_campaign === 'string' ? body.utm_campaign.slice(0, 64) : null

    const { supabaseServer: sb } = await import('@/lib/supabaseServer')

    // Increment click counter — atomic via RPC
    const { error: rpcError } = await sb.rpc('increment_referral_clicks', { ref_code: code })
    if (rpcError) {
      // Fallback: manual increment
      const { data: row } = await sb
        .from('referral_codes')
        .select('id, clicks')
        .eq('code', code)
        .maybeSingle()
      if (row) {
        await sb
          .from('referral_codes')
          .update({ clicks: (row.clicks ?? 0) + 1 })
          .eq('id', row.id)
      }
    }

    // Resolve the referrer's user_id for attribution
    const { data: refRow } = await sb
      .from('referral_codes')
      .select('user_id')
      .eq('code', code)
      .maybeSingle()

    // Record attribution row (non-fatal — failures don't block the response)
    try {
      await sb.from('referral_attributions').insert({
        referral_code: code,
        referrer_user_id: refRow?.user_id ?? null,
        visitor_id: visitorId,
        landing_url: landingUrl,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
    } catch (attrErr) {
      console.error('referral_attributions insert error:', attrErr)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
