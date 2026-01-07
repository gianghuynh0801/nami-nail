'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import EventDetailModal from '@/components/dashboard/EventDetailModal'
import CustomEvent from '@/components/dashboard/CustomEvent'

const localizer = momentLocalizer(moment)

export default function AppointmentsTab({ salonId }: { salonId: string }) {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchAppointments()
  }, [salonId, date, view])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      let startDate: Date
      let endDate: Date

      if (view === 'month') {
        startDate = new Date(date.getFullYear(), date.getMonth(), 1)
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      } else if (view === 'week') {
        const start = moment(date).startOf('week').toDate()
        const end = moment(date).endOf('week').toDate()
        startDate = start
        endDate = end
      } else {
        startDate = moment(date).startOf('day').toDate()
        endDate = moment(date).endOf('day').toDate()
      }

      const res = await fetch(
        `/api/appointments?salonId=${salonId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )

      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments || [])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const events = useMemo(() => {
    return appointments.map((apt) => ({
      id: apt.id,
      title: `${apt.customerName} - ${apt.service.name}`,
      start: new Date(apt.startTime),
      end: new Date(apt.endTime),
      resource: apt,
    }))
  }, [appointments])

  const handleSelectEvent = (event: any) => {
    setSelectedAppointment(event.resource)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedAppointment(null)
  }

  const handleUpdate = () => {
    fetchAppointments()
  }

  const eventStyleGetter = (event: any) => {
    const apt = event.resource
    let backgroundColor = '#fbbf24' // yellow for pending

    if (apt.status === 'CONFIRMED') backgroundColor = '#10b981' // green
    else if (apt.status === 'CANCELLED') backgroundColor = '#ef4444' // red
    else if (apt.status === 'COMPLETED') backgroundColor = '#3b82f6' // blue

    return {
      style: {
        backgroundColor,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
      },
    }
  }

  if (loading) {
    return <div className="text-center py-8">Đang tải lịch hẹn...</div>
  }

  return (
    <>
      <div className="h-[600px]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={{
            event: CustomEvent,
          }}
          messages={{
            next: 'Tiếp',
            previous: 'Trước',
            today: 'Hôm nay',
            month: 'Tháng',
            week: 'Tuần',
            day: 'Ngày',
          }}
        />
      </div>

      <EventDetailModal
        appointment={selectedAppointment}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleUpdate}
      />
    </>
  )
}

