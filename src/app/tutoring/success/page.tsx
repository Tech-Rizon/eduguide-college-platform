'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GraduationCap, CheckCircle2, AlertCircle, Loader2, ArrowRight, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type CheckoutSessionStatus = 'open' | 'complete' | 'expired' | null

type CheckoutSessionResponse = {
  status: CheckoutSessionStatus
  payment_status: string | null
  customer_email: string | null
  plan: string | null
}

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [session, setSession] = useState<CheckoutSessionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setError('Missing checkout session. Start your checkout again from the tutoring page.')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    const fetchSession = async () => {
      try {
        const response = await fetch(
          `/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`,
          { method: 'GET', cache: 'no-store', signal: controller.signal },
        )
        const body = await response.json()
        if (!response.ok) {
          throw new Error(typeof body?.error === 'string' ? body.error : 'Unable to verify the checkout session.')
        }
        setSession(body as CheckoutSessionResponse)
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Unable to verify the checkout session.')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
    return () => controller.abort()
  }, [sessionId])

  // Auto-redirect if session is still open (incomplete checkout)
  useEffect(() => {
    if (session?.status !== 'open') return
    const timer = window.setTimeout(() => window.location.replace('/tutoring'), 2000)
    return () => window.clearTimeout(timer)
  }, [session?.status])

  const isSuccess = !loading && !error && session?.status === 'complete'
  const isError = !loading && (error || (session && session.status !== 'complete' && session.status !== 'open'))
  const isOpen = !loading && !error && session?.status === 'open'

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      {/* Nav */}
      <nav className="flex items-center p-6 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center space-x-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">EduGuide</span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <Card className="shadow-lg">
            <CardContent className="pt-10 pb-10 text-center px-10">
              {loading && (
                <>
                  <Loader2 className="h-14 w-14 text-blue-600 animate-spin mx-auto mb-6" />
                  <h1 className="text-2xl font-bold text-gray-900 mb-3">Verifying Payment…</h1>
                  <p className="text-gray-500">Please wait while we confirm your subscription.</p>
                </>
              )}

              {isSuccess && (
                <>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
                  </motion.div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">You&apos;re all set!</h1>
                  {session?.customer_email && (
                    <p className="text-gray-600 mb-1">
                      Confirmation sent to <span className="font-medium">{session.customer_email}</span>
                    </p>
                  )}
                  <p className="text-gray-600 mb-2">
                    Your <span className="font-semibold text-blue-600">{session?.plan ?? 'support'}</span> monthly subscription is now active.
                  </p>
                  <p className="text-gray-500 text-sm mb-8">
                    Your card will be billed automatically each month. Cancel anytime from your dashboard.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg">
                      <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Go to Dashboard
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link href="/dashboard/referrals">
                        Refer a Friend
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </>
              )}

              {isOpen && (
                <>
                  <AlertCircle className="h-14 w-14 text-amber-500 mx-auto mb-6" />
                  <h1 className="text-2xl font-bold text-gray-900 mb-3">Checkout Incomplete</h1>
                  <p className="text-gray-600 mb-8">
                    Your checkout session is still open. Redirecting you back to complete it…
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/tutoring">Back to Tutoring</Link>
                  </Button>
                </>
              )}

              {isError && (
                <>
                  <AlertCircle className="h-14 w-14 text-red-500 mx-auto mb-6" />
                  <h1 className="text-2xl font-bold text-gray-900 mb-3">Unable to Confirm Payment</h1>
                  <p className="text-gray-600 mb-8">{error ?? 'This checkout session is no longer active. Please start a new checkout.'}</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg">
                      <Link href="/tutoring">Try Again</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link href="/contact">Contact Support</Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
