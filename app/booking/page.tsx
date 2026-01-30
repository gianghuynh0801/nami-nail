'use client'

import { useState, useEffect } from 'react'
import BookingWizard from '@/components/booking/BookingWizard'

interface Salon {
  id: string
  name: string
  slug: string
  address: string
  phone: string
  timezone?: string
}

export default function BookingPage() {
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/public/salons')
      .then((res) => {
        if (!res.ok) throw new Error('Không tải được danh sách chi nhánh')
        return res.json()
      })
      .then((data) => {
        setSalons(data.salons ?? [])
        setError(null)
      })
      .catch((e) => setError(e.message ?? 'Lỗi kết nối'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-beige-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-400 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-600">Đang tải danh sách chi nhánh...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-beige-light">
        <div className="text-center max-w-md px-4">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  return <BookingWizard salons={salons} />
}
