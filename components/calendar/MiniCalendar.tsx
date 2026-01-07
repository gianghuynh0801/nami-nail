'use client'

import { useState, useEffect } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MiniCalendarProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export default function MiniCalendar({ selectedDate, onDateChange }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate))

  // Update current month when selectedDate changes externally
  useEffect(() => {
    if (!isSameMonth(selectedDate, currentMonth)) {
      setCurrentMonth(startOfMonth(selectedDate))
    }
  }, [selectedDate, currentMonth])

  // Get all days in the month view (including previous/next month days)
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday = 1
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleDateClick = (date: Date) => {
    onDateChange(date)
    // Update current month if clicking a date from different month
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(startOfMonth(date))
    }
  }

  // Day names (Monday to Sunday) - Vietnamese abbreviations
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] // Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7, Chủ nhật

  return (
    <div className="bg-white rounded-lg border border-beige-dark shadow-sm">
      {/* Header with month/year and navigation */}
      <div className="flex items-center justify-between p-3 border-b border-beige-dark">
        <button
          onClick={handlePrevMonth}
          className="p-1 hover:bg-beige-light rounded transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        
        <h3 className="text-sm font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy', { locale: vi })}
        </h3>
        
        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-beige-light rounded transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-0 border-b border-beige-dark">
        {dayNames.map((day, index) => (
          <div
            key={index}
            className="p-2 text-center text-xs font-medium text-gray-600 border-r border-beige-dark last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((day, index) => {
          const isCurrentMonthDay = isSameMonth(day, currentMonth)
          const isSelected = isSameDay(day, selectedDate)
          const isToday = isSameDay(day, new Date())

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              className={`
                aspect-square p-1 text-xs border-r border-b border-beige-dark last:border-r-0
                transition-colors hover:bg-beige-light
                ${!isCurrentMonthDay ? 'text-gray-400 bg-beige-light/30' : 'text-gray-900'}
                ${isSelected 
                  ? 'bg-primary-400 text-white font-semibold hover:bg-primary-500' 
                  : ''}
                ${isToday && !isSelected 
                  ? 'bg-primary-100 text-primary-700 font-medium' 
                  : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
