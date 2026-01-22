'use client'

import { useState } from 'react'
import { User, Clock, DollarSign, CheckCircle2, Play, Pause, ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react'
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
      revenueYesterday?: number
      revenueDiff?: number
      workingMinutes: number
    }
  }
  salonId: string
  rankIndex: number // Số thứ tự hiển thị
  onStart: (appointmentId: string) => void
  onComplete: (appointmentId: string) => void
  onPriorityChange: (staffId: string, direction: 'up' | 'down') => void
}

export default function StaffCard({ 
  staff, 
  salonId,
  rankIndex,
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
    if (staff.currentAppointment) return <Play className="w-3 h-3 text-blue-600" />
    if (staff.upcomingAppointments.length > 0) return <Clock className="w-3 h-3 text-yellow-600" />
    return <CheckCircle2 className="w-3 h-3 text-green-600" />
  }

  const getRemainingTime = () => {
    if (!staff.currentAppointment || !staff.currentAppointment.startedAt) return null
    
    const endTime = new Date(staff.currentAppointment.endTime)
    const now = new Date()
    const remaining = differenceInMinutes(endTime, now)
    
    if (remaining <= 0) return 'Đã hết giờ'
    if (remaining < 60) return `${remaining}p`
    const hours = Math.floor(remaining / 60)
    const minutes = remaining % 60
    return `${hours}h${minutes}p`
  }

  const formatRevenue = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}m`
    }
    if (amount >= 1000) {
      return `${Math.round(amount / 1000)}k`
    }
    return `${amount}đ`
  }

  return (
    <div className={`rounded-lg border-2 p-2.5 ${getStatusColor()} transition-all hover:shadow-md`}>
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {/* Số thứ tự */}
          <div className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            {rankIndex}
          </div>
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-primary-600 flex-shrink-0">
            {staff.staff.name.charAt(0)}
          </div>
          <h3 className="font-semibold text-sm text-gray-900 truncate">{staff.staff.name}</h3>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onPriorityChange(staff.staff.id, 'up')}
            className="p-0.5 hover:bg-white/50 rounded transition-colors"
            title="Tăng ưu tiên"
          >
            <ArrowUp className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button
            onClick={() => onPriorityChange(staff.staff.id, 'down')}
            className="p-0.5 hover:bg-white/50 rounded transition-colors"
            title="Giảm ưu tiên"
          >
            <ArrowDown className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Status - Compact */}
      <div className="flex items-center gap-1.5 mb-2">
        {getStatusIcon()}
        <span className="text-xs font-medium text-gray-700">{getStatusText()}</span>
      </div>

      {/* Current Appointment - Compact */}
      {staff.currentAppointment && (
        <div className="bg-white rounded p-2 mb-2 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-blue-600">Đang phục vụ</span>
            {getRemainingTime() && (
              <span className="text-[10px] text-orange-600 font-medium">{getRemainingTime()}</span>
            )}
          </div>
          <p className="font-medium text-gray-900 text-xs truncate">{staff.currentAppointment.customerName}</p>
          <p className="text-[10px] text-gray-500 truncate">{staff.currentAppointment.service.name}</p>
          <button
            onClick={() => onComplete(staff.currentAppointment!.id)}
            disabled={isLoading}
            className="mt-1.5 w-full px-2 py-1 bg-green-500 text-white rounded text-[10px] font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            Hoàn thành
          </button>
        </div>
      )}

      {/* Upcoming Appointments - Compact, chỉ hiện 1 */}
      {!staff.currentAppointment && staff.upcomingAppointments.length > 0 && (
        <div className="mb-2">
          {staff.upcomingAppointments.slice(0, 1).map((apt) => (
            <div key={apt.id} className="bg-white rounded p-2 border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-900 truncate">{apt.customerName}</p>
                <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                  {format(new Date(apt.startTime), 'HH:mm', { locale: vi })}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 truncate mb-1">{apt.service.name}</p>
              <button
                onClick={() => onStart(apt.id)}
                disabled={isLoading || new Date(apt.startTime) > new Date()}
                className="w-full px-2 py-1 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bắt đầu
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Statistics - Compact với so sánh ngày */}
      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-gray-300">
        <div className="text-center">
          <div className="flex items-center justify-center gap-0.5 text-[10px] text-gray-500">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Hoàn thành</span>
          </div>
          <p className="text-xs font-semibold text-gray-900">{staff.stats.completedToday}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-0.5 text-[10px] text-gray-500">
            <DollarSign className="w-2.5 h-2.5" />
            <span>Doanh thu</span>
          </div>
          <p className="text-xs font-semibold text-gray-900">
            {formatRevenue(staff.stats.revenue)}
          </p>
          {/* So sánh với ngày hôm trước */}
          {staff.stats.revenueDiff !== undefined && staff.stats.revenueDiff !== 0 && (
            <div className={`flex items-center justify-center gap-0.5 text-[9px] ${staff.stats.revenueDiff > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {staff.stats.revenueDiff > 0 ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5" />
              )}
              <span>{staff.stats.revenueDiff > 0 ? '+' : ''}{formatRevenue(staff.stats.revenueDiff)}</span>
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-0.5 text-[10px] text-gray-500">
            <Clock className="w-2.5 h-2.5" />
            <span>Giờ làm</span>
          </div>
          <p className="text-xs font-semibold text-gray-900">{staff.stats.workingMinutes}p</p>
        </div>
      </div>
    </div>
  )
}

