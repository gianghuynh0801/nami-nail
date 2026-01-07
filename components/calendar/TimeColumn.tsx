'use client'

import { HOURS, CALENDAR_CONFIG } from './constants'

export default function TimeColumn() {
  return (
    <div className="w-16 md:w-20 flex-shrink-0 bg-beige-light border-r border-beige-dark sticky left-0 z-10">
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="border-b border-beige-dark/50 relative"
          style={{ height: CALENDAR_CONFIG.HOUR_HEIGHT }}
        >
          <span className="absolute -top-2.5 left-2 text-xs font-medium text-primary-700 bg-beige-light px-1">
            {hour.toString().padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  )
}
