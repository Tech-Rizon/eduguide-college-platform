import Link from 'next/link'

export default function CanceledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white p-6">
      <div className="max-w-xl w-full bg-white shadow-md rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Payment Canceled</h1>
        <p className="text-gray-700 mb-6">Your payment was canceled. You can retry or contact support if you need help.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/tutoring">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
          </Link>
          <Link href="/contact">
            <button className="px-4 py-2 border rounded">Contact Support</button>
          </Link>
        </div>
      </div>
    </div>
  )
}
