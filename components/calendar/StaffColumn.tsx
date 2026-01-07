'use client'

import { useCallback, useMemo } from 'react'
import { getHours, getMinutes, parseISO } from 'date-fns'
import AppointmentBlock from './AppointmentBlock'
import TimeSlot from './TimeSlot'
import { CALENDAR_CONFIG, HOURS } from './constants'
import type { CalendarStaff, CalendarAppointment, DragState } from './types'

interface StaffColumnProps {
  staff: CalendarStaff
  selectedDate: Date
  dragState: DragState
  onDragStart: (appointment: CalendarAppointment, staffId: string) => void
  onDrop: (staffId: string, time: string) => void
  onAppointmentClick?: (appointment: CalendarAppointment) => void
  onTimeSlotClick?: (staffId: string, time: string, date: Date) => void
}

export default function StaffColumn({
  staff,
  selectedDate,
  dragState,
  onDragStart,
  onDrop,
  onAppointmentClick,
  onTimeSlotClick,
}: StaffColumnProps) {
  
  const isWorkingHour = useCallback((hour: number, minute: number): 'working' | 'break' | false => {
    if (!staff.workingHours) return false
    
    const time = hour * 60 + minute
    const [startH, startM] = staff.workingHours.start.split(':').map(Number)
    const [endH, endM] = staff.workingHours.end.split(':').map(Number)
    const startTime = startH * 60 + startM
    const endTime = endH * 60 + endM
    
    // Check if in break time
    if (staff.workingHours.breakStart && staff.workingHours.breakEnd) {
      const [breakStartH, breakStartM] = staff.workingHours.breakStart.split(':').map(Number)
      const [breakEndH, breakEndM] = staff.workingHours.breakEnd.split(':').map(Number)
      const breakStart = breakStartH * 60 + breakStartM
      const breakEnd = breakEndH * 60 + breakEndM
      
      if (time >= breakStart && time < breakEnd) {
        return 'break'
      }
    }
    
    return time >= startTime && time < endTime ? 'working' : false
  }, [staff.workingHours])

  const getAppointmentPosition = useCallback((appointment: CalendarAppointment) => {
    const start = parseISO(appointment.startTime)
    const end = parseISO(appointment.endTime)
    
    const startHour = getHours(start)
    const startMinute = getMinutes(start)
    const endHour = getHours(end)
    const endMinute = getMinutes(end)
    
    const top = startHour * CALENDAR_CONFIG.HOUR_HEIGHT + 
                (startMinute / 60) * CALENDAR_CONFIG.HOUR_HEIGHT
    
    const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
    const height = (durationMinutes / 60) * CALENDAR_CONFIG.HOUR_HEIGHT
    
    return { top, height: Math.max(height, CALENDAR_CONFIG.SLOT_HEIGHT) }
  }, [])

  const isDragOver = dragState.isDragging && 
                     dragState.dropTarget?.staffId === staff.id

  // Memoize time slots
  const timeSlots = useMemo(() => {
    const slots: Array<{ hour: number; minute: number; time: string }> = []
    HOURS.forEach(hour => {
      [0, 15, 30, 45].forEach(minute => {
        slots.push({
          hour,
          minute,
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        })
      })
    })
    return slots
  }, [])

  const handleColumnClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onTimeSlotClick) return
    
    // Only handle if clicking directly on the column, not on appointments
    const target = e.target as HTMLElement
    if (target.closest('[data-appointment]')) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    
    // Calculate which hour and minute was clicked
    const clickedHour = Math.floor(clickY / CALENDAR_CONFIG.HOUR_HEIGHT)
    const remainderY = clickY % CALENDAR_CONFIG.HOUR_HEIGHT
    const clickedMinute = Math.floor((remainderY / CALENDAR_CONFIG.HOUR_HEIGHT) * 60)
    
    // Round to nearest 15-minute slot
    const roundedMinute = Math.floor(clickedMinute / 15) * 15
    const time = `${clickedHour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')}`
    
    // Check if it's a working hour
    const workingStatus = isWorkingHour(clickedHour, roundedMinute)
    if (workingStatus !== 'working') return
    
    // Check if there's an appointment at this time
    const slotDateTime = new Date(selectedDate)
    slotDateTime.setHours(clickedHour, roundedMinute, 0, 0)
    slotDateTime.setSeconds(0, 0)
    const slotEndDateTime = new Date(slotDateTime)
    slotEndDateTime.setMinutes(slotEndDateTime.getMinutes() + 15)
    
    const hasAppointment = staff.appointments.some((apt) => {
      const aptStart = parseISO(apt.startTime)
      const aptEnd = parseISO(apt.endTime)
      return slotDateTime < aptEnd && slotEndDateTime > aptStart
    })
    
    if (hasAppointment) return
    
    console.log('✅ Column clicked!', { 
      staffId: staff.id, 
      staffName: staff.name,
      time, 
      date: selectedDate,
      clickedHour,
      roundedMinute,
      clickY
    })
    
    onTimeSlotClick(staff.id, time, selectedDate)
  }, [onTimeSlotClick, staff, selectedDate, isWorkingHour])

  return (
    <div
      className="flex-shrink-0 border-r border-beige-dark relative bg-white cursor-pointer"
      style={{ 
        width: CALENDAR_CONFIG.COLUMN_MIN_WIDTH,
        minWidth: CALENDAR_CONFIG.COLUMN_MIN_WIDTH,
      }}
      onClick={handleColumnClick}
    >
      {/* Hour grid lines */}
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="border-b border-beige-dark/30 relative"
          style={{ height: CALENDAR_CONFIG.HOUR_HEIGHT }}
        >
          {/* 15-minute time slots */}
          {[0, 15, 30, 45].map((minute) => {
            const workingStatus = isWorkingHour(hour, minute)
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            const isDropTarget = isDragOver && dragState.dropTarget?.time === time
            
            // Check if there's an appointment at this time slot
            const slotDateTime = new Date(selectedDate)
            slotDateTime.setHours(hour, minute, 0, 0)
            const slotEndDateTime = new Date(slotDateTime)
            slotEndDateTime.setMinutes(slotEndDateTime.getMinutes() + 15)
            
            const hasAppointment = staff.appointments.some((apt) => {
              const aptStart = parseISO(apt.startTime)
              const aptEnd = parseISO(apt.endTime)
              // Check if slot overlaps with appointment
              return slotDateTime < aptEnd && slotEndDateTime > aptStart
            })
            
            return (
              <TimeSlot
                key={minute}
                staffId={staff.id}
                time={time}
                minute={minute}
                isWorking={workingStatus === 'working'}
                isBreak={workingStatus === 'break'}
                isDropTarget={isDropTarget}
                onDrop={onDrop}
                onClick={undefined}
              />
            )
          })}
        </div>
      ))}


      {/* Appointments layer */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30 }}>
        {staff.appointments.map((appointment) => {
          const { top, height } = getAppointmentPosition(appointment)
          const isDragging = dragState.draggedAppointment?.id === appointment.id
          
          return (
            <div key={appointment.id} className="pointer-events-auto" data-appointment={appointment.id}>
              <AppointmentBlock
                appointment={appointment}
                top={top}
                height={height}
                isDragging={isDragging}
                onDragStart={() => onDragStart(appointment, staff.id)}
                onClick={() => onAppointmentClick?.(appointment)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
