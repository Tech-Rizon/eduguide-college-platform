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
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // If profile doesn't exist, return null
    return NextResponse.json({ profile: data || null })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch profile';
    console.error('Error fetching user profile:', err)
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, email, full_name, avatar_url, phone, location, bio } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const sb = await getSupabaseServer()
    if (!sb) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 501 })
    }

    // Check if profile exists
    const { data: existingProfile, error: selectError } = await sb
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single()

    let result
    if (existingProfile) {
      // Update existing profile
      result = await sb
        .from('user_profiles')
        .update({
          email,
          full_name,
          avatar_url,
          phone,
          location,
          bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
    } else {
      // Create new profile
      result = await sb
        .from('user_profiles')
        .insert([
          {
            id: userId,
            email,
            full_name,
            avatar_url,
            phone,
            location,
            bio
          }
        ])
        .select()
    }

    const { data, error } = result

    if (error) {
      throw error
    }

    return NextResponse.json({ profile: data?.[0] })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update profile';
    console.error('Error updating user profile:', err)
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    )
  }
}
