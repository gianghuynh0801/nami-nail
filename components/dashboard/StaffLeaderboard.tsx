'use client'

import { useState } from 'react'
import { 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Play,
  Clock
} from 'lucide-react'
import { format, differenceInMinutes } from 'date-fns'
import { vi } from 'date-fns/locale/vi'

interface StaffData {
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

interface StaffLeaderboardProps {
  staffList: StaffData[]
  salonId: string
  onStart: (appointmentId: string) => void
  onComplete: (appointmentId: string) => void
  onPriorityChange: (staffId: string, direction: 'up' | 'down') => void
}

export default function StaffLeaderboard({
  staffList,
  salonId,
  onStart,
  onComplete,
  onPriorityChange,
}: StaffLeaderboardProps) {
  const formatRevenue = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}m`
    }
    if (amount >= 1000) {
      return `${Math.round(amount / 1000)}k`
    }
    return `${amount}đ`
  }

  const getRemainingTime = (appointment: StaffData['currentAppointment']) => {
    if (!appointment || !appointment.startedAt) return null
    
    const endTime = new Date(appointment.endTime)
    const now = new Date()
    const remaining = differenceInMinutes(endTime, now)
    
    if (remaining <= 0) return 'Hết giờ'
    if (remaining < 60) return `${remaining}p`
    const hours = Math.floor(remaining / 60)
    const minutes = remaining % 60
    return `${hours}h${minutes}p`
  }

  const getStatusInfo = (staff: StaffData) => {
    if (staff.currentAppointment) {
      const remaining = getRemainingTime(staff.currentAppointment)
      return {
        type: 'working' as const,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        icon: <Play className="w-3 h-3" />,
        text: `${staff.currentAppointment.customerName} - ${staff.currentAppointment.service.name}`,
        subText: remaining ? `(${remaining})` : '',
      }
    }
    if (staff.upcomingAppointments.length > 0) {
      const next = staff.upcomingAppointments[0]
      return {
        type: 'scheduled' as const,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        icon: <Clock className="w-3 h-3" />,
        text: `Có lịch ${format(new Date(next.startTime), 'HH:mm', { locale: vi })}`,
        subText: `- ${next.customerName}`,
      }
    }
    return {
      type: 'available' as const,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: <CheckCircle2 className="w-3 h-3" />,
      text: 'Rảnh',
      subText: '',
    }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-gray-600">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-2">Nhân viên</div>
          <div className="col-span-4">Trạng thái</div>
          <div className="col-span-2 text-center">Doanh thu</div>
          <div className="col-span-1 text-center">Xong</div>
          <div className="col-span-2 text-center">Thao tác</div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-100">
        {staffList.map((staff, index) => {
          const status = getStatusInfo(staff)
          const rankIndex = index + 1

          return (
            <div
              key={staff.staff.id}
              className={`grid grid-cols-12 gap-2 px-3 py-2.5 items-center hover:bg-gray-50 transition-colors ${status.bgColor}`}
            >
              {/* Rank */}
              <div className="col-span-1 flex justify-center">
                <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
                  {rankIndex}
                </div>
              </div>

              {/* Name */}
              <div className="col-span-2 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-semibold text-primary-600">
                  {staff.staff.name.charAt(0)}
                </div>
                <span className="font-medium text-sm text-gray-900 truncate">
                  {staff.staff.name}
                </span>
              </div>

              {/* Status */}
              <div className="col-span-4 flex items-center gap-1.5 min-w-0">
                <span className={status.color}>{status.icon}</span>
                <span className={`text-xs ${status.color} truncate`}>
                  {status.text}
                </span>
                {status.subText && (
                  <span className="text-xs text-gray-500 truncate">
                    {status.subText}
                  </span>
                )}
              </div>

              {/* Revenue */}
              <div className="col-span-2 text-center">
                <div className="text-sm font-semibold text-gray-900">
                  {formatRevenue(staff.stats.revenue)}
                </div>
                {staff.stats.revenueDiff !== undefined && staff.stats.revenueDiff !== 0 && (
                  <div className={`flex items-center justify-center gap-0.5 text-[10px] ${staff.stats.revenueDiff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {staff.stats.revenueDiff > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{staff.stats.revenueDiff > 0 ? '+' : ''}{formatRevenue(staff.stats.revenueDiff)}</span>
                  </div>
                )}
              </div>

              {/* Completed */}
              <div className="col-span-1 text-center">
                <span className="text-sm font-semibold text-gray-900">
                  {staff.stats.completedToday}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-2 flex items-center justify-center gap-1">
                {/* Priority buttons */}
                <div className="flex items-center gap-0.5 mr-1">
                  <button
                    onClick={() => onPriorityChange(staff.staff.id, 'up')}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Tăng ưu tiên"
                    disabled={rankIndex === 1}
                  >
                    <ArrowUp className={`w-3.5 h-3.5 ${rankIndex === 1 ? 'text-gray-300' : 'text-gray-600'}`} />
                  </button>
                  <button
                    onClick={() => onPriorityChange(staff.staff.id, 'down')}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Giảm ưu tiên"
                    disabled={rankIndex === staffList.length}
                  >
                    <ArrowDown className={`w-3.5 h-3.5 ${rankIndex === staffList.length ? 'text-gray-300' : 'text-gray-600'}`} />
                  </button>
                </div>

                {/* Action button based on status */}
                {staff.currentAppointment && (
                  <button
                    onClick={() => onComplete(staff.currentAppointment!.id)}
                    className="px-2 py-1 bg-green-500 text-white rounded text-[10px] font-medium hover:bg-green-600 transition-colors"
                  >
                    Xong
                  </button>
                )}
                {!staff.currentAppointment && staff.upcomingAppointments.length > 0 && (
                  <button
                    onClick={() => onStart(staff.upcomingAppointments[0].id)}
                    disabled={new Date(staff.upcomingAppointments[0].startTime) > new Date()}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-[10px] font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Bắt đầu
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {staffList.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            Chưa có nhân viên nào trong ca
          </div>
        )}
      </div>
    </div>
  )
}
