import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const code = typeof body?.code === 'string' ? body.code.trim().toLowerCase() : ''
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    }

    const { supabaseServer: sb } = await import('@/lib/supabaseServer')

    // Increment click counter using RPC to avoid race condition
    const { error } = await sb.rpc('increment_referral_clicks', { ref_code: code })
    if (error) {
      // Fallback: manual increment if RPC doesn't exist yet
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

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
