'use client'

import { CheckCircle2, Scissors, User, Calendar, Clock, MapPin, Phone } from 'lucide-react'
import { format } from 'date-fns'

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
  address: string
  phone: string
}

interface CustomerInfo {
  name: string
  phone: string
  email: string
}

interface StepConfirmationProps {
  salon: Salon
  service: Service | undefined
  staff: Staff | undefined
  date: string
  time: string
  customerInfo: CustomerInfo
  onSubmit: () => void
  loading: boolean
  error: string
}

export default function StepConfirmation({
  salon,
  service,
  staff,
  date,
  time,
  customerInfo,
  onSubmit,
  loading,
  error,
}: StepConfirmationProps) {
  if (!service || !staff || !date || !time) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please complete all previous steps</p>
      </div>
    )
  }

  const appointmentDate = new Date(`${date}T${time}`)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Confirm</h2>
        <p className="text-gray-500">Please review your appointment details before confirming</p>
      </div>

      <div className="space-y-4">
        {/* Salon Info */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-400" />
            Salon Information
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Name:</span> {salon.name}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Address:</span> {salon.address}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Phone:</span> {salon.phone}
            </p>
          </div>
        </div>

        {/* Service Info */}
        <div className="bg-primary-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary-400" />
            Service
          </h3>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900">{service.name}</p>
            <p className="text-sm text-gray-600">Duration: {service.duration} min</p>
            <p className="text-2xl font-bold text-primary-400">
              €{service.price.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Staff Info */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-400" />
            Staff Member
          </h3>
          <p className="text-lg font-semibold text-gray-900">{staff.name}</p>
        </div>

        {/* Date & Time */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-400" />
            Date & Time
          </h3>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900">
              {format(appointmentDate, 'EEEE, MMMM dd, yyyy')}
            </p>
            <p className="text-lg text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {format(appointmentDate, 'HH:mm')}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-400" />
            Your Information
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Name:</span> {customerInfo.name}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Phone:</span> {customerInfo.phone}
            </p>
            {customerInfo.email && (
              <p className="text-gray-700">
                <span className="font-medium">Email:</span> {customerInfo.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
