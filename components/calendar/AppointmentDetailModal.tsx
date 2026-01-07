'use client'

import { useState } from 'react'
import { X, User, Phone, Scissors, Clock, Calendar, MapPin, FileText, Play, CheckCircle, XCircle, Edit2, Trash2, Loader2, LogIn } from 'lucide-react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { CalendarAppointment } from './types'

interface AppointmentDetailModalProps {
  appointment: CalendarAppointment | null
  staffName: string
  salonName?: string
  isOpen: boolean
  onClose: () => void
  onCheckIn?: (appointmentId: string) => Promise<void>
  onStart?: (appointmentId: string) => Promise<void>
  onComplete?: (appointmentId: string) => Promise<void>
  onCancel?: (appointmentId: string) => Promise<void>
  onEdit?: (appointment: CalendarAppointment) => void
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ xác nhận',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckCircle,
  },
  CHECKED_IN: {
    label: 'Đã check-in',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: LogIn,
  },
  IN_PROGRESS: {
    label: 'Đang thực hiện',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Play,
  },
  COMPLETED: {
    label: 'Hoàn thành',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Đã hủy',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
  },
}

export default function AppointmentDetailModal({
  appointment,
  staffName,
  salonName,
  isOpen,
  onClose,
  onCheckIn,
  onStart,
  onComplete,
  onCancel,
  onEdit,
}: AppointmentDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [actionType, setActionType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !appointment) return null

  const statusConfig = STATUS_CONFIG[appointment.status]
  const StatusIcon = statusConfig.icon

  const startTime = parseISO(appointment.startTime)
  const endTime = parseISO(appointment.endTime)

  // Calculate waiting time
  const waitingTime = appointment.status === 'CHECKED_IN' && appointment.checkedInAt && !appointment.startedAt
    ? (() => {
        const checkedIn = parseISO(appointment.checkedInAt)
        const now = new Date()
        const minutes = differenceInMinutes(now, checkedIn)
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hours > 0) {
          return `${hours} giờ ${mins > 0 ? `${mins} phút` : ''}`
        }
        return `${mins} phút`
      })()
    : null

  const waitingTimeRange = appointment.status === 'CHECKED_IN' && appointment.checkedInAt && appointment.startedAt
    ? `${format(parseISO(appointment.checkedInAt), 'HH:mm')} - ${format(parseISO(appointment.startedAt), 'HH:mm')}`
    : null

  const isLongWait = appointment.status === 'CHECKED_IN' && appointment.checkedInAt && !appointment.startedAt
    ? differenceInMinutes(new Date(), parseISO(appointment.checkedInAt)) >= 30
    : false

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ'
  }

  const handleAction = async (action: 'checkIn' | 'start' | 'complete' | 'cancel') => {
    setIsLoading(true)
    setActionType(action)
    setError(null)
    try {
      if (action === 'checkIn' && onCheckIn) {
        await onCheckIn(appointment.id)
      } else if (action === 'start' && onStart) {
        await onStart(appointment.id)
      } else if (action === 'complete' && onComplete) {
        await onComplete(appointment.id)
      } else if (action === 'cancel' && onCancel) {
        await onCancel(appointment.id)
      }
      // Only close modal on success
      onClose()
    } catch (error: any) {
      console.error(`Error ${action} appointment:`, error)
      setError(error?.message || `Có lỗi xảy ra khi ${action === 'checkIn' ? 'check-in' : action === 'start' ? 'bắt đầu' : action === 'complete' ? 'hoàn thành' : 'hủy'} lịch hẹn`)
    } finally {
      setIsLoading(false)
      setActionType(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header with status color */}
        <div className={`px-6 py-4 ${statusConfig.color} border-b`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className="w-5 h-5" />
              <span className="font-medium">{statusConfig.label}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-black/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Customer Info */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-lg">
              {appointment.customerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">
                {appointment.customerName}
              </h3>
              <a
                href={`tel:${appointment.customerPhone}`}
                className="flex items-center gap-1 text-primary-600 hover:underline text-sm"
              >
                <Phone className="w-4 h-4" />
                {appointment.customerPhone}
              </a>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Details */}
          <div className="space-y-3">
            {/* Service */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Dịch vụ</p>
                <p className="font-medium text-gray-900">{appointment.service.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{appointment.service.duration} phút</p>
              </div>
            </div>

            {/* Staff */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Nhân viên</p>
                <p className="font-medium text-gray-900">{staffName}</p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Thời gian</p>
                <p className="font-medium text-gray-900">
                  {format(startTime, 'EEEE, dd/MM/yyyy', { locale: vi })}
                </p>
                <p className="text-sm text-gray-600">
                  {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                </p>
              </div>
            </div>

            {/* Salon */}
            {salonName && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Chi nhánh</p>
                  <p className="font-medium text-gray-900">{salonName}</p>
                </div>
              </div>
            )}

            {/* Queue Number */}
            {appointment.queueNumber && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <span className="text-lg font-bold text-green-700">{appointment.queueNumber}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Số thứ tự</p>
                  <p className="font-medium text-gray-900">#{appointment.queueNumber}</p>
                </div>
              </div>
            )}

            {/* Waiting Time */}
            {waitingTime && (
              <div className={`flex items-center gap-3 ${isLongWait ? 'bg-red-50 p-3 rounded-lg border border-red-200' : ''}`}>
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Thời gian chờ</p>
                  <p className={`font-medium ${isLongWait ? 'text-red-700' : 'text-gray-900'}`}>
                    {waitingTime}
                    {isLongWait && ' ⚠️'}
                  </p>
                </div>
              </div>
            )}

            {/* Waiting Time Range */}
            {waitingTimeRange && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Thời gian chờ</p>
                  <p className="font-medium text-gray-900">{waitingTimeRange}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Ghi chú</p>
                  <p className="text-gray-700">{appointment.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          {/* Error message */}
          {error && (
            <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {/* Status-based actions */}
          {appointment.status === 'CONFIRMED' && onCheckIn && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => handleAction('checkIn')}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
              >
                {isLoading && actionType === 'checkIn' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Đã đến
              </button>
            </div>
          )}

          {appointment.status === 'CHECKED_IN' && onStart && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => handleAction('start')}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 font-medium"
              >
                {isLoading && actionType === 'start' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Bắt đầu làm
              </button>
            </div>
          )}

          {appointment.status === 'IN_PROGRESS' && onComplete && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => handleAction('complete')}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 font-medium"
              >
                {isLoading && actionType === 'complete' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Hoàn thành
              </button>
            </div>
          )}

          {/* Common actions */}
          <div className="flex gap-2">
            {onEdit && appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
              <button
                onClick={() => onEdit(appointment)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Sửa
              </button>
            )}

            {onCancel && appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
              <button
                onClick={() => handleAction('cancel')}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 font-medium"
              >
                {isLoading && actionType === 'cancel' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Hủy
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
