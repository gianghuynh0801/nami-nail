'use client'

import { useState } from 'react'
import { X, Clock, User, GripVertical, Phone, AlertCircle } from 'lucide-react'
import { formatDistanceToNow, format, parseISO, differenceInMinutes } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { WaitingAppointment, CalendarStaff, CalendarAppointment } from './types'

interface WaitingListSidebarProps {
  appointments: WaitingAppointment[]
  staff: CalendarStaff[]
  onAssign: (appointment: WaitingAppointment, staffId: string, time: string) => void
  onClose: () => void
  /** Khách đã check-in (đang chờ làm) - gộp chung 1 bảng */
  checkedInAppointments?: CalendarAppointment[]
  onStartAppointment?: (appointmentId: string) => void
}

export default function WaitingListSidebar({
  appointments,
  staff,
  onAssign,
  onClose,
  checkedInAppointments = [],
  onStartAppointment,
}: WaitingListSidebarProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null)
  const [draggedAppointment, setDraggedAppointment] = useState<string | null>(null)

  const totalWaiting = checkedInAppointments.length + appointments.length

  const handleDragStart = (e: React.DragEvent, appointmentId: string) => {
    e.dataTransfer.setData('appointmentId', appointmentId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedAppointment(appointmentId)
  }

  const handleDragEnd = () => {
    setDraggedAppointment(null)
  }

  const getNearestSlot = () => {
    const now = new Date()
    const minutes = now.getMinutes()
    const roundedMinutes = Math.ceil(minutes / 15) * 15
    const hour = roundedMinutes === 60 ? now.getHours() + 1 : now.getHours()
    const minute = roundedMinutes === 60 ? 0 : roundedMinutes
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  const handleQuickAssign = (appointment: WaitingAppointment, staffId: string) => {
    const time = getNearestSlot()
    onAssign(appointment, staffId, time)
    setSelectedAppointment(null)
  }

  // Filter staff who are working
  const workingStaff = staff.filter(s => s.workingHours !== null)

  return (
    <div className="w-72 bg-white border-l border-beige-dark flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-beige-dark bg-beige-light flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Danh sách chờ</h3>
            <p className="text-sm text-gray-500">{totalWaiting} khách đang chờ</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-beige rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Phần 1: Đã check-in (đang chờ làm) */}
        {checkedInAppointments.length > 0 && (
          <>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1 mb-2">
              Đã check-in ({checkedInAppointments.length})
            </p>
            {checkedInAppointments.map((apt) => {
              const checkedInAt = apt.checkedInAt ? parseISO(apt.checkedInAt) : null
              const endTime = apt.startedAt ? parseISO(apt.startedAt) : new Date()
              const waitingTime = checkedInAt
                ? `${format(checkedInAt, 'HH:mm')} - ${format(endTime, 'HH:mm')}`
                : null
              const waitingMinutes =
                checkedInAt && !apt.startedAt
                  ? differenceInMinutes(new Date(), checkedInAt)
                  : null
              const isLongWait = waitingMinutes !== null && waitingMinutes >= 30

              return (
                <div
                  key={apt.id}
                  className={`
                    p-3 rounded-lg border-2
                    ${isLongWait ? 'border-red-400 bg-red-50' : 'border-green-200 bg-white'}
                  `}
                >
                  <div className="flex items-start gap-2">
                    {apt.queueNumber && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                        {apt.queueNumber}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate text-sm">{apt.customerName}</p>
                        {isLongWait && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-600 truncate">{apt.service.name}</p>
                      {waitingTime && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className={`text-xs ${isLongWait ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            {waitingTime}
                            {waitingMinutes !== null && ` (${waitingMinutes}p)`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {onStartAppointment && apt.status === 'CHECKED_IN' && (
                    <button
                      onClick={() => onStartAppointment(apt.id)}
                      className="mt-2 w-full px-3 py-1.5 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                    >
                      Bắt đầu làm
                    </button>
                  )}
                </div>
              )
            })}
            <p className="text-xs text-gray-500 px-1 mt-2 mb-1">💡 Kéo thả để sắp xếp lại thứ tự</p>
          </>
        )}

        {/* Phần 2: Chờ xác nhận / chưa gán */}
        {appointments.length === 0 && checkedInAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Không có khách đang chờ</p>
            <p className="text-xs text-gray-400 mt-1">
              Khách mới sẽ xuất hiện ở đây
            </p>
          </div>
        ) : (
          <>
            {checkedInAppointments.length > 0 && (
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1 mb-2 mt-3">
                Chờ xác nhận / chưa gán ({appointments.length})
              </p>
            )}
            {appointments.map((apt) => (
            <div
              key={apt.id}
              draggable
              onDragStart={(e) => handleDragStart(e, apt.id)}
              onDragEnd={handleDragEnd}
              className={`
                p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all
                ${selectedAppointment === apt.id 
                  ? 'border-primary-400 bg-primary-50 shadow-md' 
                  : 'border-beige-dark bg-white hover:border-primary-300 hover:shadow-sm'}
                ${draggedAppointment === apt.id ? 'opacity-50 scale-95' : ''}
              `}
              onClick={() => setSelectedAppointment(
                selectedAppointment === apt.id ? null : apt.id
              )}
            >
              <div className="flex items-start gap-2">
                {/* Drag handle */}
                <div className="flex-shrink-0 pt-1 text-gray-400">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {apt.customerName}
                    </p>
                    {/* Status badge */}
                    <span className={`
                      px-1.5 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0
                      ${apt.status === 'PENDING' 
                        ? 'bg-yellow-100 text-yellow-700'
                        : apt.status === 'CONFIRMED'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-teal-100 text-teal-700'}
                    `}>
                      {apt.status === 'PENDING' ? 'Chờ xác nhận' : apt.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Đã check-in'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">
                    {apt.service.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {/* Thời gian hẹn */}
                    {apt.startTime && (
                      <span className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(apt.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      {apt.service.duration} phút
                    </span>
                    {apt.customerPhone && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />
                        {apt.customerPhone}
                      </span>
                    )}
                  </div>
                  {/* Nhân viên đã gán */}
                  {apt.assignedStaff && (
                    <p className="text-[10px] text-blue-600 mt-1">
                      👤 Gán cho: {apt.assignedStaff.name}
                    </p>
                  )}
                  {/* Thời gian đã đặt */}
                  {apt.createdAt && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Đặt {formatDistanceToNow(new Date(apt.createdAt), { addSuffix: true, locale: vi })}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick assign buttons */}
              {selectedAppointment === apt.id && workingStaff.length > 0 && (
                <div className="mt-3 pt-3 border-t border-beige-dark">
                  <p className="text-xs text-gray-500 mb-2">Gán nhanh cho:</p>
                  <div className="flex flex-wrap gap-1">
                    {workingStaff.slice(0, 6).map((s) => (
                      <button
                        key={s.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleQuickAssign(apt, s.id)
                        }}
                        className="px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors flex items-center gap-1"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: s.avatarColor }}
                        />
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {apt.notes && (
                <p className="mt-2 text-xs text-gray-500 truncate">
                  📝 {apt.notes}
                </p>
              )}
            </div>
          ))}
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-3 border-t border-beige-dark bg-beige-light flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          💡 Kéo thả khách vào lịch hoặc nhấn để gán nhanh
        </p>
      </div>
    </div>
  )
}
