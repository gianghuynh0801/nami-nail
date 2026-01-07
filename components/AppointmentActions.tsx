'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Appointment {
  id: string
  status: string
}

export default function AppointmentActions({ appointment }: { appointment: Appointment }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const updateStatus = async (status: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/appointment/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      {appointment.status === 'PENDING' && (
        <>
          <button
            onClick={() => updateStatus('CONFIRMED')}
            disabled={loading}
            className="text-green-600 hover:text-green-800 text-sm disabled:opacity-50"
          >
            Xác nhận
          </button>
          <button
            onClick={() => updateStatus('CANCELLED')}
            disabled={loading}
            className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
          >
            Hủy
          </button>
        </>
      )}
      {appointment.status === 'CONFIRMED' && (
        <>
          <button
            onClick={() => updateStatus('COMPLETED')}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
          >
            Hoàn thành
          </button>
          <button
            onClick={() => updateStatus('CANCELLED')}
            disabled={loading}
            className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
          >
            Hủy
          </button>
        </>
      )}
      {appointment.status === 'CANCELLED' && (
        <button
          onClick={() => updateStatus('PENDING')}
          disabled={loading}
          className="text-yellow-600 hover:text-yellow-800 text-sm disabled:opacity-50"
        >
          Khôi phục
        </button>
      )}
    </div>
  )
}

