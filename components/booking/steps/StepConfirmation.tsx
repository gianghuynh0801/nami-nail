'use client'

import { CheckCircle2, Scissors, User, Calendar, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

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
  services: Service[]
  staff: Staff | undefined
  date: string
  time: string
  customerInfo: CustomerInfo
  guestCount?: number
  extraCustomers?: CustomerInfo[]
  onSubmit: () => void
  loading: boolean
  error: string
}

export default function StepConfirmation({
  salon,
  services,
  staff,
  date,
  time,
  customerInfo,
  guestCount = 1,
  extraCustomers = [],
  onSubmit,
  loading,
  error,
}: StepConfirmationProps) {
  if (services.length === 0 || !staff || !date || !time) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Vui lòng hoàn thành các bước trước</p>
      </div>
    )
  }

  const appointmentDate = new Date(`${date}T${time}`)
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0)
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Xác nhận đặt lịch</h2>
        <p className="text-gray-500">Vui lòng kiểm tra lại thông tin trước khi xác nhận</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Salon & Services */}
        <div className="space-y-4">
          {/* Salon Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary-400" />
              Chi nhánh
            </h3>
            <div className="space-y-1 text-xs">
              <p className="text-gray-700">
                <span className="font-medium">Tên:</span> {salon.name}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Địa chỉ:</span> {salon.address}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">SĐT:</span> {salon.phone}
              </p>
            </div>
          </div>

          {/* Services Info */}
          <div className="bg-primary-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Scissors className="w-4 h-4 text-primary-400" />
              Dịch vụ ({services.length})
            </h3>
            <div className="space-y-2">
              {services.map((service, index) => (
                <div key={service.id} className="flex justify-between items-center text-sm border-b border-primary-100 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-900">{index + 1}. {service.name}</p>
                    <p className="text-xs text-gray-500">{service.duration} phút</p>
                  </div>
                  <p className="font-semibold text-primary-600">€{service.price}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-primary-200 flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{totalDuration} phút</span>
              </div>
              <p className="text-lg font-bold text-primary-600">€{totalPrice}</p>
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
                Nhân viên
              </h3>
              <p className="text-sm font-medium text-gray-900">{staff.name}</p>
            </div>

            {/* Date & Time */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary-400" />
                Thời gian
              </h3>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {format(appointmentDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
                </p>
                <p className="text-xs text-gray-600">
                  Lúc {format(appointmentDate, 'HH:mm')}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary-400" />
                Thông tin khách hàng {guestCount > 1 ? `(${guestCount} khách)` : ''}
              </h3>
              <div className="space-y-2 text-xs text-gray-700">
                <div>
                  <p><span className="font-medium">Khách 1:</span> {customerInfo.name} – {customerInfo.phone}</p>
                  {customerInfo.email && <p className="text-gray-500">{customerInfo.email}</p>}
                </div>
                {guestCount > 1 && extraCustomers.slice(0, guestCount - 1).map((c, i) => (
                  <div key={i}>
                    <p><span className="font-medium">Khách {i + 2}:</span> {c.name} – {c.phone}</p>
                    {c.email && <p className="text-gray-500">{c.email}</p>}
                  </div>
                ))}
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
