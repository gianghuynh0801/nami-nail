'use client'

import { useRef, useState, useCallback } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { GripVertical } from 'lucide-react'
import { CALENDAR_CONFIG, STATUS_COLORS } from './constants'
import type { CalendarAppointment } from './types'
import { getDisplayNotes, parseExtraServices } from './AppointmentDetailModal'

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
  const dragStartTime = useRef<number | null>(null)
  const isDragHandle = useRef(false)
  const [isPreparingDrag, setIsPreparingDrag] = useState(false)
  const totalMovement = useRef(0) // Track total mouse movement to distinguish click from drag intent
  const dragWasTriggered = useRef(false) // Flag to prevent click after drag

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
    
    // Check if click is on drag handle
    const target = e.target as HTMLElement
    const clickedOnHandle = target.closest('[data-drag-handle]') !== null
    isDragHandle.current = clickedOnHandle
    
    mouseStartPos.current = { x: e.clientX, y: e.clientY }
    isDraggingMouse.current = false
    hasMoved.current = false
    dragStartTime.current = Date.now()
    totalMovement.current = 0
    dragWasTriggered.current = false

    // Add global mouse move and up listeners
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (mouseStartPos.current && !isDraggingMouse.current) {
        const deltaX = Math.abs(e.clientX - mouseStartPos.current.x)
        const deltaY = Math.abs(e.clientY - mouseStartPos.current.y)
        const timeSinceStart = dragStartTime.current ? Date.now() - dragStartTime.current : 0
        
        // Accumulate total movement
        totalMovement.current = Math.max(totalMovement.current, deltaX + deltaY)
        
        // Dynamic threshold based on time held:
        // - If clicked on drag handle: 6px
        // - If held > 200ms: 6px (user intends to drag)
        // - Otherwise: 10px
        let threshold = 10
        if (clickedOnHandle) {
          threshold = 6
        } else if (timeSinceStart > 200) {
          threshold = 6 // Lower threshold after holding
        }
        
        // Show visual feedback when starting to move (but before threshold)
        if (deltaX > 3 || deltaY > 3) {
          setIsPreparingDrag(true)
        }
        
        if (deltaX > threshold || deltaY > threshold) {
          console.log('Block: Drag triggered', appointment.id, { deltaX, deltaY, threshold, timeSinceStart })
          hasMoved.current = true
          isDraggingMouse.current = true
          dragWasTriggered.current = true
          if (mouseDownTimer.current) {
            clearTimeout(mouseDownTimer.current)
            mouseDownTimer.current = null
          }
          onDragStart()
        }
      }
    }

    const handleGlobalMouseUp = () => {
      const timeSinceStart = dragStartTime.current ? Date.now() - dragStartTime.current : 0
      
      // IMPORTANT: If there was any significant movement, prevent the native click event
      // from bubbling up to the column (which would trigger onTimeSlotClick)
      if (totalMovement.current > 3 || dragWasTriggered.current || isDraggingMouse.current) {
        const preventClick = (e: MouseEvent) => {
          e.stopPropagation()
          e.preventDefault()
          document.removeEventListener('click', preventClick, true)
        }
        // Use capture phase to intercept click before it reaches column
        document.addEventListener('click', preventClick, true)
        // Clean up after a short delay in case click doesn't fire
        setTimeout(() => {
          document.removeEventListener('click', preventClick, true)
        }, 100)
      }
      
      // Only treat as click if ALL conditions are met:
      // 1. Drag was NOT triggered
      // 2. Total movement is very minimal (< 5px) - genuine click, no wobble
      // 3. Time held is short (< 250ms) - quick tap, not hold-and-release
      // 4. If held longer (> 150ms), require even less movement (< 3px)
      // 5. Not clicked on drag handle (or very quick click on handle)
      const hasMinimalMovement = totalMovement.current < 5
      const isQuickTap = timeSinceStart < 150
      const isHoldWithNoMove = timeSinceStart >= 150 && timeSinceStart < 250 && totalMovement.current < 3
      
      const shouldClick = mouseStartPos.current && 
                         !dragWasTriggered.current && 
                         !isDraggingMouse.current && 
                         !hasMoved.current && 
                         (isQuickTap || isHoldWithNoMove) &&
                         hasMinimalMovement &&
                         (!clickedOnHandle || timeSinceStart < 100) &&
                         onClick
      
      console.log('Block: MouseUp check', {
        dragWasTriggered: dragWasTriggered.current,
        isDraggingMouse: isDraggingMouse.current,
        totalMovement: totalMovement.current,
        timeSinceStart,
        isQuickTap,
        isHoldWithNoMove,
        shouldClick: !!shouldClick
      })
      
      if (shouldClick) {
        onClick()
      }
      
      // Cleanup
      mouseStartPos.current = null
      isDraggingMouse.current = false
      hasMoved.current = false
      dragStartTime.current = null
      isDragHandle.current = false
      totalMovement.current = 0
      // Keep dragWasTriggered true for a brief moment to prevent any delayed click handlers
      setTimeout(() => {
        dragWasTriggered.current = false
      }, 100)
      setIsPreparingDrag(false)
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
  }, [onDragStart, onClick, appointment.id])

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
        absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer
        transition-all duration-150 select-none overflow-hidden group
        ${isDragging ? 'opacity-30 border-dashed border-2 border-primary-400 bg-primary-100 pointer-events-none scale-105' : 'pointer-events-auto shadow-sm hover:shadow-md hover:z-10'}
        ${!isDragging && colors.bg} ${!isDragging && colors.border} ${!isDragging && colors.text}
        ${!isDragging && 'border-l-4'}
        ${isLongPressing ? 'scale-105 shadow-lg' : ''}
        ${isPreparingDrag && !isDragging ? 'scale-[1.02] shadow-md ring-2 ring-primary-300 ring-opacity-50' : ''}
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
      {/* Drag Handle - Top Right Corner (positioned to avoid conflict with status indicators) */}
      {!isDragging && (
        <div
          data-drag-handle
          className="absolute top-1 right-4 opacity-0 group-hover:opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity duration-150 z-30 p-0.5 rounded bg-white/80 backdrop-blur-sm shadow-sm"
          onMouseDown={(e) => {
            e.stopPropagation()
            handleMouseDown(e)
          }}
          title="Kéo để di chuyển lịch hẹn"
        >
          <GripVertical className="w-3 h-3 text-gray-600" />
        </div>
      )}
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
        
        {/* Extra services indicator */}
        {height >= 56 && parseExtraServices(appointment.notes).length > 0 && (
          <p className="text-[10px] opacity-90 leading-tight text-green-600 font-medium">
            +{parseExtraServices(appointment.notes).length} dịch vụ thêm
          </p>
        )}
        
        {height >= 72 && getDisplayNotes(appointment.notes) && (
          <p className="text-[10px] opacity-75 truncate leading-tight mt-0.5">
            📝 {getDisplayNotes(appointment.notes)}
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
