import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // If a mailer is configured via SENDGRID_API_KEY, send an email via SendGrid
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? 'support@eduguide.online';

    if (!SENDGRID_API_KEY) {
      return NextResponse.json({ error: 'No mailer configured' }, { status: 501 });
    }

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

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'Failed to send email', detail: text }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 });
  }
}
