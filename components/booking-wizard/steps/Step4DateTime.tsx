'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ChevronRight, ChevronLeft } from 'lucide-react'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns'
import { vi } from 'date-fns/locale'

interface Step4DateTimeProps {
  salonId: string
  staffId: string | null
  serviceId: string
  isAnyStaff: boolean
  selectedDate: string | null
  selectedTime: string | null
  onSelectDate: (date: string) => void
  onSelectTime: (time: string) => void
  onNext: () => void
  onBack: () => void
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export default function Step4DateTime({
  salonId,
  staffId,
  serviceId,
  isAnyStaff,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  onNext,
  onBack,
}: Step4DateTimeProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [loadingTimes, setLoadingTimes] = useState(false)
  const [noTimesReason, setNoTimesReason] = useState<string | null>(null)

  // Fetch available times when date changes
  useEffect(() => {
    if (selectedDate && (staffId || isAnyStaff)) {
      fetchAvailableTimes()
    }
  }, [selectedDate, staffId, isAnyStaff, salonId, serviceId])

  const fetchAvailableTimes = async () => {
    if (!selectedDate) return

    setLoadingTimes(true)
    setNoTimesReason(null)
    try {
      // If "any staff" is selected, we need to fetch times for all staff and merge
      if (isAnyStaff) {
        // First get all staff
        const staffRes = await fetch(`/api/salon/${salonId}/staff`)
        if (staffRes.ok) {
          const staffData = await staffRes.json()
          const allTimes = new Set<string>()
          
          // Fetch times for each staff
          for (const staff of staffData.staff || []) {
            const res = await fetch(
              `/api/booking/available-times?salonId=${salonId}&staffId=${staff.id}&serviceId=${serviceId}&date=${selectedDate}`
            )
            if (res.ok) {
              const data = await res.json()
              ;(data.times || []).forEach((time: string) => allTimes.add(time))
            }
          }
          
          // Sort times
          setAvailableTimes(Array.from(allTimes).sort())
        }
      } else if (staffId) {
        const res = await fetch(
          `/api/booking/available-times?salonId=${salonId}&staffId=${staffId}&serviceId=${serviceId}&date=${selectedDate}`
        )
        if (res.ok) {
          const data = await res.json()
          setAvailableTimes(data.times || [])
          setNoTimesReason(data.message || null)
        }
      }
    } catch (error) {
      console.error('Error fetching available times:', error)
      setAvailableTimes([])
    } finally {
      setLoadingTimes(false)
    }
  }

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    onSelectDate(dateStr)
    onSelectTime('') // Reset time when date changes
  }

  const handleTimeSelect = (time: string) => {
    onSelectTime(time)
  }

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      onNext()
    }
  }

  const prevMonth = () => {
    setCurrentMonth(prev => addDays(startOfMonth(prev), -1))
  }

  const nextMonth = () => {
    setCurrentMonth(prev => addDays(endOfMonth(prev), 1))
  }

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Add padding for first day of month
  const firstDayOfWeek = monthStart.getDay()
  const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const today = startOfDay(new Date())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Chọn Ngày & Giờ
        </h2>
        <p className="text-gray-500">
          Chọn ngày và giờ phù hợp với bạn
        </p>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            disabled={isSameMonth(currentMonth, new Date())}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy', { locale: vi })}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding for first week */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`padding-${i}`} className="aspect-square" />
          ))}

          {/* Days */}
          {calendarDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const isSelected = selectedDate === dateStr
            const isPast = isBefore(day, today)
            const isTodayDate = isToday(day)

            return (
              <button
                key={dateStr}
                onClick={() => !isPast && handleDateSelect(day)}
                disabled={isPast}
                className={`
                  aspect-square flex items-center justify-center rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${isSelected
                    ? 'bg-primary-400 text-white shadow-md'
                    : isPast
                      ? 'text-gray-300 cursor-not-allowed'
                      : isTodayDate
                        ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                        : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-gray-900">
              Chọn giờ - {format(new Date(selectedDate), 'dd/MM/yyyy')}
            </h3>
          </div>

          {loadingTimes ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Đang tải khung giờ...</p>
            </div>
          ) : availableTimes.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium mb-1">
                {noTimesReason || 'Không có khung giờ trống trong ngày này'}
              </p>
              <p className="text-sm text-gray-400">
                {noTimesReason?.includes('chưa có lịch làm việc')
                  ? 'Vui lòng liên hệ quản lý để thiết lập lịch làm việc hoặc chọn ngày khác'
                  : 'Vui lòng chọn ngày khác'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
              {availableTimes.map((time) => (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${selectedTime === time
                      ? 'bg-primary-400 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                    }
                  `}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Summary */}
      {selectedDate && selectedTime && (
        <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-400 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {format(new Date(selectedDate), 'EEEE, dd/MM/yyyy', { locale: vi })}
              </p>
              <p className="text-primary-600 font-medium">
                Lúc {selectedTime}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="pt-4 border-t border-gray-200 flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Quay lại
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTime}
          className={`
            flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
            ${selectedDate && selectedTime
              ? 'bg-primary-400 text-white hover:bg-primary-500 shadow-lg shadow-primary-400/30'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Tiếp tục
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
