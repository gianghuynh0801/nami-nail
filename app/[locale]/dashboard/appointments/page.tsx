'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight, LayoutGrid, List, Plus } from 'lucide-react'
import { format, addDays, subDays, isToday, addMinutes, differenceInMinutes } from 'date-fns'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { DndProvider } from 'react-dnd'
import { MultiBackend } from 'react-dnd-multi-backend'
import { HTML5toTouch } from 'rdndmb-html5-to-touch'
import moment from 'moment'
import { BookingWizardModal } from '@/components/booking-wizard'
import EventDetailModal from '@/components/dashboard/EventDetailModal'
import CustomEvent from '@/components/dashboard/CustomEvent'
import WeeklyTimelineView from '@/components/dashboard/WeeklyTimelineView'
import { useSalonContext } from '@/contexts/SalonContext'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

const localizer = momentLocalizer(moment)
const DragAndDropCalendar = withDragAndDrop(Calendar)

export default function AppointmentsPage() {
  // Use salon from global context instead of local state
  const { selectedSalonId, selectedSalon, loading: salonLoading } = useSalonContext()
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<View>('month')
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [useTimelineView, setUseTimelineView] = useState(false)

  // Fetch data when salon changes
  useEffect(() => {
    if (selectedSalonId) {
      fetchAppointments()
      fetchSalonData()
    } else {
      setLoading(false)
    }
  }, [selectedSalonId, view, selectedDate])

  const fetchSalonData = async () => {
    if (!selectedSalonId) {
      console.log('No salon selected, skipping fetchSalonData')
      return
    }

    try {
      console.log('Fetching salon data for:', selectedSalonId)
      const res = await fetch(`/api/salon/${selectedSalonId}`)
      if (res.ok) {
        const data = await res.json()
        console.log('Salon data received:', data)
        setServices(data.salon.services || [])
        setStaff(data.salon.staff || [])
        console.log('Services:', data.salon.services?.length || 0, 'Staff:', data.salon.staff?.length || 0)
      } else {
        const error = await res.json()
        console.error('Error fetching salon data:', error)
      }
    } catch (error) {
      console.error('Error fetching salon data:', error)
    }
  }

  const fetchAppointments = async () => {
    if (!selectedSalonId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let startDate: Date
      let endDate: Date

      if (view === 'month') {
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
      } else if (view === 'week') {
        const start = moment(selectedDate).startOf('week').toDate()
        const end = moment(selectedDate).endOf('week').toDate()
        startDate = start
        endDate = end
      } else {
        startDate = moment(selectedDate).startOf('day').toDate()
        endDate = moment(selectedDate).endOf('day').toDate()
      }

      const url = `/api/appointments?salonId=${selectedSalonId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      console.log('Fetching appointments from:', url)

      const res = await fetch(url)

      if (res.ok) {
        const data = await res.json()
        console.log('Appointments data:', data)
        setAppointments(data.appointments || [])
      } else {
        const error = await res.json()
        console.error('Error fetching appointments:', error)
        setAppointments([])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const filteredAppointments = useMemo(() => {
    let filtered = appointments

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (apt) =>
          apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.customerPhone.includes(searchQuery)
      )
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((apt) => apt.status === statusFilter)
    }

    return filtered
  }, [appointments, searchQuery, statusFilter])

  const events = useMemo(() => {
    return filteredAppointments.map((apt) => ({
      id: apt.id,
      title: `${apt.customerName} - ${apt.service?.name || 'Unknown Service'}`,
      start: new Date(apt.startTime),
      end: new Date(apt.endTime),
      resource: apt,
    }))
  }, [filteredAppointments])

  const handleSelectEvent = async (event: any) => {
    const appointment = event.resource || event
    // If appointment doesn't have full details, fetch it
    if (!appointment.service || !appointment.staff) {
      try {
        const res = await fetch(`/api/appointments/${appointment.id}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedAppointment(data.appointment)
        } else {
          setSelectedAppointment(appointment)
        }
      } catch (error) {
        console.error('Error fetching appointment details:', error)
        setSelectedAppointment(appointment)
      }
    } else {
      setSelectedAppointment(appointment)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedAppointment(null)
  }

  const handleUpdate = () => {
    fetchAppointments()
  }

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (!selectedSalonId) {
      console.warn('No salon selected, cannot create appointment')
      alert('Please select a salon first')
      return
    }
    
    console.log('Slot selected:', { start, end, selectedSalonId, servicesCount: services.length, staffCount: staff.length })
    
    // Set default end time (1 hour from start)
    const defaultEnd = addMinutes(start, 60)
    setSelectedSlot({ start, end: defaultEnd })
    setIsCreateModalOpen(true)
    
    // Ensure salon data is loaded
    if (services.length === 0 || staff.length === 0) {
      console.log('Services or staff empty, fetching salon data...')
      fetchSalonData()
    }
  }

  // Drag and drop handlers
  const handleEventDrop = async ({ event, start, end }: any) => {
    const appointment = event.resource
    
    if (!appointment) {
      console.error('No appointment in event resource')
      return
    }

    // Calculate duration from original appointment
    const originalStart = new Date(appointment.startTime)
    const originalEnd = new Date(appointment.endTime)
    const duration = differenceInMinutes(originalEnd, originalStart)
    
    // Calculate new end time based on duration
    const newEnd = addMinutes(start, duration)

    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: newEnd.toISOString(),
        }),
      })

      if (res.ok) {
        await fetchAppointments()
      } else {
        const error = await res.json()
        alert(error.error || 'Không thể di chuyển lịch hẹn')
        await fetchAppointments() // Refresh to revert
      }
    } catch (error) {
      console.error('Error moving appointment:', error)
      alert('Có lỗi xảy ra khi di chuyển lịch hẹn')
      await fetchAppointments() // Refresh to revert
    }
  }

  const handleEventResize = async ({ event, start, end }: any) => {
    const appointment = event.resource

    if (!appointment) {
      console.error('No appointment in event resource')
      return
    }

    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      })

      if (res.ok) {
        await fetchAppointments()
      } else {
        const error = await res.json()
        alert(error.error || 'Không thể thay đổi thời gian lịch hẹn')
        await fetchAppointments() // Refresh to revert
      }
    } catch (error) {
      console.error('Error resizing appointment:', error)
      alert('Có lỗi xảy ra khi thay đổi thời gian')
      await fetchAppointments() // Refresh to revert
    }
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

  const goToPreviousDay = () => {
    if (view === 'day') {
      setSelectedDate(subDays(selectedDate, 1))
    } else {
      setSelectedDate(moment(selectedDate).subtract(1, view === 'month' ? 'month' : 'week').toDate())
    }
  }

  const goToNextDay = () => {
    if (view === 'day') {
      setSelectedDate(addDays(selectedDate, 1))
    } else {
      setSelectedDate(moment(selectedDate).add(1, view === 'month' ? 'month' : 'week').toDate())
    }
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const dateText = isToday(selectedDate)
    ? `Today, ${format(selectedDate, 'MMM dd, yyyy')}`
    : format(selectedDate, 'EEEE, MMM dd, yyyy')

  return (
    <div className="space-y-6">
      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>

      {/* Control Bar */}
      <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 space-y-3 md:space-y-0 md:flex md:items-center md:gap-3 md:flex-wrap">
        {/* First Row - Search only (no salon dropdown, using context) */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
          {/* Current Salon Display */}
          {selectedSalon && (
            <div className="px-4 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm font-medium text-primary-700">
              {selectedSalon.name}
            </div>
          )}

          {/* Search */}
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, số điện thoại"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Second Row - Mobile: Full width, Desktop: Auto */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setView('month')
                setUseTimelineView(false)
              }}
              className={`p-2 border rounded-lg transition-colors ${
                view === 'month' && !useTimelineView ? 'bg-primary-400 text-white border-primary-400' : 'border-gray-300 hover:bg-beige-light'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => {
                setView('week')
                setUseTimelineView(true)
              }}
              className={`p-2 border rounded-lg transition-colors ${
                useTimelineView ? 'bg-primary-400 text-white border-primary-400' : 'border-gray-300 hover:bg-beige-light'
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          {/* Create Appointment Button */}
          <button 
            onClick={() => {
              const now = new Date()
              const defaultEnd = addMinutes(now, 60)
              setSelectedSlot({ start: now, end: defaultEnd })
              setIsCreateModalOpen(true)
              if (services.length === 0 || staff.length === 0) {
                fetchSalonData()
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2 text-sm md:text-base bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors font-medium"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">New Appointment</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 flex items-center justify-between">
        <button
          onClick={goToPreviousDay}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
        </button>
        
        <button
          onClick={goToToday}
          className="text-sm md:text-base text-gray-700 font-medium hover:text-primary-600 transition-colors px-2 text-center"
        >
          <span className="hidden sm:inline">{dateText}</span>
          <span className="sm:hidden">{format(selectedDate, 'MMM dd')}</span>
        </button>
        
        <button
          onClick={goToNextDay}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        {salonLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        ) : !selectedSalonId ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Vui lòng chọn chi nhánh từ menu trên cùng.</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
            <p className="mt-4 text-gray-600">Loading appointments...</p>
          </div>
        ) : useTimelineView ? (
          <WeeklyTimelineView
            selectedDate={selectedDate}
            appointments={filteredAppointments}
            onDateChange={setSelectedDate}
            onAppointmentClick={handleSelectEvent}
            onSlotClick={(date, time) => {
              const [hours, minutes] = time.split(':').map(Number)
              const start = new Date(date)
              start.setHours(hours, minutes, 0, 0)
              const end = addMinutes(start, 60)
              handleSelectSlot({ start, end })
            }}
          />
        ) : (
          <div className="h-[400px] sm:h-[500px] md:h-[600px] w-full overflow-x-auto">
            <DndProvider backend={MultiBackend} options={HTML5toTouch}>
              <DragAndDropCalendar
                localizer={localizer}
                events={events}
                startAccessor={(event: any) => new Date(event.start)}
                endAccessor={(event: any) => new Date(event.end)}
                view={view}
                onView={setView}
                date={selectedDate}
                onNavigate={setSelectedDate}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                selectable
                resizable
                draggableAccessor={() => true}
                eventPropGetter={eventStyleGetter}
                components={{
                  event: CustomEvent,
                }}
                messages={{
                  next: 'Next',
                  previous: 'Previous',
                  today: 'Today',
                  month: 'Month',
                  week: 'Week',
                  day: 'Day',
                  agenda: 'Agenda',
                }}
                style={{ height: '100%', minWidth: '600px' }}
              />
            </DndProvider>
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        appointment={selectedAppointment}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleUpdate}
      />

      {/* Booking Wizard Modal */}
      <BookingWizardModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setSelectedSlot(null)
        }}
        initialSalonId={selectedSalonId || undefined}
        initialDateTime={selectedSlot ? {
           date: format(selectedSlot.start, 'yyyy-MM-dd'),
           time: format(selectedSlot.start, 'HH:mm')
        } : undefined}
        onSuccess={() => {
          fetchAppointments()
          setIsCreateModalOpen(false)
          setSelectedSlot(null)
        }}
      />
    </div>
  )
}

