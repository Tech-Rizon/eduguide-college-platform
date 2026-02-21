import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

function isAuthorized(request: Request): boolean {
  const headerToken = request.headers.get('x-backoffice-cron-token')
  const expected = process.env.BACKOFFICE_CRON_TOKEN
  return Boolean(expected && headerToken && headerToken === expected)
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseServer.rpc('escalate_due_backoffice_tickets')
    if (error) throw error

    return NextResponse.json({
      success: true,
      escalatedCount: Number(data ?? 0),
      ranAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Escalation job failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
