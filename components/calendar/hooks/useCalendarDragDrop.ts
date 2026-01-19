'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { CalendarAppointment, DragState } from '../types'

interface UseCalendarDragDropOptions {
  onMoveAppointment: (
    appointmentId: string,
    newStaffId: string,
    newStartTime: string
  ) => Promise<void>
  validateDrop?: (staffId: string, time: string) => boolean
}

const initialDragState: DragState = {
  isDragging: false,
  draggedAppointment: null,
  dragPosition: { x: 0, y: 0 },
  dropTarget: null,
  sourceStaffId: null,
}

export function useCalendarDragDrop({ 
  onMoveAppointment,
  validateDrop,
}: UseCalendarDragDropOptions) {
  const [dragState, setDragState] = useState<DragState>(initialDragState)
  const stateRef = useRef(dragState)

  // Sync ref with state
  useEffect(() => {
    stateRef.current = dragState
  }, [dragState])

  const handleDragStart = useCallback((
    appointment: CalendarAppointment,
    staffId: string
  ) => {
    console.log('Hook: handleDragStart', appointment.id)
    setDragState({
      isDragging: true,
      draggedAppointment: appointment,
      dragPosition: { x: 0, y: 0 },
      dropTarget: null,
      sourceStaffId: staffId,
    })
  }, [])

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
    
    // console.log('Hook: move', clientX, clientY) // Too noisy? 
    // Uncomment if needed, but maybe just log significant changes or throttle

    // Find drop target under cursor
    const elements = document.elementsFromPoint(clientX, clientY)
    let dropTarget: DragState['dropTarget'] = null
    
    // Debug log - check what we are hovering
    const elementTags = Array.from(elements).map(e => e.tagName + '.' + e.className).slice(0, 5)
    console.log('Hover elements:', elementTags)

    for (const el of elements) {
      const element = el as HTMLElement
      // Strategy 1: Direct Slot Detection
      const slot = element.dataset?.slot
      if (slot) {
        // Check if slot is valid working hour
        const isWorking = element.dataset?.working === 'true'
        if (!isWorking) {
           console.log('Slot found but not working hour', slot)
           continue // Skip this element/slot
        }

        console.log('Found slot:', slot)
        const timeIndex = slot.lastIndexOf('-')
        if (timeIndex !== -1) {
            const staffId = slot.substring(0, timeIndex)
            const time = slot.substring(timeIndex + 1)
            if (staffId && time && time.includes(':')) {
                 dropTarget = { staffId, time }
            }
        }
        break
      }
      
      // Strategy 2: Column Fallback Detection
      // If we hit the column background or valid container but missed the slot
      if (element.dataset?.staffColumn === 'true' && element.dataset?.staffId) {
         console.log('Found column:', element.dataset.staffId)
         const staffId = element.dataset.staffId
         const rect = element.getBoundingClientRect()
         const offsetY = clientY - rect.top
         
         // HARDCODED CONSTANTS need to match CALENDAR_CONFIG
         // HOUR_HEIGHT = 80
         // SLOT_INTERVAL = 15
         const HOUR_HEIGHT = 80
         
         // Calculate time
         // hour = floor(y / 80)
         // minute = (y % 80) / 80 * 60 -> round to nearest 15
         
         const hour = Math.floor(offsetY / HOUR_HEIGHT)
         const remainderY = offsetY % HOUR_HEIGHT
         const exactMinute = (remainderY / HOUR_HEIGHT) * 60
         const minute = Math.floor(exactMinute / 15) * 15
         
         if (hour >= 0 && hour <= 23) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            
            // Check validation if provided
            if (validateDrop) {
               const isValid = validateDrop(staffId, time)
               if (!isValid) {
                  console.log('Computed slot invalid (not working hour)', time)
                  break // Hit column but invalid time -> stop looking
               }
            }

            dropTarget = { staffId, time }
         }
         break
      }
    }

    setDragState(prev => ({
      ...prev,
      dragPosition: { x: clientX, y: clientY },
      dropTarget,
    }))
  }, [])

  const handleDragEnd = useCallback(async () => {
    const state = stateRef.current
    console.log('Hook: handleDragEnd', state.dropTarget)
    if (state.draggedAppointment && state.dropTarget) {
      console.log('Hook: executing move', state.dropTarget)
      await onMoveAppointment(
        state.draggedAppointment.id,
        state.dropTarget.staffId,
        state.dropTarget.time
      )
    }

    setDragState(initialDragState)
  }, [onMoveAppointment])

  // Attach global listeners when dragging
  useEffect(() => {
    if (!dragState.isDragging) return

    const onMove = (e: MouseEvent | TouchEvent) => {
        e.preventDefault() // Prevent scrolling on touch
        handleDragMove(e)
    }
    const onUp = (e: MouseEvent | TouchEvent) => handleDragEnd()

    document.addEventListener('mousemove', onMove)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchend', onUp)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchend', onUp)
    }
  }, [dragState.isDragging, handleDragMove, handleDragEnd])

  const handleDrop = useCallback(async (staffId: string, time: string) => {
    // This is for click-to-drop fallback if needed, but primary is global drag
    if (dragState.draggedAppointment) {
      await onMoveAppointment(dragState.draggedAppointment.id, staffId, time)
    }
    setDragState(initialDragState)
  }, [dragState.draggedAppointment, onMoveAppointment])

  const cancelDrag = useCallback(() => {
    setDragState(initialDragState)
  }, [])

  return {
    dragState,
    handleDragStart,
    handleDragMove, // Exposed but logic handled internally via useEffect
    handleDragEnd,
    handleDrop,
    cancelDrag,
  }
}
