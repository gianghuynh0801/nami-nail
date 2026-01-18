'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import StaffCalendarView from '@/components/calendar/StaffCalendarView'
import { BookingWizardModal } from '@/components/booking-wizard'
import { useSalonContext } from '@/contexts/SalonContext'

export default function CalendarPage() {
  const { data: session } = useSession()
  const { selectedSalonId, selectedSalon, loading: salonLoading } = useSalonContext()
  const [showBookingWizard, setShowBookingWizard] = useState(false)
  const [initialStaffId, setInitialStaffId] = useState<string | undefined>()
  const [initialDateTime, setInitialDateTime] = useState<{ date: string; time: string } | undefined>()
  
  const isAdmin = session?.user?.role === 'OWNER'

  const handleBookingSuccess = (appointmentId: string) => {
    console.log('Booking created:', appointmentId)
    // The calendar will auto-refresh via socket.io
  }

  if (salonLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto" />
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!selectedSalonId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Vui lòng chọn chi nhánh từ menu trên cùng.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full -m-4 lg:-m-6">
      {/* Current Salon Display */}
      {selectedSalon && (
        <div className="px-4 lg:px-6 py-3 bg-white border-b border-beige-dark">
          <div className="px-4 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm font-medium text-primary-700 inline-block">
            {selectedSalon.name}
          </div>
        </div>
      )}

      {/* Calendar View */}
      <StaffCalendarView 
        salonId={selectedSalonId}
        isAdmin={isAdmin}
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

      {/* Booking Wizard Modal */}
      <BookingWizardModal
        isOpen={showBookingWizard}
        onClose={() => {
          setShowBookingWizard(false)
          setInitialStaffId(undefined)
          setInitialDateTime(undefined)
        }}
        initialSalonId={selectedSalonId}
        initialStaffId={initialStaffId}
        initialDateTime={initialDateTime}
        onSuccess={handleBookingSuccess}
      />
    </div>
  )
}
