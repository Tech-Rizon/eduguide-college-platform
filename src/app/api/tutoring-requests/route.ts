import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent'])
const ALLOWED_CATEGORIES = new Set(['college_guidance', 'admissions', 'financial_aid', 'test_prep', 'essays', 'general', 'other'])

const getSupabaseServer = async () => {
  try {
    const { supabaseServer } = await import('@/lib/supabaseServer')
    return supabaseServer
  } catch {
    return null
  }
}

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  const sb = await getSupabaseServer()
  if (!sb) return null

  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

export async function GET(request: Request) {
  try {
    const authenticatedUserId = await getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = await getSupabaseServer()
    if (!sb) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 501 })
    }

    const { data, error } = await sb
      .from('tutoring_requests')
      .select('*')
      .eq('user_id', authenticatedUserId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests: data || [] })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch requests'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authenticatedUserId = await getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { category, subject, description, priority } = body

    if (!category || !subject) {
      return NextResponse.json(
        { error: 'category and subject are required' },
        { status: 400 }
      )
    }

    if (typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 200) {
      return NextResponse.json(
        { error: 'subject must be between 3 and 200 characters' },
        { status: 400 }
      )
    }

    if (description !== undefined && description !== null) {
      if (typeof description !== 'string' || description.length > 2000) {
        return NextResponse.json(
          { error: 'description must be under 2000 characters' },
          { status: 400 }
        )
      }
    }

    const resolvedPriority = ALLOWED_PRIORITIES.has(priority) ? priority : 'medium'
    const resolvedCategory = ALLOWED_CATEGORIES.has(category) ? category : 'general'

    const sb = await getSupabaseServer()
    if (!sb) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 501 })
    }

    const { data, error } = await sb
      .from('tutoring_requests')
      .insert([
        {
          user_id: authenticatedUserId,
          category: resolvedCategory,
          subject: subject.trim(),
          description: description ? String(description).trim() : null,
          priority: resolvedPriority,
          status: 'new'
        }
      ])
      .select()

    if (error) throw error

    return NextResponse.json({ request: data?.[0] }, { status: 201 })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to create request'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
