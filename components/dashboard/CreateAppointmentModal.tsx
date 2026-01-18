'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Scissors, UserCog, Clock, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'

const appointmentSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(3, 'Phone number invalid (too short)'),
  serviceId: z.string().min(1, 'Please select a service'),
  staffId: z.string().min(1, 'Please select a staff member'),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

interface CreateAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  salonId: string
  startTime: Date
  endTime: Date
  services: any[]
  staff: any[]
}

export default function CreateAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  salonId,
  startTime,
  endTime,
  services,
  staff,
}: CreateAppointmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
  })

  useEffect(() => {
    if (isOpen) {
      reset()
      setError('')
    }
  }, [isOpen, reset])

  // Availability check
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')

  const selectedStaffId = watch('staffId')
  const selectedServiceId = watch('serviceId')

  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedStaffId || !selectedServiceId || !startTime || !salonId) return
      
      setCheckingAvailability(true)
      setAvailabilityError('')
      
      try {
        const dateStr = format(startTime, 'yyyy-MM-dd')
        const timeStr = format(startTime, 'HH:mm')
        
        const res = await fetch(
          `/api/booking/available-times?salonId=${salonId}&staffId=${selectedStaffId}&serviceId=${selectedServiceId}&date=${dateStr}`
        )
        
        if (res.ok) {
          const data = await res.json()
          const availableTimes = data.times || []
          
          if (!availableTimes.includes(timeStr)) {
            setAvailabilityError('Nhân viên này đã bận hoặc không có lịch làm việc vào giờ này')
          }
        }
      } catch (error) {
        console.error('Error checking availability:', error)
      } finally {
        setCheckingAvailability(false)
      }
    }

    // Debounce check
    const timeoutId = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timeoutId)
  }, [selectedStaffId, selectedServiceId, startTime, salonId])

  const onSubmit = async (data: AppointmentFormData) => {
    if (availabilityError) return

    setLoading(true)
    setError('')

    try {
      // ... (existing submit logic)
      console.log('Creating appointment:', {
        salonId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        serviceId: data.serviceId,
        staffId: data.staffId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          serviceId: data.serviceId,
          staffId: data.staffId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const responseData = await res.json()

      if (res.ok) {
        console.log('Appointment created successfully:', responseData)
        onSuccess()
        onClose()
      } else {
        console.error('Error creating appointment:', responseData)
        setError(responseData.error || 'An error occurred while creating the appointment')
      }
    } catch (err: any) {
      console.error('Exception creating appointment:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">New Appointment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Time Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-900">Time</h3>
            </div>
            <p className="text-gray-700">
              {format(startTime, 'EEEE, MM/dd/yyyy')}
            </p>
            <p className="text-gray-700 font-medium">
              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
            </p>
          </div>

          {/* Customer Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <User className="w-4 h-4 text-primary-600" />
              Customer Name *
            </label>
            <input
              type="text"
              {...register('customerName')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="Enter customer name"
            />
            {errors.customerName && (
              <p className="text-red-500 text-sm mt-1">{errors.customerName.message}</p>
            )}
          </div>

          {/* Customer Phone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Phone className="w-4 h-4 text-primary-600" />
              Phone Number *
            </label>
            <input
              type="tel"
              {...register('customerPhone')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="Enter phone number"
            />
            {errors.customerPhone && (
              <p className="text-red-500 text-sm mt-1">{errors.customerPhone.message}</p>
            )}
          </div>

          {/* Service */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Scissors className="w-4 h-4 text-primary-600" />
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

          {/* Staff */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <UserCog className="w-4 h-4 text-primary-600" />
              Staff Member *
            </label>
            <select
              {...register('staffId')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
            >
              <option value="">Select staff member</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.staffId && (
              <p className="text-red-500 text-sm mt-1">{errors.staffId.message}</p>
            )}
            {checkingAvailability && (
              <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 animate-spin api-spin" /> Checking availability...
              </p>
            )}
            {availabilityError && (
              <p className="text-red-500 text-sm mt-1 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                ⚠️ {availabilityError}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!availabilityError || checkingAvailability}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-400 text-white rounded-xl hover:bg-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


