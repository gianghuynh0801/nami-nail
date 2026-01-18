'use client'

import { useState } from 'react'
import { Building2, Scissors, User, Calendar, UserCircle, Clock, DollarSign, ChevronLeft, Edit2, CheckCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { WizardState } from '../types'

interface Step6ReviewProps {
  state: WizardState
  onConfirm: () => Promise<void>
  onBack: () => void
  onEditStep: (step: number) => void
}

export default function Step6Review({
  state,
  onConfirm,
  onBack,
  onEditStep,
}: Step6ReviewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { salon, staff, isAnyStaff, selectedDate, selectedTime, customerInfo } = state

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ'
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const ReviewItem = ({ 
    icon: Icon, 
    label, 
    value, 
    subValue,
    step,
  }: { 
    icon: any
    label: string
    value: string
    subValue?: string
    step: number
  }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900 truncate">{value}</p>
        {subValue && (
          <p className="text-sm text-gray-500">{subValue}</p>
        )}
      </div>
      <button
        onClick={() => onEditStep(step)}
        className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
        title="Chỉnh sửa"
      >
        <Edit2 className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Xác nhận đặt lịch
        </h2>
        <p className="text-gray-500">
          Vui lòng kiểm tra lại thông tin trước khi xác nhận
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Review Items */}
      <div className="space-y-3">
        {salon && (
          <ReviewItem
            icon={Building2}
            label="Chi nhánh"
            value={salon.name}
            subValue={salon.address}
            step={1}
          />
        )}

        {state.services.length > 0 && (
          <div className="flex flex-col gap-2">
            {state.services.map((s, index) => (
              <ReviewItem
                key={s.id}
                icon={Scissors}
                label={`Dịch vụ ${index + 1}`}
                value={s.name}
                subValue={`${s.duration} phút • ${formatPrice(s.price)}`}
                step={2}
              />
            ))}
          </div>
        )}

        <ReviewItem
          icon={User}
          label="Nhân viên"
          value={isAnyStaff ? 'Bất kỳ (Hệ thống tự chọn)' : staff?.name || ''}
          step={3}
        />

        {selectedDate && selectedTime && (
          <ReviewItem
            icon={Calendar}
            label="Ngày & Giờ"
            value={format(new Date(selectedDate), 'EEEE, dd/MM/yyyy', { locale: vi })}
            subValue={`Lúc ${selectedTime}`}
            step={4}
          />
        )}

        <ReviewItem
          icon={UserCircle}
          label="Khách hàng"
          value={customerInfo.name}
          subValue={customerInfo.phone}
          step={5}
        />

        {customerInfo.notes && (
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <span className="font-medium">Ghi chú:</span> {customerInfo.notes}
            </p>
          </div>
        )}
      </div>

      {/* Price Summary */}
      {state.services.length > 0 && (
        <div className="bg-gradient-to-r from-primary-400 to-primary-500 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm">Tổng thanh toán</p>
              <p className="text-3xl font-bold">
                {formatPrice(state.services.reduce((total, s) => total + s.price, 0))}
              </p>
            </div>
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <DollarSign className="w-7 h-7" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center gap-2 text-sm text-primary-100">
              <Clock className="w-4 h-4" />
              <span>
                Tổng thời gian: {state.services.reduce((total, s) => total + s.duration, 0)} phút
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Terms */}
      <div className="text-sm text-gray-500 text-center">
        Bằng việc đặt lịch, bạn đồng ý với{' '}
        <a href="#" className="text-primary-600 hover:underline">Điều khoản dịch vụ</a>
        {' '}và{' '}
        <a href="#" className="text-primary-600 hover:underline">Chính sách bảo mật</a>
      </div>

      {/* Navigation */}
      <div className="pt-4 border-t border-gray-200 flex gap-3">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
          Quay lại
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-primary-400 text-white hover:bg-primary-500 shadow-lg shadow-primary-400/30 transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Xác nhận đặt lịch
            </>
          )}
        </button>
      </div>
    </div>
  )
}
