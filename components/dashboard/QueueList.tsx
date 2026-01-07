'use client'

import { Clock, User, Scissors, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale/vi'

interface QueueListProps {
  appointments: Array<{
    id: string
    customerName: string
    customerPhone: string
    service: {
      id: string
      name: string
    }
    startTime: string
    endTime: string
  }>
  staff: Array<{
    id: string
    name: string
  }>
  onAssign: (appointmentId: string, staffId: string) => void
}

export default function QueueList({ appointments, staff, onAssign }: QueueListProps) {
  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">Không có lịch hẹn chờ gán</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Hàng đợi ({appointments.length})</h3>
      </div>
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {appointments.map((apt) => (
          <div key={apt.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{apt.customerName}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Scissors className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{apt.service.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {format(new Date(apt.startTime), 'HH:mm', { locale: vi })} -{' '}
                    {format(new Date(apt.endTime), 'HH:mm', { locale: vi })}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Gán cho:
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onAssign(apt.id, e.target.value)
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                defaultValue=""
              >
                <option value="">Chọn nhân viên...</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

