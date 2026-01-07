import Link from 'next/link'

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-pink-light via-white to-pastel-yellow-light flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-green-600 text-6xl mb-4">✓</div>
        <h1 className="text-3xl font-bold text-primary-600 mb-4">
          Đặt lịch thành công!
        </h1>
        <p className="text-gray-600 mb-6">
          Lịch hẹn của bạn đã được gửi. Chúng tôi sẽ xác nhận với bạn sớm nhất có thể.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}

