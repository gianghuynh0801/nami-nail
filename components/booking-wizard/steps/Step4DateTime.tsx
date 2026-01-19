'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, ChevronRight, ChevronLeft, Edit2, RotateCcw } from 'lucide-react'
import { format, isBefore, startOfDay, parseISO, isValid } from 'date-fns'
import { vi } from 'date-fns/locale'

interface Step4DateTimeProps {
  salonId: string
  staffId: string | null
  serviceIds: string[]
  isAnyStaff: boolean
  selectedDate: string | null
  selectedTime: string | null
  onSelectDate: (date: string) => void
  onSelectTime: (time: string) => void
  onNext: () => void
  onBack: () => void
}

interface TimeSlot {
  time: string
  available: boolean
  reason?: 'booked' | 'break' | 'closed' | 'past'
}

export default function Step4DateTime({
  salonId,
  staffId,
  serviceIds,
  isAnyStaff,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  onNext,
  onBack,
}: Step4DateTimeProps) {
  const [availableTimes, setAvailableTimes] = useState<TimeSlot[]>([])
  const [loadingTimes, setLoadingTimes] = useState(false)
  const [noTimesReason, setNoTimesReason] = useState<string | null>(null)
  
  // Custom Time State
  const [customTime, setCustomTime] = useState('')
  const [isCustomTime, setIsCustomTime] = useState(false)

  // Date Editing State
  const [isEditingDate, setIsEditingDate] = useState(false)
  
  // Time Editing State - track if time was pre-selected from calendar
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [hasPreselectedTime] = useState(() => !!selectedTime) // Check on mount only

  // Initialize Date to today if empty
  useEffect(() => {
    if (!selectedDate) {
      onSelectDate(format(new Date(), 'yyyy-MM-dd'))
    }
  }, []) // Run once

  // Fetch available times when date changes
  useEffect(() => {
    if (selectedDate && (staffId || isAnyStaff)) {
      fetchAvailableTimes()
    }
  }, [selectedDate, staffId, isAnyStaff, salonId, serviceIds])

  // Sync custom time input if selectedTime matches custom format (optional logic, mainly to keep input in sync if coming back)
  useEffect(() => {
    if (selectedTime && availableTimes.length > 0) {
      const inList = availableTimes.find(t => t.time === selectedTime)
      if (!inList) {
        setCustomTime(selectedTime)
        setIsCustomTime(true)
      } else {
        setIsCustomTime(false)
        setCustomTime('')
      }
    }
  }, [selectedTime, availableTimes])

  const fetchAvailableTimes = async () => {
    if (!selectedDate) return

    setLoadingTimes(true)
    setNoTimesReason(null)
    setAvailableTimes([])
    
    try {
      if (isAnyStaff) {
         // Logic for Any Staff (Merging availability)
         // This is complex because detailed breakdown for "Any Staff" implies checking if AT LEAST ONE staff is free.
         // If we want detailed "booked" status, "booked" means ALL relevant staff are booked.
         // For simplicity and to match previous logic:
         // We fetch times for all staff.
         // A slot is "Available" if at least one staff is free.
         // A slot is "Booked" if ALL staff are booked? Or just don't show it?
         // The user wants "Booked slots blackened".
         // Let's stick to simple "available" list for any staff for now, 
         // OR iterate all staff and construct a merged availability map.
         
         const staffRes = await fetch(`/api/salon/${salonId}/staff`)
         if (staffRes.ok) {
            const staffData = await staffRes.json()
            const timeMap = new Map<string, { available: boolean, reason?: string }>()
            
            for (const staff of staffData.staff || []) {
               const res = await fetch(
                  `/api/booking/available-times?salonId=${salonId}&staffId=${staff.id}&serviceIds=${serviceIds.join(',')}&date=${selectedDate}&includeDetails=true`
               )
               if (res.ok) {
                  const data = await res.json()
                  const times: TimeSlot[] = data.times || []
                  
                  times.forEach(slot => {
                     if (!timeMap.has(slot.time)) {
                        timeMap.set(slot.time, { available: false, reason: 'booked' }) // Default to booked/unavailable
                     }
                     
                     // If any staff is available at this time, mark slot available
                     if (slot.available) {
                        timeMap.set(slot.time, { available: true })
                     }
                  })
               }
            }
            
            // Convert map to array and sort
            const unifiedTimes: TimeSlot[] = Array.from(timeMap.entries()).map(([time, status]) => ({
               time, 
               available: status.available,
               reason: status.reason as any
            })).sort((a,b) => a.time.localeCompare(b.time))
            
            setAvailableTimes(unifiedTimes)
         }

      } else if (staffId) {
        // Specific Staff
        const res = await fetch(
          `/api/booking/available-times?salonId=${salonId}&staffId=${staffId}&serviceIds=${serviceIds.join(',')}&date=${selectedDate}&includeDetails=true`
        )
        if (res.ok) {
          const data = await res.json()
          // API returns objects now? We need to handle backward compat or new format.
          // We updated API to return objects in `times` if `includeDetails=true`.
          // Specifically: `timeSlots.push({ time: ..., available: ..., reason: ... })`
          // So data.times is TimeSlot[]
          
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val) {
       onSelectDate(val)
       onSelectTime('')
       setIsEditingDate(false)
    }
  }

  const handleTimeSelect = (time: string) => {
    onSelectTime(time)
    setCustomTime('') 
    setIsCustomTime(false)
  }

  const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const val = e.target.value
     setCustomTime(val)
     if (val) {
        onSelectTime(val)
        setIsCustomTime(true)
     }
  }

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Chọn Ngày & Giờ
        </h2>
        <p className="text-gray-500">
          Vui lòng chọn thời gian thích hợp cho bạn
        </p>
      </div>

      {/* Date Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
         <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
               <CalendarIcon className="w-5 h-5 text-primary-500" />
               Ngày đặt lịch
            </h3>
            {!isEditingDate && (
               <button 
                  onClick={() => setIsEditingDate(true)}
                  className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1"
               >
                  <Edit2 className="w-3 h-3" />
                  Thay đổi
               </button>
            )}
         </div>

         {isEditingDate ? (
            <div className="flex gap-2">
               <input 
                  type="date" 
                  value={selectedDate || ''}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={handleDateChange}
                  className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  autoFocus
               />
               <button 
                  onClick={() => setIsEditingDate(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200"
               >
                  Hủy
               </button>
            </div>
         ) : (
            <div 
               className="p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-primary-300 transition-colors"
               onClick={() => setIsEditingDate(true)}
            >
               <div className="font-medium text-lg text-gray-900 capitalize">
                  {selectedDate ? format(parseISO(selectedDate), 'EEEE, dd/MM/yyyy', { locale: vi }) : 'Chọn ngày'}
               </div>
               {selectedDate && isValid(parseISO(selectedDate)) && isBefore(startOfDay(parseISO(selectedDate)), startOfDay(new Date())) && (
                  <div className="text-red-500 text-sm mt-1">Ngày đã qua</div>
               )}
            </div>
         )}
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              Chọn giờ - {format(new Date(selectedDate), 'dd/MM/yyyy')}
            </h3>
            {hasPreselectedTime && selectedTime && !isEditingTime && (
              <button 
                onClick={() => setIsEditingTime(true)}
                className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Thay đổi
              </button>
            )}
          </div>

          {/* Hiển thị giờ đã chọn nếu có pre-selected time và không đang edit */}
          {hasPreselectedTime && selectedTime && !isEditingTime ? (
            <div 
              className="p-3 bg-primary-50 rounded-lg border border-primary-200 cursor-pointer hover:border-primary-300 transition-colors"
              onClick={() => setIsEditingTime(true)}
            >
              <div className="font-medium text-lg text-primary-700 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {selectedTime}
              </div>
              <div className="text-sm text-primary-500 mt-1">Giờ đã chọn từ lịch</div>
            </div>
          ) : loadingTimes ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Đang tải khung giờ...</p>
            </div>
          ) : availableTimes.length === 0 && !customTime ? (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
               <p>{noTimesReason || 'Không có giờ trống'}</p>
            </div>
          ) : (
            <>
               <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-6">
                  {availableTimes.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => handleTimeSelect(slot.time)}
                      className={`
                        px-2 py-2.5 rounded-lg text-sm font-medium transition-all
                        ${!slot.available 
                           ? 'bg-gray-800 text-gray-400 cursor-not-allowed opacity-80'
                           : selectedTime === slot.time && !isCustomTime
                              ? 'bg-primary-500 text-white shadow-md transform scale-105'
                              : 'bg-gray-100 text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                        }
                      `}
                      title={!slot.available ? (slot.reason === 'booked' ? 'Đã đặt' : 'Không khả dụng') : ''}
                    >
                      {slot.time}
                    </button>
                  ))}
               </div>

               {/* Custom Time Config */}
               <div className="pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hoặc chọn giờ tùy chỉnh:</label>
                  <div className="flex gap-2 items-center">
                     <input 
                        type="time" 
                        value={customTime}
                        onChange={handleCustomTimeChange}
                        className={`
                           border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none
                           ${isCustomTime && selectedTime ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}
                        `}
                     />
                     {isCustomTime && (
                        <span className="text-sm text-primary-600 font-medium">Đang chọn</span>
                     )}
                  </div>
               </div>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="pt-4 flex gap-3">
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
              ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/30'
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
