'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addMinutes } from 'date-fns'
import { format } from 'date-fns'
import { User, Phone, Scissors, Users, Calendar, Clock, CheckCircle2 } from 'lucide-react'
import { salonLocalToUtcISOString } from '@/lib/timezone'
import { salonTodayISO, salonDateLabel } from '@/lib/timezone'

interface Service {
  id: string
  name: string
  price: number
  duration: number
}

interface Staff {
  id: string
  name: string
  phone: string
}

interface Salon {
  id: string
  name: string
  slug: string
  timezone?: string
}

interface BookingFormProps {
  salon: Salon
  services: Service[]
  staff: Staff[]
}

const bookingSchema = z.object({
  customerName: z.string().min(1, 'Full name is required'),
  customerPhone: z.string().min(3, 'Phone number invalid (too short)'),
  customerEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  serviceId: z.string().min(1, 'Please select a service'),
  staffId: z.string().min(1, 'Please select a staff member'),
  date: z.string().min(1, 'Please select a date'),
  time: z.string().min(1, 'Please select a time'),
}).refine((data) => {
  if (!data.date || !data.time) return true
  
  const selectedDateTime = new Date(`${data.date}T${data.time}`)
  const now = new Date()
  
  // Cannot book in the past
  return selectedDateTime > now
}, {
  message: 'Cannot book appointments in the past',
  path: ['time'],
})

type BookingFormData = z.infer<typeof bookingSchema>

export default function BookingForm({ salon, services, staff }: BookingFormProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [loadingTimes, setLoadingTimes] = useState(false)
  const [availableStaff, setAvailableStaff] = useState<Staff[]>(staff)
  const [loadingStaff, setLoadingStaff] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  })

  const selectedServiceId = watch('serviceId')
  const selectedStaffId = watch('staffId')
  const selectedDate = watch('date')
  const selectedTime = watch('time')

  const selectedService = services.find((s) => s.id === selectedServiceId)

  // Fetch available staff when date, service, and time are selected
  useEffect(() => {
    if (selectedDate && selectedServiceId && selectedTime) {
      fetchAvailableStaff()
    } else {
      setAvailableStaff(staff)
      setValue('staffId', '')
    }
  }, [selectedDate, selectedServiceId, selectedTime])

  // Fetch available times when date, service, and staff are selected
  useEffect(() => {
    if (selectedDate && selectedServiceId && selectedStaffId) {
      fetchAvailableTimes()
    } else {
      setAvailableTimes([])
    }
  }, [selectedDate, selectedServiceId, selectedStaffId])

  const fetchAvailableStaff = async () => {
    if (!selectedDate || !selectedServiceId || !selectedTime) return

    setLoadingStaff(true)
    try {
      const response = await fetch(
        `/api/booking/available-staff?salonId=${salon.id}&date=${selectedDate}&time=${selectedTime}&serviceId=${selectedServiceId}`
      )
      const data = await response.json()
      if (response.ok) {
        setAvailableStaff(data.staff || [])
        // Reset staff selection if current selection is not available
        if (selectedStaffId && !data.staff.find((s: Staff) => s.id === selectedStaffId)) {
          setValue('staffId', '')
        }
      }
    } catch (error) {
      console.error('Error fetching available staff:', error)
      setAvailableStaff(staff)
    } finally {
      setLoadingStaff(false)
    }
  }

  const fetchAvailableTimes = async () => {
    if (!selectedDate || !selectedServiceId || !selectedStaffId) return

    setLoadingTimes(true)
    try {
      const response = await fetch(
        `/api/booking/available-times?salonId=${salon.id}&staffId=${selectedStaffId}&serviceId=${selectedServiceId}&date=${selectedDate}`
      )
      const data = await response.json()
      setAvailableTimes(data.times || [])
    } catch (error) {
      console.error('Error fetching available times:', error)
    } finally {
      setLoadingTimes(false)
    }
  }

  const onSubmit = async (data: BookingFormData) => {
    setError('')
    setLoading(true)

    if (!selectedService) {
      setError('Vui lòng chọn dịch vụ')
      setLoading(false)
      return
    }

    try {
      // Convert salon-local date/time to UTC ISO to avoid client timezone differences
      const startTimeISO = salonLocalToUtcISOString(data.date, data.time, undefined)
      const startTime = new Date(startTimeISO)
      const endTime = addMinutes(startTime, selectedService.duration)


      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: salon.id,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail || undefined,
          serviceId: data.serviceId,
          staffId: data.staffId,
          startTime: startTimeISO,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        setError(responseData.error || 'An error occurred')
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/booking/${salon.slug}/success`)
        }, 2000)
      }
    } catch (error) {
      setError('An error occurred while booking')
    } finally {
      setLoading(false)
    }
  }

  // Get minimum date (today)
  const today = salonTodayISO(undefined)

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-primary-400 mb-2">
          Booking successful! 🎉
        </h3>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <User className="w-4 h-4 text-primary-400" />
          Full Name *
        </label>
        <input
          type="text"
          {...register('customerName')}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
          placeholder="Enter your full name"
        />
        {errors.customerName && (
          <p className="text-red-500 text-sm mt-1">{errors.customerName.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <Phone className="w-4 h-4 text-primary-400" />
          Phone Number *
        </label>
        <input
          type="tel"
          {...register('customerPhone')}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
          placeholder="Enter phone number"
        />
        {errors.customerPhone && (
          <p className="text-red-500 text-sm mt-1">{errors.customerPhone.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <User className="w-4 h-4 text-primary-400" />
          Email (Optional)
        </label>
        <input
          type="email"
          {...register('customerEmail')}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
          placeholder="Enter email address (optional)"
        />
        {errors.customerEmail && (
          <p className="text-red-500 text-sm mt-1">{errors.customerEmail.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <Scissors className="w-4 h-4 text-primary-400" />
          Service *
        </label>
        <select
          {...register('serviceId')}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
        >
          <option value="">Select service</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} - €{service.price.toLocaleString()} ({service.duration} min)
            </option>
          ))}
        </select>
        {errors.serviceId && (
          <p className="text-red-500 text-sm mt-1">{errors.serviceId.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <Calendar className="w-4 h-4 text-primary-400" />
          Date *
        </label>
        <input
          type="date"
          {...register('date')}
          min={today}
          onChange={(e) => {
            register('date').onChange(e)
            setValue('time', '')
            setValue('staffId', '')
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
        />
        {errors.date && (
          <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <Clock className="w-4 h-4 text-primary-400" />
          Time *
        </label>
        {loadingTimes ? (
          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500">
            Loading available times...
          </div>
        ) : availableTimes.length > 0 ? (
          <>
            <select
              {...register('time')}
              onChange={(e) => {
                register('time').onChange(e)
                setValue('staffId', '')
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
            >
              <option value="">Select time</option>
              {availableTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            {errors.time && (
              <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Only available times are shown (excluding booked appointments)
            </p>
          </>
        ) : (
          <>
            <input
              type="time"
              {...register('time')}
              onChange={(e) => {
                register('time').onChange(e)
                setValue('staffId', '')
              }}
              disabled={!selectedDate || !selectedServiceId}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:bg-gray-100"
            />
            {errors.time && (
              <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>
            )}
            {(!selectedDate || !selectedServiceId) && (
              <p className="text-xs text-gray-500 mt-1">
                Please select date and service first
              </p>
            )}
          </>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <Users className="w-4 h-4 text-primary-400" />
          Staff Member * {loadingStaff && <span className="text-xs text-gray-500">(Loading...)</span>}
        </label>
        {loadingStaff ? (
          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500">
            Loading available staff...
          </div>
        ) : availableStaff.length === 0 && selectedDate && selectedServiceId && selectedTime ? (
          <>
            <div className="w-full px-4 py-2 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700">
              No staff available at this time. Please select a different time.
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Staff members are shown based on their work schedule and existing appointments
            </p>
          </>
        ) : (
          <>
            <select
              {...register('staffId')}
              disabled={!selectedDate || !selectedServiceId || !selectedTime || availableStaff.length === 0}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:bg-gray-100 bg-white"
            >
              <option value="">Select staff member</option>
              {availableStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.staffId && (
              <p className="text-red-500 text-sm mt-1">{errors.staffId.message}</p>
            )}
            {selectedDate && selectedServiceId && selectedTime && availableStaff.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Only staff with matching work schedule are shown
              </p>
            )}
          </>
        )}
      </div>

      {selectedService && selectedTime && (
        <div className="bg-gradient-to-br from-pastel-pink-light to-pastel-yellow-light p-6 rounded-2xl border border-pastel-pink">
          <p className="font-semibold text-primary-400 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Booking Information
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              <span className="font-semibold">Service:</span> {selectedService.name}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Duration:</span> {selectedService.duration} min
            </p>
            <div className="pt-3 border-t border-pastel-pink mt-3">
              <p className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-primary-500 bg-clip-text text-transparent">
                €{selectedService.price.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-primary-400 text-white rounded-xl hover:bg-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg hover:shadow-xl hover:shadow-primary-400/30"
      >
        {loading ? 'Processing...' : 'Book Now'}
      </button>
    </form>
  )
}
