'use client'

import { Clock, User, Scissors, Play } from 'lucide-react'
import { differenceInMinutes } from 'date-fns'
import { useTranslations } from 'next-intl'

interface WaitingAppointment {
  id: string
  customerName: string
  customerPhone: string
  queueNumber: number | null
  checkedInAt: string
  service: {
    id: string
    name: string
  }
  staff: {
    id: string
    name: string
  }
  startTime: string
  endTime: string
}

interface QueueListProps {
  waitingQueue: WaitingAppointment[]
  onStart: (appointmentId: string) => void
}

export default function QueueList({ waitingQueue, onStart }: QueueListProps) {
  const t = useTranslations('Calendar')
  const getWaitingTime = (checkedInAt: string) => {
    const checkIn = new Date(checkedInAt)
    const now = new Date()
    const minutes = differenceInMinutes(now, checkIn)
    
    if (minutes < 1) return 'Vừa đến'
    if (minutes < 60) return `${minutes} phút`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}p`
  }

  const getWaitingColor = (checkedInAt: string) => {
    const minutes = differenceInMinutes(new Date(), new Date(checkedInAt))
    if (minutes < 15) return 'text-green-600'
    if (minutes < 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (waitingQueue.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-900">{t('waitingList')}</h3>
          <span className="text-xs text-gray-500">{t('customersWaiting', { count: 0 })}</span>
        </div>
        <div className="p-6 text-center">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('noCustomersWaiting')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('newCustomersAppearHere')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-900">{t('waitingList')}</h3>
        <span className="text-xs text-gray-500">{t('customersWaiting', { count: waitingQueue.length })}</span>
      </div>

      {/* Queue Items */}
      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {waitingQueue.map((apt, index) => (
          <div 
            key={apt.id} 
            className="p-3 hover:bg-gray-50 transition-colors"
          >
            {/* Queue Number & Customer */}
            <div className="flex items-start gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {apt.queueNumber || index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {apt.customerName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {apt.service.name}
                </p>
              </div>
            </div>

            {/* Staff & Waiting Time */}
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1 text-gray-600">
                <User className="w-3 h-3" />
                <span>{apt.staff.name}</span>
              </div>
              <div className={`flex items-center gap-1 font-medium ${getWaitingColor(apt.checkedInAt)}`}>
                <Clock className="w-3 h-3" />
                <span>Chờ {getWaitingTime(apt.checkedInAt)}</span>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={() => onStart(apt.id)}
              className="w-full px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
            >
              <Play className="w-3 h-3" />
              Bắt đầu phục vụ
            </button>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="p-2 bg-gray-50 border-t border-gray-200">
        <p className="text-[10px] text-gray-400 text-center">
          Kéo thả khách vào lịch hoặc nhấn để gán nhanh
        </p>
      </div>
    </div>
  )
}
