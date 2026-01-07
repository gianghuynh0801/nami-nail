'use client'

import { useState } from 'react'
import { User, Clock, DollarSign, CheckCircle2, Play, Pause, ArrowUp, ArrowDown } from 'lucide-react'
import { format, differenceInMinutes } from 'date-fns'
import { vi } from 'date-fns/locale/vi'

interface StaffCardProps {
  staff: {
    staff: {
      id: string
      name: string
      phone: string
    }
    priority: {
      id: string
      priorityOrder: number
      sortByRevenue: string
      isActive: boolean
    } | null
    currentAppointment: {
      id: string
      customerName: string
      service: { name: string }
      startedAt: string | null
      endTime: string
    } | null
    upcomingAppointments: Array<{
      id: string
      customerName: string
      service: { name: string }
      startTime: string
    }>
    stats: {
      completedToday: number
      revenue: number
      workingMinutes: number
    }
  }
  salonId: string
  onStart: (appointmentId: string) => void
  onComplete: (appointmentId: string) => void
  onPriorityChange: (staffId: string, direction: 'up' | 'down') => void
}

export default function StaffCard({ 
  staff, 
  salonId, 
  onStart, 
  onComplete, 
  onPriorityChange 
}: StaffCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const getStatusColor = () => {
    if (staff.currentAppointment) return 'bg-blue-100 border-blue-300'
    if (staff.upcomingAppointments.length > 0) return 'bg-yellow-50 border-yellow-200'
    return 'bg-green-50 border-green-200'
  }

  const getStatusText = () => {
    if (staff.currentAppointment) return 'Đang làm'
    if (staff.upcomingAppointments.length > 0) return 'Có lịch'
    return 'Rảnh'
  }

  const getStatusIcon = () => {
    if (staff.currentAppointment) return <Play className="w-4 h-4 text-blue-600" />
    if (staff.upcomingAppointments.length > 0) return <Clock className="w-4 h-4 text-yellow-600" />
    return <CheckCircle2 className="w-4 h-4 text-green-600" />
  }

  const getRemainingTime = () => {
    if (!staff.currentAppointment || !staff.currentAppointment.startedAt) return null
    
    const endTime = new Date(staff.currentAppointment.endTime)
    const now = new Date()
    const remaining = differenceInMinutes(endTime, now)
    
    if (remaining <= 0) return 'Đã hết giờ'
    if (remaining < 60) return `${remaining} phút`
    const hours = Math.floor(remaining / 60)
    const minutes = remaining % 60
    return `${hours}h ${minutes}p`
  }

  return (
    <div className={`rounded-lg border-2 p-4 ${getStatusColor()} transition-all hover:shadow-lg`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-semibold text-primary-600">
            {staff.staff.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{staff.staff.name}</h3>
            <p className="text-xs text-gray-500">{staff.staff.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPriorityChange(staff.staff.id, 'up')}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Tăng ưu tiên"
          >
            <ArrowUp className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => onPriorityChange(staff.staff.id, 'down')}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Giảm ưu tiên"
          >
            <ArrowDown className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        {getStatusIcon()}
        <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
        {staff.priority && (
          <span className="text-xs text-gray-500 ml-auto">
            Ưu tiên: #{staff.priority.priorityOrder}
          </span>
        )}
      </div>

      {/* Current Appointment */}
      {staff.currentAppointment && (
        <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600">Đang phục vụ</span>
            {getRemainingTime() && (
              <span className="text-xs text-gray-500">{getRemainingTime()}</span>
            )}
          </div>
          <p className="font-medium text-gray-900 text-sm">{staff.currentAppointment.customerName}</p>
          <p className="text-xs text-gray-600">{staff.currentAppointment.service.name}</p>
          <button
            onClick={() => onComplete(staff.currentAppointment!.id)}
            disabled={isLoading}
            className="mt-2 w-full px-3 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            Hoàn thành
          </button>
        </div>
      )}

      {/* Upcoming Appointments */}
      {staff.upcomingAppointments.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-600 mb-1">Lịch tiếp theo:</p>
          {staff.upcomingAppointments.slice(0, 2).map((apt) => (
            <div key={apt.id} className="bg-white rounded p-2 mb-1 border border-gray-200">
              <p className="text-xs font-medium text-gray-900">{apt.customerName}</p>
              <p className="text-xs text-gray-500">{apt.service.name}</p>
              <p className="text-xs text-gray-400">
                {format(new Date(apt.startTime), 'HH:mm', { locale: vi })}
              </p>
              <button
                onClick={() => onStart(apt.id)}
                disabled={isLoading || new Date(apt.startTime) > new Date()}
                className="mt-1 w-full px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bắt đầu
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-300">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Hoàn thành</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{staff.stats.completedToday}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-1">
            <DollarSign className="w-3 h-3" />
            <span>Doanh thu</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {staff.stats.revenue.toLocaleString('vi-VN')}đ
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-1">
            <Clock className="w-3 h-3" />
            <span>Giờ làm</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{staff.stats.workingMinutes}p</p>
        </div>
      </div>
    </div>
  )
}

