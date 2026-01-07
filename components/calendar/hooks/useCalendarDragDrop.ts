'use client'

import { useState, useCallback } from 'react'
import type { CalendarAppointment, DragState } from '../types'

interface UseCalendarDragDropOptions {
  onMoveAppointment: (
    appointmentId: string,
    newStaffId: string,
    newStartTime: string
  ) => Promise<void>
}

const initialDragState: DragState = {
  isDragging: false,
  draggedAppointment: null,
  dragPosition: { x: 0, y: 0 },
  dropTarget: null,
  sourceStaffId: null,
}

export function useCalendarDragDrop({ onMoveAppointment }: UseCalendarDragDropOptions) {
  const [dragState, setDragState] = useState<DragState>(initialDragState)

  const handleDragStart = useCallback((
    appointment: CalendarAppointment,
    staffId: string
  ) => {
    setDragState({
      isDragging: true,
      draggedAppointment: appointment,
      dragPosition: { x: 0, y: 0 },
      dropTarget: null,
      sourceStaffId: staffId,
    })
  }, [])

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    // Find drop target under cursor
    const elements = document.elementsFromPoint(clientX, clientY)
    let dropTarget: DragState['dropTarget'] = null

    for (const el of elements) {
      const slot = (el as HTMLElement).dataset?.slot
      if (slot) {
        const parts = slot.split('-')
        // Format: staffId-HH:MM
        const time = parts.pop()
        const staffId = parts.join('-')
        if (staffId && time) {
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
    if (dragState.draggedAppointment && dragState.dropTarget) {
      await onMoveAppointment(
        dragState.draggedAppointment.id,
        dragState.dropTarget.staffId,
        dragState.dropTarget.time
      )
    }

    setDragState(initialDragState)
  }, [dragState, onMoveAppointment])

  const handleDrop = useCallback(async (staffId: string, time: string) => {
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
    handleDragMove,
    handleDragEnd,
    handleDrop,
    cancelDrag,
  }
}
