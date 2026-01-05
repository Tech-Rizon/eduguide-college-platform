import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const getSupabaseServer = async () => {
  try {
    const { supabaseServer } = await import('@/lib/supabaseServer')
    return supabaseServer
  } catch (err) {
    console.error('Failed to load Supabase server client:', err)
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const sb = await getSupabaseServer()
    if (!sb) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 501 })
    }

    const { data, error } = await sb
      .from('tutoring_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ requests: data || [] })
  } catch (err: any) {
    console.error('Error fetching tutoring requests:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, category, subject, description, priority } = body

    if (!userId || !category || !subject) {
      return NextResponse.json(
        { error: 'userId, category, and subject are required' },
        { status: 400 }
      )
    }

    const sb = await getSupabaseServer()
    if (!sb) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 501 })
    }

    const { data, error } = await sb
      .from('tutoring_requests')
      .insert([
        {
          user_id: userId,
          category,
          subject,
          description: description || null,
          priority: priority || 'medium',
          status: 'new'
        }
      ])
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ request: data?.[0] }, { status: 201 })
  } catch (err: any) {
    console.error('Error creating tutoring request:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to create request' },
      { status: 500 }
    )
  }
}
