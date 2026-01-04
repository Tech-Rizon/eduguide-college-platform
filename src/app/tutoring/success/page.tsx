import Link from 'next/link'

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-6">
      <div className="max-w-xl w-full bg-white shadow-md rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Payment Successful</h1>
        <p className="text-gray-700 mb-6">Thank you! Your payment was processed successfully. We'll reach out with details and next steps shortly.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/tutoring">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">Back to Tutoring</button>
          </Link>
          <Link href="/dashboard">
            <button className="px-4 py-2 border rounded">Go to Dashboard</button>
          </Link>
        </div>
      </div>
    </div>
  )
}
