'use client'

import React, { useCallback } from 'react'
import { CALENDAR_CONFIG } from './constants'

interface TimeSlotProps {
  staffId: string
  time: string
  minute: number
  isWorking: boolean
  isBreak: boolean
  isPast: boolean
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
  isPast,
  isDropTarget,
  onDrop,
  onClick,
}: TimeSlotProps) {
  // onDrop is for drag-and-drop from waiting list (handled by parent)
  // onClick is for direct click to create appointment

  const handleTouchEnd = useCallback(() => {
    if (!isPast) onDrop(staffId, time)
  }, [staffId, time, isPast, onDrop])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isPast && onClick) {
      e.stopPropagation()
      e.preventDefault()
      onClick(staffId, time)
    }
  }, [staffId, time, isPast, onClick])

  // Cho phép click/drop mọi ô không trong quá khứ (không giới hạn khung giờ làm việc)
  const isClickable = !isPast && !!onClick

  return (
    <div
      className={`
        absolute w-full
        transition-colors duration-150
        ${minute === 0 ? '' : 'border-t border-dashed border-beige-dark/20'}
        ${!isPast && isWorking && !isBreak ? 'bg-primary-50/50' : ''}
        ${isBreak ? 'bg-beige bg-stripes' : ''}
        ${!isWorking && !isBreak && !isPast ? 'bg-gray-200' : ''}
        ${isDropTarget ? 'bg-primary-200 border-primary-400 border-2 border-dashed z-20' : ''}
        ${isClickable ? 'cursor-pointer hover:bg-primary-100/70' : ''}
      `}
      style={{
        height: CALENDAR_CONFIG.SLOT_HEIGHT,
        top: `${(minute / 60) * CALENDAR_CONFIG.HOUR_HEIGHT}px`,
        zIndex: isClickable ? 15 : 1,
        pointerEvents: 'auto',
      }}
      data-working={!isPast}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      data-slot={`${staffId}-${time}`}
    />
  )
}
