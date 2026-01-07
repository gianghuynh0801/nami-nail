'use client'

import { useState, useEffect } from 'react'
import StaffCalendarView from '@/components/calendar/StaffCalendarView'
import { BookingWizardModal } from '@/components/booking-wizard'

export default function CalendarPage() {
  const [salonId, setSalonId] = useState<string>('')
  const [salons, setSalons] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showBookingWizard, setShowBookingWizard] = useState(false)
  const [initialStaffId, setInitialStaffId] = useState<string | undefined>()
  const [initialDateTime, setInitialDateTime] = useState<{ date: string; time: string } | undefined>()

  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const res = await fetch('/api/salon')
        if (res.ok) {
          const data = await res.json()
          setSalons(data.salons || [])
          if (data.salons?.length > 0) {
            setSalonId(data.salons[0].id)
          }
        }
      } catch (error) {
        console.error('Error fetching salons:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSalons()
  }, [])

  const handleBookingSuccess = (appointmentId: string) => {
    console.log('Booking created:', appointmentId)
    // The calendar will auto-refresh via socket.io
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto" />
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (salons.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Không tìm thấy salon</p>
          <p className="text-sm text-gray-400">Vui lòng tạo salon trước</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full -m-4 lg:-m-6">
      {/* Salon Selector - show only if multiple salons */}
      {salons.length > 1 && (
        <div className="px-4 lg:px-6 py-3 bg-white border-b border-beige-dark">
          <select
            value={salonId}
            onChange={(e) => setSalonId(e.target.value)}
            className="px-4 py-2 border border-beige-dark rounded-lg bg-white focus:ring-2 focus:ring-primary-400 focus:border-transparent text-sm"
          >
            {salons.map((salon) => (
              <option key={salon.id} value={salon.id}>
                {salon.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Calendar View */}
      {salonId && (
        <StaffCalendarView 
          salonId={salonId}
          onAddAppointment={() => {
            setInitialStaffId(undefined)
            setInitialDateTime(undefined)
            setShowBookingWizard(true)
          }}
          onAppointmentClick={(appointment) => {
            // TODO: Open appointment detail modal
            console.log('Appointment clicked:', appointment)
          }}
          onTimeSlotClick={(staffId, time, date) => {
            console.log('onTimeSlotClick called:', { staffId, time, date })
            const dateStr = date.toISOString().split('T')[0]
            setInitialStaffId(staffId)
            setInitialDateTime({ date: dateStr, time })
            setShowBookingWizard(true)
          }}
        />
      )}

      {/* Booking Wizard Modal */}
      <BookingWizardModal
        isOpen={showBookingWizard}
        onClose={() => {
          setShowBookingWizard(false)
          setInitialStaffId(undefined)
          setInitialDateTime(undefined)
        }}
        initialSalonId={salonId}
        initialStaffId={initialStaffId}
        initialDateTime={initialDateTime}
        onSuccess={handleBookingSuccess}
      />
    </div>
  )
}
