'use client'

import { useState, useEffect } from 'react'
import { GripVertical, Clock, User, AlertCircle, Bell } from 'lucide-react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { useTranslations } from 'next-intl'
import type { CalendarAppointment } from './types'

interface QueueListProps {
  appointments: CalendarAppointment[]
  onReorder?: (newOrder: string[]) => void
  onStart?: (appointmentId: string) => void
}

export default function QueueList({ 
  appointments, 
  onReorder,
  onStart,
}: QueueListProps) {
  const t = useTranslations('Calendar')
  const [queueOrder, setQueueOrder] = useState<string[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [longWaitNotifications, setLongWaitNotifications] = useState<Set<string>>(new Set())

  // Initialize queue order
  useEffect(() => {
    const sorted = [...appointments]
      .sort((a, b) => {
        // Sort by queue number first, then by check-in time
        if (a.queueNumber && b.queueNumber) {
          return a.queueNumber - b.queueNumber
        }
        if (a.queueNumber) return -1
        if (b.queueNumber) return 1
        if (a.checkedInAt && b.checkedInAt) {
          return new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime()
        }
        return 0
      })
      .map(apt => apt.id)
    setQueueOrder(sorted)
  }, [appointments])

  // Check for long wait times (>= 30 minutes)
  useEffect(() => {
    const now = new Date()
    const longWaiters = new Set<string>()
    
    appointments.forEach(apt => {
      if (apt.status === 'CHECKED_IN' && apt.checkedInAt && !apt.startedAt) {
        const checkedIn = parseISO(apt.checkedInAt)
        const minutes = differenceInMinutes(now, checkedIn)
        if (minutes >= 30) {
          longWaiters.add(apt.id)
        }
      }
    })
    
    setLongWaitNotifications(longWaiters)
  }, [appointments])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null) return

    const newOrder = [...queueOrder]
    const [removed] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(dropIndex, 0, removed)
    
    setQueueOrder(newOrder)
    setDraggedIndex(null)
    
    if (onReorder) {
      onReorder(newOrder)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const getWaitingTime = (apt: CalendarAppointment) => {
    if (!apt.checkedInAt) return null
    const checkedIn = parseISO(apt.checkedInAt)
    const endTime = apt.startedAt ? parseISO(apt.startedAt) : new Date()
    return `${format(checkedIn, 'HH:mm')} - ${format(endTime, 'HH:mm')}`
  }

  const getWaitingMinutes = (apt: CalendarAppointment) => {
    if (!apt.checkedInAt || apt.startedAt) return null
    const checkedIn = parseISO(apt.checkedInAt)
    const now = new Date()
    return differenceInMinutes(now, checkedIn)
  }

  // Get appointments in queue order
  const orderedAppointments = queueOrder
    .map(id => appointments.find(apt => apt.id === id))
    .filter(Boolean) as CalendarAppointment[]

  if (orderedAppointments.length === 0) {
    return (
      <div className="w-72 bg-white border-l border-beige-dark flex flex-col h-full shadow-lg">
        <div className="p-4 border-b border-beige-dark bg-beige-light flex-shrink-0">
          <h3 className="font-semibold text-gray-900">{t('waitingList')}</h3>
          <p className="text-sm text-gray-500">{t('customersWaiting', { count: 0 })}</p>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('noCustomersWaiting')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-72 bg-white border-l border-beige-dark flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-beige-dark bg-beige-light flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{t('waitingList')}</h3>
            <p className="text-sm text-gray-500">{t('customersWaiting', { count: orderedAppointments.length })}</p>
          </div>
          {longWaitNotifications.size > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5 text-red-500 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {longWaitNotifications.size}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {orderedAppointments.map((apt, index) => {
          const waitingTime = getWaitingTime(apt)
          const waitingMinutes = getWaitingMinutes(apt)
          const isLongWait = waitingMinutes !== null && waitingMinutes >= 30
          const hasNotification = longWaitNotifications.has(apt.id)

          return (
            <div
              key={apt.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all
                ${isLongWait || hasNotification
                  ? 'border-red-400 bg-red-50'
                  : 'border-green-200 bg-white hover:border-green-300'
                }
                ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
              `}
            >
              <div className="flex items-start gap-2">
                {/* Drag handle */}
                <div className="flex-shrink-0 pt-1 text-gray-400">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Queue number badge */}
                {apt.queueNumber && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                    {apt.queueNumber}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {apt.customerName}
                    </p>
                    {hasNotification && (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 truncate">
                    {apt.service.name}
                  </p>
                  
                  {/* Waiting time */}
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

              {/* Start button */}
              {onStart && apt.status === 'CHECKED_IN' && (
                <button
                  onClick={() => onStart(apt.id)}
                  className="mt-2 w-full px-3 py-1.5 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                >
                  Bắt đầu làm
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-beige-dark bg-beige-light flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          💡 Kéo thả để sắp xếp lại thứ tự hiển thị
        </p>
      </div>
    </div>
  )
}
