import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GraduationCap, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function CanceledPage() {
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
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Payment Canceled</h1>
              <p className="text-gray-600 mb-8">
                No worries — your checkout was canceled and you have not been charged.
                You can try again whenever you&apos;re ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg">
                  <Link href="/tutoring">Try Again</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/contact">Contact Support</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
