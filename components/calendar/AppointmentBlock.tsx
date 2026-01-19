'use client'

import { useRef, useState, useCallback } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { CALENDAR_CONFIG, STATUS_COLORS } from './constants'
import type { CalendarAppointment } from './types'

interface AppointmentBlockProps {
  appointment: CalendarAppointment
  top: number
  height: number
  isDragging: boolean
  onDragStart: () => void
  onClick?: () => void
}

export default function AppointmentBlock({
  appointment,
  top,
  height,
  isDragging,
  onDragStart,
  onClick,
}: AppointmentBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const mouseStartPos = useRef<{ x: number; y: number } | null>(null)
  const isDraggingMouse = useRef(false)
  const mouseDownTimer = useRef<NodeJS.Timeout | null>(null)
  const hasMoved = useRef(false)

  const colors = STATUS_COLORS[appointment.status]
  const startTime = format(parseISO(appointment.startTime), 'HH:mm')
  const endTime = format(parseISO(appointment.endTime), 'HH:mm')
  
  // Calculate waiting time if checked in but not started
  const waitingTime = appointment.status === 'CHECKED_IN' && appointment.checkedInAt && !appointment.startedAt
    ? (() => {
        const checkedIn = parseISO(appointment.checkedInAt)
        const now = new Date()
        const minutes = differenceInMinutes(now, checkedIn)
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hours > 0) {
          return `${hours}h${mins > 0 ? ` ${mins}p` : ''}`
        }
        return `${mins}p`
      })()
    : null
  
  // Format check-in to start time range
  const waitingTimeRange = appointment.status === 'CHECKED_IN' && appointment.checkedInAt && appointment.startedAt
    ? `${format(parseISO(appointment.checkedInAt), 'HH:mm')} - ${format(parseISO(appointment.startedAt), 'HH:mm')}`
    : null

  // Mouse drag - use global mouse events to track movement
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    mouseStartPos.current = { x: e.clientX, y: e.clientY }
    isDraggingMouse.current = false
    hasMoved.current = false

    // Add global mouse move and up listeners
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (mouseStartPos.current && !isDraggingMouse.current) {
        const deltaX = Math.abs(e.clientX - mouseStartPos.current.x)
        const deltaY = Math.abs(e.clientY - mouseStartPos.current.y)
        
        // If mouse moved more than 5px, start dragging
        if (deltaX > 5 || deltaY > 5) {
          console.log('Block: Drag triggered', appointment.id)
          hasMoved.current = true
          isDraggingMouse.current = true
          if (mouseDownTimer.current) {
            clearTimeout(mouseDownTimer.current)
            mouseDownTimer.current = null
          }
          onDragStart()
        }
      }
    }

    const handleGlobalMouseUp = () => {
      if (mouseStartPos.current && !isDraggingMouse.current && !hasMoved.current && onClick) {
        // If mouse didn't move, treat as click
        onClick()
      }
      
      // Cleanup
      mouseStartPos.current = null
      isDraggingMouse.current = false
      hasMoved.current = false
      if (mouseDownTimer.current) {
        clearTimeout(mouseDownTimer.current)
        mouseDownTimer.current = null
      }
      
      // Remove global listeners
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }

    // Add global listeners
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }, [onDragStart, onClick])

  // Touch drag (long press)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true)
      onDragStart()
      // Vibrate for feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, CALENDAR_CONFIG.LONG_PRESS_DELAY)
  }, [onDragStart])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    // If not long pressing, treat as click
    if (!isLongPressing && onClick) {
      onClick()
    }
    
    setIsLongPressing(false)
    touchStartPos.current = null
  }, [isLongPressing, onClick])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long press if user moves finger too much before timer fires
    if (!isLongPressing && longPressTimer.current && touchStartPos.current) {
      const touch = e.touches[0]
      const deltaX = Math.abs(touch.clientX - touchStartPos.current.x)
      const deltaY = Math.abs(touch.clientY - touchStartPos.current.y)
      
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
  }, [isLongPressing])

  return (
    <div
      ref={blockRef}
      className={`
        absolute left-1 right-1 rounded-lg px-2 py-1 cursor-grab
        transition-all duration-150 select-none overflow-hidden
        ${isDragging ? 'opacity-30 border-dashed border-2 border-primary-400 bg-primary-100 pointer-events-none' : 'pointer-events-auto shadow-sm hover:shadow-md hover:scale-[1.02] hover:z-10'}
        ${!isDragging && colors.bg} ${!isDragging && colors.border} ${!isDragging && colors.text}
        ${!isDragging && 'border-l-4'}
        active:cursor-grabbing active:shadow-lg active:scale-105
        ${isLongPressing ? 'scale-105 shadow-lg' : ''}
      `}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        minHeight: '24px',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Queue number badge - top left */}
      {appointment.status === 'CHECKED_IN' && appointment.queueNumber && (
        <div className="absolute top-1 left-1 z-10">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-xs font-bold text-green-700 shadow-sm border border-green-400">
            {appointment.queueNumber}
          </span>
        </div>
      )}

      {/* Content - adaptive based on height */}
      <div className="h-full flex flex-col justify-center">
        <p className="text-xs font-semibold truncate leading-tight">
          {appointment.customerName}
        </p>
        
        {height >= 40 && (
          <p className="text-[10px] opacity-90 truncate leading-tight">
            {appointment.service.name}
          </p>
        )}
        
        {height >= 56 && (
          <p className="text-[10px] opacity-75 leading-tight">
            {startTime} - {endTime}
          </p>
        )}
        
        {/* Waiting time display */}
        {height >= 56 && waitingTime && (
          <p className="text-[10px] opacity-90 leading-tight text-green-700 font-medium">
            ⏱️ Chờ: {waitingTime}
          </p>
        )}
        
        {height >= 56 && waitingTimeRange && (
          <p className="text-[10px] opacity-90 leading-tight text-green-700">
            ⏱️ {waitingTimeRange}
          </p>
        )}
        
        {height >= 72 && appointment.notes && (
          <p className="text-[10px] opacity-75 truncate leading-tight mt-0.5">
            📝 {appointment.notes}
          </p>
        )}
      </div>

      {/* Status indicator */}
      {appointment.status === 'IN_PROGRESS' && (
        <div className="absolute top-1 right-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
        </div>
      )}
      
      {/* Warning indicator for long wait */}
      {appointment.status === 'CHECKED_IN' && appointment.checkedInAt && !appointment.startedAt && (() => {
        const checkedIn = parseISO(appointment.checkedInAt)
        const now = new Date()
        const minutes = differenceInMinutes(now, checkedIn)
        return minutes >= 30
      })() && (
        <div className="absolute top-1 right-1">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px]">
            ⚠️
          </span>
        </div>
      )}
    </div>
  )
}
