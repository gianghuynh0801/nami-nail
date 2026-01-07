'use client'

import { useState } from 'react'
import { X, Clock, User, GripVertical } from 'lucide-react'
import type { WaitingAppointment, CalendarStaff } from './types'

interface WaitingListSidebarProps {
  appointments: WaitingAppointment[]
  staff: CalendarStaff[]
  onAssign: (appointment: WaitingAppointment, staffId: string, time: string) => void
  onClose: () => void
}

export default function WaitingListSidebar({
  appointments,
  staff,
  onAssign,
  onClose,
}: WaitingListSidebarProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null)
  const [draggedAppointment, setDraggedAppointment] = useState<string | null>(null)

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
            <p className="text-sm text-gray-500">{appointments.length} khách đang chờ</p>
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
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Không có khách đang chờ</p>
            <p className="text-xs text-gray-400 mt-1">
              Khách mới sẽ xuất hiện ở đây
            </p>
          </div>
        ) : (
          appointments.map((apt) => (
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
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {apt.customerName}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {apt.service.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {apt.service.duration} phút
                    </span>
                  </div>
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
          ))
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
