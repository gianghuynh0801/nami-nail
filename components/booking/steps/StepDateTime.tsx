'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface StepDateTimeProps {
  salonId: string
  serviceId: string
  staffId: string
  selectedDate: string
  selectedTime: string
  onSelectDate: (date: string) => void
  onSelectTime: (time: string) => void
}

export default function StepDateTime({
  salonId,
  serviceId,
  staffId,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
}: StepDateTimeProps) {
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (selectedDate && serviceId && staffId) {
      fetchAvailableTimes()
    } else {
      setAvailableTimes([])
    }
  }, [selectedDate, serviceId, staffId])

  const fetchAvailableTimes = async () => {
    if (!selectedDate || !serviceId || !staffId) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/booking/available-times?salonId=${salonId}&staffId=${staffId}&serviceId=${serviceId}&date=${selectedDate}`
      )
      const data = await response.json()
      if (response.ok) {
        setAvailableTimes(data.times || [])
      }
    } catch (error) {
      console.error('Error fetching available times:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Date & Time</h2>
        <p className="text-gray-500">Choose your preferred date and time</p>
      </div>

      <div className="space-y-4">
        {/* Date Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="w-4 h-4 text-primary-400" />
            Date *
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              onSelectDate(e.target.value)
              onSelectTime('')
            }}
            min={today}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
          />
        </div>

        {/* Time Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Clock className="w-4 h-4 text-primary-400" />
            Time *
          </label>
          {!selectedDate || !serviceId || !staffId ? (
            <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500">
              Please select date, service, and staff first
            </div>
          ) : loading ? (
            <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500">
              Loading available times...
            </div>
          ) : availableTimes.length > 0 ? (
            <select
              value={selectedTime}
              onChange={(e) => onSelectTime(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
            >
              <option value="">Select time</option>
              {availableTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full px-4 py-3 border border-yellow-300 rounded-xl bg-yellow-50 text-yellow-700">
              No available times for this date. Please select another date.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
