'use client'

import { useEffect } from 'react'
import { format, startOfWeek, addDays, isSameDay, getHours, getMinutes, differenceInMinutes } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Appointment {
  id: string
  customerName: string
  service: {
    name: string
  }
  staff: {
    name: string
  }
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  notes?: string | null
}

interface WeeklyTimelineViewProps {
  selectedDate: Date
  appointments: Appointment[]
  onDateChange: (date: Date) => void
  onAppointmentClick: (appointment: Appointment) => void
  onSlotClick?: (date: Date, time: string) => void
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 4) // 4:00 to 21:00
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeeklyTimelineView({
  selectedDate,
  appointments,
  onDateChange,
  onAppointmentClick,
  onSlotClick,
}: WeeklyTimelineViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-primary-400'
      case 'CANCELLED':
        return 'bg-primary-600'
      case 'COMPLETED':
        return 'bg-primary-500'
      default:
        return 'bg-primary-300'
    }
  }

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => {
      if (!apt.startTime) return false
      const aptDate = new Date(apt.startTime)
      return isSameDay(aptDate, day)
    })
  }

  const getAppointmentForHour = (appointment: Appointment, hour: number, day: Date) => {
    const start = new Date(appointment.startTime)
    const end = new Date(appointment.endTime)
    const startHour = getHours(start)
    const startMinute = getMinutes(start)
    const endHour = getHours(end)
    const endMinute = getMinutes(end)
    
    // Check if appointment overlaps with this hour
    // Use the day parameter to create hour boundaries correctly
    const hourStart = new Date(day)
    hourStart.setHours(hour, 0, 0, 0)
    hourStart.setSeconds(0, 0)
    const hourEnd = new Date(day)
    hourEnd.setHours(hour + 1, 0, 0, 0)
    hourEnd.setSeconds(0, 0)
    
    // Normalize start and end to same day for comparison
    const startNormalized = new Date(day)
    startNormalized.setHours(startHour, startMinute, 0, 0)
    const endNormalized = new Date(day)
    endNormalized.setHours(endHour, endMinute, 0, 0)
    
    // Appointment doesn't overlap with this hour
    if (endNormalized <= hourStart || startNormalized >= hourEnd) {
      return null
    }
    
    // Calculate position and height for this hour
    const isFirstHour = startHour === hour
    const isLastHour = endHour === hour
    
    let top = 0
    let height = 60 // Full hour by default (60px = 60 minutes)
    
    if (isFirstHour) {
      // Calculate top position based on minutes
      top = (startMinute / 60) * 60
    }
    
    if (isLastHour && isFirstHour) {
      // Appointment starts and ends in the same hour
      const duration = differenceInMinutes(end, start)
      height = Math.max((duration / 60) * 60, 20)
    } else if (isLastHour) {
      // Last hour - calculate height based on end minute
      height = Math.max((endMinute / 60) * 60, 20)
    } else if (!isFirstHour) {
      // Spanning hour - full height
      height = 60
    } else {
      // First hour but spans multiple hours - calculate remaining minutes
      const minutesRemaining = 60 - startMinute
      height = Math.max((minutesRemaining / 60) * 60, 20)
    }
    
    return {
      top,
      height: Math.max(height, 20), // Minimum 20px height
      isFirstHour,
      isSpanning: !isFirstHour && !isLastHour,
    }
  }

  // Debug: Log appointments to see if they're being passed
  useEffect(() => {
    console.log('WeeklyTimelineView - Appointments count:', appointments.length)
    if (appointments.length > 0) {
      console.log('WeeklyTimelineView - First appointment:', appointments[0])
      console.log('WeeklyTimelineView - First appointment startTime:', appointments[0].startTime)
      const firstAptDate = new Date(appointments[0].startTime)
      console.log('WeeklyTimelineView - First appointment parsed:', firstAptDate)
      console.log('WeeklyTimelineView - First appointment date:', format(firstAptDate, 'yyyy-MM-dd HH:mm'))
    }
    console.log('WeeklyTimelineView - Week start:', format(weekStart, 'yyyy-MM-dd'))
    console.log('WeeklyTimelineView - Week days:', weekDays.map(d => format(d, 'yyyy-MM-dd')))
    
    // Check appointments for each day
    weekDays.forEach((day) => {
      const dayApts = getAppointmentsForDay(day)
      if (dayApts.length > 0) {
        console.log(`✅ Appointments for ${format(day, 'yyyy-MM-dd')}:`, dayApts.length)
        dayApts.forEach((apt, idx) => {
          const aptStart = new Date(apt.startTime)
          console.log(`  ${idx + 1}. ${apt.customerName} - ${format(aptStart, 'HH:mm')}`)
        })
      }
    })
  }, [appointments, weekStart, weekDays])

  const handlePreviousWeek = () => {
    onDateChange(addDays(selectedDate, -7))
  }

  const handleNextWeek = () => {
    onDateChange(addDays(selectedDate, 7))
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* Header with month and navigation */}
      <div className="flex items-center justify-between mb-4 px-2">
        <button
          onClick={handlePreviousWeek}
          className="p-2 hover:bg-beige-light rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm font-medium"
          >
            Today
          </button>
          <span className="text-lg font-semibold text-gray-900">
            {format(weekStart, 'MMMM yyyy')}
          </span>
        </div>
        <button
          onClick={handleNextWeek}
          className="p-2 hover:bg-beige-light rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-beige-dark rounded-lg overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-8 border-b border-beige-dark bg-beige-light">
          <div className="p-3 border-r border-beige-dark"></div>
          {weekDays.map((day, index) => {
            const isToday = isSameDay(day, new Date())
            return (
              <div
                key={index}
                className={`p-3 text-center border-r border-beige-dark last:border-r-0 ${
                  isToday ? 'bg-primary-50' : ''
                }`}
              >
                <div className="text-xs font-medium text-gray-500 mb-1">{DAYS[index]}</div>
                <div
                  className={`text-lg font-semibold ${
                    isToday
                      ? 'w-8 h-8 rounded-full bg-primary-400 text-white flex items-center justify-center mx-auto'
                      : 'text-gray-900'
                  }`}
                >
                  {format(day, 'd')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Time slots and appointments */}
        <div className="overflow-y-auto max-h-[600px]">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-beige-dark last:border-b-0">
              {/* Time label */}
              <div className="p-2 border-r border-beige-dark bg-beige-light text-sm font-medium text-gray-600 text-center">
                {hour.toString().padStart(2, '0')}:00
              </div>

              {/* Day columns */}
              {weekDays.map((day, dayIndex) => {
                const dayAppointments = getAppointmentsForDay(day)
                const isToday = isSameDay(day, new Date())

                return (
                  <div
                    key={dayIndex}
                    className={`relative border-r border-beige-dark last:border-r-0 min-h-[60px] ${
                      isToday ? 'bg-primary-50/30' : ''
                    }`}
                    onClick={(e) => {
                      if (onSlotClick && e.target === e.currentTarget) {
                        const clickedTime = new Date(day)
                        clickedTime.setHours(hour, 0, 0, 0)
                        onSlotClick(clickedTime, `${hour.toString().padStart(2, '0')}:00`)
                      }
                    }}
                  >
                    {dayAppointments
                      .filter((apt) => {
                        // Pre-check if appointment could be in this hour
                        const aptStart = new Date(apt.startTime)
                        const aptEnd = new Date(apt.endTime)
                        const aptStartHour = getHours(aptStart)
                        const aptEndHour = getHours(aptEnd)
                        
                        // Check if appointment could overlap with this hour
                        return (aptStartHour <= hour && hour <= aptEndHour) || 
                               (aptStartHour < hour && aptEndHour > hour) ||
                               (aptStartHour === hour) ||
                               (aptEndHour === hour)
                      })
                      .map((apt) => {
                        const position = getAppointmentForHour(apt, hour, day)
                        if (!position) {
                          // Debug: Log why position is null
                          const aptStart = new Date(apt.startTime)
                          const aptEnd = new Date(apt.endTime)
                          const aptStartHour = getHours(aptStart)
                          const aptEndHour = getHours(aptEnd)
                          if (hour === aptStartHour || hour === aptEndHour) {
                            console.log(`Position null for ${apt.customerName} at hour ${hour}:`, {
                              aptStartHour,
                              aptEndHour,
                              hour,
                              start: apt.startTime,
                              end: apt.endTime
                            })
                          }
                          return null
                        }
                        
                        const { top, height, isFirstHour, isSpanning } = position
                        
                        return (
                          <div
                            key={`${apt.id}-${hour}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onAppointmentClick(apt)
                            }}
                            className={`absolute left-1 right-1 ${getStatusColor(apt.status)} text-white rounded px-2 py-1 text-xs cursor-pointer hover:opacity-90 transition-opacity z-10 overflow-hidden flex flex-col justify-center shadow-sm`}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              minHeight: '20px',
                            }}
                          >
                            {isFirstHour && (
                              <>
                                <div className="font-semibold truncate text-xs leading-tight">{apt.customerName}</div>
                                <div className="text-[10px] opacity-90 truncate leading-tight">{apt.service?.name || 'Service'}</div>
                                {apt.notes && (
                                  <div className="text-[10px] opacity-75 mt-0.5">📝</div>
                                )}
                              </>
                            )}
                            {isSpanning && (
                              <div className="text-[10px] opacity-75 truncate leading-tight">{apt.customerName}</div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Horizontal scroll indicator */}
      <div className="mt-2 text-center text-xs text-gray-500 md:hidden">
        ← Swipe to view other days →
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary-300"></div>
          <span className="text-gray-600">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary-400"></div>
          <span className="text-gray-600">Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary-500"></div>
          <span className="text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary-600"></div>
          <span className="text-gray-600">Cancelled</span>
        </div>
      </div>
    </div>
  )
}

