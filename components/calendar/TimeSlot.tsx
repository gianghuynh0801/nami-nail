'use client'

import React, { useCallback } from 'react'
import { CALENDAR_CONFIG } from './constants'

interface TimeSlotProps {
  staffId: string
  time: string
  minute: number
  isWorking: boolean
  isBreak: boolean
  isDropTarget: boolean
  onDrop: (staffId: string, time: string) => void
  onClick?: (staffId: string, time: string) => void
}

export default function TimeSlot({
  staffId,
  time,
  minute,
  isWorking,
  isBreak,
  isDropTarget,
  onDrop,
  onClick,
}: TimeSlotProps) {
  // onDrop is for drag-and-drop from waiting list (handled by parent)
  // onClick is for direct click to create appointment

  const handleTouchEnd = useCallback(() => {
    if (isWorking && !isBreak) {
      onDrop(staffId, time)
    }
  }, [staffId, time, isWorking, isBreak, onDrop])

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Handle direct click to create appointment
    if (isWorking && !isBreak && onClick) {
      e.stopPropagation()
      e.preventDefault()
      console.log('TimeSlot clicked:', { staffId, time })
      onClick(staffId, time)
    }
  }, [staffId, time, isWorking, isBreak, onClick])

  return (
    <div
      className={`
        absolute w-full
        transition-colors duration-150
        ${minute === 0 ? '' : 'border-t border-dashed border-beige-dark/20'}
        ${isWorking && !isBreak ? 'bg-primary-50/50' : ''}
        ${isBreak ? 'bg-beige bg-stripes' : ''}
        ${!isWorking && !isBreak ? 'bg-gray-100/30' : ''}
        ${isDropTarget ? 'bg-primary-200 border-primary-400 border-2 border-dashed z-20' : ''}
        ${isWorking && !isBreak && onClick ? 'cursor-pointer hover:bg-primary-100/70' : ''}
      `}
      style={{
        height: CALENDAR_CONFIG.SLOT_HEIGHT,
        top: `${(minute / 60) * CALENDAR_CONFIG.HOUR_HEIGHT}px`,
        zIndex: isWorking && !isBreak && onClick ? 15 : 1,
        pointerEvents: isWorking && !isBreak && onClick ? 'auto' : 'none',
      }}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      data-slot={`${staffId}-${time}`}
    />
  )
}
