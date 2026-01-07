'use client'

import { useState, useEffect } from 'react'
import { CALENDAR_CONFIG } from './constants'

interface CurrentTimeLineProps {
  staffCount: number
}

export default function CurrentTimeLine({ staffCount }: CurrentTimeLineProps) {
  const [position, setPosition] = useState(0)

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const totalMinutes = hours * 60 + minutes
      const pos = (totalMinutes / 60) * CALENDAR_CONFIG.HOUR_HEIGHT
      setPosition(pos)
    }

    updatePosition()
    const interval = setInterval(updatePosition, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="absolute left-0 z-30 pointer-events-none"
      style={{ 
        top: position,
        width: staffCount * CALENDAR_CONFIG.COLUMN_MIN_WIDTH 
      }}
    >
      {/* Red dot */}
      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-md" />
      
      {/* Red line */}
      <div className="h-0.5 bg-red-500 shadow-sm w-full" />
    </div>
  )
}
