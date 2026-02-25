import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent'])

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message, userId, priority } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'name, email, and message are required' }, { status: 400 });
    }

    // Validate types
    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return NextResponse.json({ error: 'name, email, and message must be strings' }, { status: 400 });
    }

    // Length limits to prevent abuse
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedMessage = message.trim()

    if (trimmedName.length < 1 || trimmedName.length > 100) {
      return NextResponse.json({ error: 'Name must be between 1 and 100 characters' }, { status: 400 });
    }
    if (trimmedEmail.length > 254 || !EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }
    if (trimmedMessage.length < 10 || trimmedMessage.length > 5000) {
      return NextResponse.json({ error: 'Message must be between 10 and 5000 characters' }, { status: 400 });
    }

    // Validate optional userId
    const resolvedUserId = typeof userId === 'string' && userId.length > 0 ? userId : null

    const resolvedPriority = ALLOWED_PRIORITIES.has(priority) ? priority : 'medium'

    const { data: supportRequest, error: insertError } = await supabaseServer
      .from('support_requests')
      .insert({
        user_id: resolvedUserId,
        name: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage,
        priority: resolvedPriority,
        source: 'contact_form',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to store support request' }, { status: 500 })
    }

    // Send email via SendGrid if configured
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? 'support@eduguide.online';

    let emailDispatched = false

    if (SENDGRID_API_KEY) {
      const payload = {
        personalizations: [{ to: [{ email: TO_EMAIL }] }],
        from: { email: 'no-reply@eduguide.online', name: 'EduGuide' },
        reply_to: { email: trimmedEmail, name: trimmedName },
        subject: `Contact form: ${trimmedName}`,
        content: [
          {
            type: 'text/plain',
            value: `Name: ${trimmedName}\nEmail: ${trimmedEmail}\nPriority: ${resolvedPriority}\n\n${trimmedMessage}`
          },
        ],
      };

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      emailDispatched = res.ok
    }

    return NextResponse.json({
      success: true,
      supportRequestId: supportRequest.id,
      emailDispatched,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
