'use client'

import { useState, useEffect } from 'react'
import { Bell, X, AlertCircle } from 'lucide-react'
import { differenceInMinutes, parseISO } from 'date-fns'
import type { CalendarAppointment } from './types'

interface NotificationCenterProps {
  appointments: CalendarAppointment[]
}

interface Notification {
  id: string
  appointmentId: string
  customerName: string
  message: string
  waitingMinutes: number
  type: 'wait' | 'new'
}

export default function NotificationCenter({ appointments }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const now = new Date()
    const newNotifications: Notification[] = []

    appointments.forEach(apt => {
      // Check for checked-in appointments waiting > 30 minutes
      if (apt.status === 'CHECKED_IN' && apt.checkedInAt && !apt.startedAt) {
        const checkedIn = parseISO(apt.checkedInAt)
        const minutes = differenceInMinutes(now, checkedIn)
        
        if (minutes >= 30) {
          newNotifications.push({
            id: `wait-${apt.id}`,
            appointmentId: apt.id,
            customerName: apt.customerName,
            message: `Khách ${apt.customerName} đã chờ ${minutes} phút`,
            waitingMinutes: minutes,
            type: 'wait',
          })
        }
      }

      // Check for new appointments (created within last 5 minutes)
      // Note: createdAt should be available from backend mapping
      if (apt.createdAt) {
        const created = parseISO(apt.createdAt)
        const minutesSinceCreation = differenceInMinutes(now, created)
        
        if (minutesSinceCreation < 5) { // 5 minutes window for new booking alert
          newNotifications.push({
            id: `new-${apt.id}`,
            appointmentId: apt.id,
            customerName: apt.customerName,
            message: `Có lịch đặt mới từ ${apt.customerName}`,
            waitingMinutes: 0,
            type: 'new',
          })
        }
      }
    })

    setNotifications(newNotifications)
  }, [appointments])

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-50">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Thông báo</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="divide-y divide-gray-200">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 transition-colors ${
                  notif.type === 'new' ? 'hover:bg-blue-50 bg-blue-50/50' : 'hover:bg-red-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    notif.type === 'new' ? 'text-blue-500' : 'text-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notif.customerName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {notif.message}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDismiss(notif.id)}
                    className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
