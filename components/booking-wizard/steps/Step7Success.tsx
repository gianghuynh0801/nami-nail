'use client'

import { useEffect } from 'react'
import { CheckCircle, Calendar, Clock, MapPin, User, Phone, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { WizardState } from '../types'

interface Step7SuccessProps {
  state: WizardState
  onClose: () => void
  onViewAppointment: () => void
}

export default function Step7Success({
  state,
  onClose,
  onViewAppointment,
}: Step7SuccessProps) {
  const { salon, services, staff, isAnyStaff, selectedDate, selectedTime, customerInfo, createdAppointmentId } = state

  // Confetti effect on mount
  useEffect(() => {
    // You can add a confetti library here for celebration effect
    // For now, just a simple animation
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ'
  }

  const totalPrice = services.reduce((total, s) => total + s.price, 0)

  return (
    <div className="text-center space-y-6 py-4">
      {/* Success Icon */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto animate-bounce-once">
          <CheckCircle className="w-14 h-14 text-green-500" />
        </div>
        {/* Decorative circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32">
          <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-20" />
        </div>
      </div>

      {/* Success Message */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Đặt lịch thành công! 🎉
        </h2>
        <p className="text-gray-500">
          Cảm ơn bạn đã đặt lịch tại {salon?.name}
        </p>
      </div>

      {/* Booking ID */}
      {createdAppointmentId && (
        <div className="inline-block bg-gray-100 rounded-full px-4 py-2">
          <p className="text-sm text-gray-600">
            Mã đặt lịch: <span className="font-mono font-semibold text-gray-900">#{createdAppointmentId.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>
      )}

      {/* Booking Details Card */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-5 text-left border border-primary-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          Chi tiết lịch hẹn
        </h3>

        <div className="space-y-3">
          {/* Date & Time */}
          {selectedDate && selectedTime && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {format(new Date(selectedDate), 'EEEE, dd/MM/yyyy', { locale: vi })}
                </p>
                <p className="text-sm text-gray-600">Lúc {selectedTime}</p>
              </div>
            </div>
          )}

          {/* Location */}
          {salon && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{salon.name}</p>
                <p className="text-sm text-gray-600">{salon.address}</p>
              </div>
            </div>
          )}

          {/* Staff */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {isAnyStaff ? 'Nhân viên sẽ được phân công' : staff?.name}
              </p>
              <div className="text-sm text-gray-600">
                {services.map(s => s.name).join(', ')}
              </div>
            </div>
          </div>

          {/* Price */}
          {services.length > 0 && (
            <div className="pt-3 mt-3 border-t border-primary-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Tổng thanh toán</span>
                <span className="text-xl font-bold text-primary-600">{formatPrice(totalPrice)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center gap-2 text-blue-700">
          <Phone className="w-5 h-5" />
          <p className="text-sm">
            Xác nhận sẽ được gửi đến <span className="font-semibold">{customerInfo.phone}</span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        <button
          onClick={onViewAppointment}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-primary-400 text-white hover:bg-primary-500 shadow-lg shadow-primary-400/30 transition-all"
        >
          Xem chi tiết lịch hẹn
          <ExternalLink className="w-4 h-4" />
        </button>

        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Đóng
        </button>
      </div>

      {/* Add to Calendar hint */}
      <p className="text-sm text-gray-400">
        💡 Bạn có thể xem và quản lý lịch hẹn trong trang Dashboard
      </p>
    </div>
  )
}
