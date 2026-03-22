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
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // If settings don't exist, return defaults
    const defaults = {
      user_id: userId,
      notifications_enabled: true,
      email_notifications: true,
      marketing_emails: false,
      theme: 'light',
      language: 'en'
    }

    return NextResponse.json({ settings: data || defaults })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch settings';
    console.error('Error fetching user settings:', err)
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const {
      userId,
      notifications_enabled,
      email_notifications,
      marketing_emails,
      theme,
      language
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const sb = await getSupabaseServer()
    if (!sb) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 501 })
    }

    // Check if settings exist
    const { data: existingSettings, error: selectError } = await sb
      .from('user_settings')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    let result: { data: unknown[] | null; error: unknown }
    if (existingSettings) {
      // Update existing settings
      result = await sb
        .from('user_settings')
        .update({
          notifications_enabled:
            notifications_enabled !== undefined ? notifications_enabled : true,
          email_notifications:
            email_notifications !== undefined ? email_notifications : true,
          marketing_emails:
            marketing_emails !== undefined ? marketing_emails : false,
          theme: theme || 'light',
          language: language || 'en',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
    } else {
      // Create new settings
      result = await sb
        .from('user_settings')
        .insert([
          {
            user_id: userId,
            notifications_enabled:
              notifications_enabled !== undefined ? notifications_enabled : true,
            email_notifications:
              email_notifications !== undefined ? email_notifications : true,
            marketing_emails:
              marketing_emails !== undefined ? marketing_emails : false,
            theme: theme || 'light',
            language: language || 'en'
          }
        ])
        .select()
    }

    const { data, error } = result

    if (error) {
      throw error
    }

    return NextResponse.json({ settings: data?.[0] })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update settings';
    console.error('Error updating user settings:', err)
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    )
  }
}
