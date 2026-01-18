'use client'

import { CheckCircle2, Scissors, User, Calendar, MapPin } from 'lucide-react'
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Salon & Service */}
        <div className="space-y-4">
          {/* Salon Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary-400" />
              Salon Information
            </h3>
            <div className="space-y-1 text-xs">
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
          <div className="bg-primary-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
              <Scissors className="w-4 h-4 text-primary-400" />
              Service
            </h3>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">{service.name}</p>
              <p className="text-xs text-gray-600">Duration: {service.duration} min</p>
              <p className="text-lg font-bold text-primary-400">
                €{service.price.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Customer */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {/* Staff Info */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary-400" />
                Staff
              </h3>
              <p className="text-sm font-medium text-gray-900">{staff.name}</p>
            </div>

            {/* Date & Time */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary-400" />
                Time
              </h3>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {format(appointmentDate, 'EEE, MMM dd')}
                </p>
                <p className="text-xs text-gray-600">
                  {format(appointmentDate, 'HH:mm')}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary-400" />
                Your Info
              </h3>
              <div className="space-y-1 text-xs text-gray-700">
                <p><span className="font-medium">Name:</span> {customerInfo.name}</p>
                <p><span className="font-medium">Phone:</span> {customerInfo.phone}</p>
                {customerInfo.email && (
                  <p><span className="font-medium">Email:</span> {customerInfo.email}</p>
                )}
              </div>
            </div>
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
