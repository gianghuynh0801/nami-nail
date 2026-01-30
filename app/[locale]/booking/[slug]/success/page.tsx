import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-beige-light via-white to-beige-light flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-primary-400 mb-4">
          Booking Successful! 🎉
        </h1>
        <p className="text-gray-600 mb-6">
          Your appointment has been confirmed. We will contact you soon.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors font-medium"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}

