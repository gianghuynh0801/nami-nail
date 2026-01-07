'use client'

import { useEffect, RefObject } from 'react'
import { format } from 'date-fns'
import { CALENDAR_CONFIG } from '../constants'

export function useAutoScroll(
  containerRef: RefObject<HTMLDivElement>,
  selectedDate: Date
) {
  useEffect(() => {
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    
    if (isToday && containerRef.current) {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      // Scroll to 1 hour before current time (so current time is visible with context)
      const scrollToHour = Math.max(0, currentHour - 1)
      const scrollPosition = scrollToHour * CALENDAR_CONFIG.HOUR_HEIGHT + 
                            (currentMinute / 60) * CALENDAR_CONFIG.HOUR_HEIGHT

      containerRef.current.scrollTo({
        top: scrollPosition,
        behavior: 'smooth',
      })
    } else if (containerRef.current) {
      // Scroll to 8:00 AM for other days
      containerRef.current.scrollTo({
        top: 8 * CALENDAR_CONFIG.HOUR_HEIGHT,
        behavior: 'smooth',
      })
    }
  }, [selectedDate, containerRef])
}
