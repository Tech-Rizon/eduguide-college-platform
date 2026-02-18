import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message, userId, priority } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'name, email, and message are required' }, { status: 400 });
    }

    const { data: supportRequest, error: insertError } = await supabaseServer
      .from('support_requests')
      .insert({
        user_id: userId ?? null,
        name,
        email,
        message,
        priority: priority ?? 'medium',
        source: 'contact_form',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to store support request', detail: insertError.message }, { status: 500 })
    }

    // If a mailer is configured via SENDGRID_API_KEY, send an email via SendGrid
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? 'support@eduguide.online';

    let emailDispatched = false
    let emailError: string | null = null

    if (SENDGRID_API_KEY) {
      // Send via SendGrid
      const payload = {
        personalizations: [{ to: [{ email: TO_EMAIL }] }],
        from: { email: 'no-reply@eduguide.online', name: 'EduGuide' },
        subject: `Contact form submission from ${name}`,
        content: [
          { type: 'text/plain', value: `Name: ${name}\nEmail: ${email}\n\n${message}` },
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

      if (res.ok) {
        emailDispatched = true
      } else {
        emailError = await res.text()
      }
    }

    return NextResponse.json({
      success: true,
      supportRequestId: supportRequest.id,
      emailDispatched,
      emailError,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 });
  }
}
