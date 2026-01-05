import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeSecret = process.env.STRIPE_SECRET_KEY

  if (!webhookSecret || !stripeSecret) {
    console.error('Stripe webhook or secret key not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 501 })
  }

  const payload = await request.text()
  const sig = request.headers.get('stripe-signature') || ''

  const stripe = new Stripe(stripeSecret)

  // Lazy-load Supabase server client only if needed
  let supabaseServer: any = null
  const getSupabaseServer = () => {
    if (!supabaseServer) {
      try {
        const { supabaseServer: sb } = require('@/lib/supabaseServer')
        supabaseServer = sb
      } catch (err) {
        console.error('Failed to load Supabase server client:', err)
        return null
      }
    }
    return supabaseServer
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err?.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Retrieve full session with line items (optional)
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] })

      const customer_email = fullSession.customer_details?.email ?? (fullSession.customer as any) ?? null
      const amount_total = (fullSession.amount_total as number) ?? null
      const currency = (fullSession.currency as string) ?? null
      const payment_status = (fullSession.payment_status as string) ?? null
      const price_id = (fullSession.line_items?.data?.[0]?.price?.id) ?? null
      const plan = (fullSession.metadata && fullSession.metadata.plan) ?? null

      // Insert a record into Supabase (ensure table `payments` exists)
      try {
        const sb = getSupabaseServer()
        if (sb) {
          await sb.from('payments').insert([{ 
            session_id: fullSession.id,
            customer_email,
            amount: amount_total,
            currency,
            payment_status,
            price_id,
            plan,
          }])
        }
      } catch (dbErr: any) {
        console.error('Supabase insert error:', dbErr)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Error handling webhook:', err)
    return NextResponse.json({ error: err?.message || 'Webhook handler error' }, { status: 500 })
  }
}
