'use client'

import { format } from 'date-fns'
import { enUS, vi } from 'date-fns/locale'
import { useLocale } from 'next-intl'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Calendar, List, Plus } from 'lucide-react'

interface CalendarHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onPrevDay: () => void
  onNextDay: () => void
  onToday: () => void
  showWaitingList: boolean
  onToggleWaitingList: () => void
  waitingCount: number
  onAddAppointment?: () => void
}

export default function CalendarHeader({
  selectedDate,
  onDateChange,
  onPrevDay,
  onNextDay,
  onToday,
  showWaitingList,
  onToggleWaitingList,
  waitingCount,
  onAddAppointment,
}: CalendarHeaderProps) {
  const locale = useLocale()
  const t = useTranslations('Calendar')
  const dateFnsLocale = locale === 'vi' ? vi : enUS
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  const formattedDate = format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: dateFnsLocale })
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  const statusLegend = [
    { status: 'PENDING', label: t('statusPending'), color: 'bg-yellow-400' },
    { status: 'CONFIRMED', label: t('statusConfirmed'), color: 'bg-blue-400' },
    { status: 'CHECKED_IN', label: t('statusCheckedIn'), color: 'bg-teal-400' },
    { status: 'IN_PROGRESS', label: t('statusInProgress'), color: 'bg-purple-400' },
    { status: 'COMPLETED', label: t('statusCompleted'), color: 'bg-gray-400' },
  ]

  return (
    <div className="bg-white border-b border-beige-dark">
      <div className="px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left: Date navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date display */}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                {capitalizedDate}
              </h2>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1">
            <button
              onClick={onPrevDay}
              className="p-2 hover:bg-beige-light rounded-lg transition-colors"
              title={t('prevDay')}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>



            <button
              onClick={onNextDay}
              className="p-2 hover:bg-beige-light rounded-lg transition-colors"
              title={t('nextDay')}
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            </div>

            {/* Date picker input */}
            <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              if (e.target.value) {
                onDateChange(new Date(e.target.value))
              }
            }}
            className="px-3 py-1.5 border border-beige-dark rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white"
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Add appointment button */}
            {onAddAppointment && (
              <button
                onClick={onAddAppointment}
                className="flex items-center gap-2 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t('addAppointment')}</span>
              </button>
            )}

            {/* Toggle waiting list (desktop) */}
            <button
            onClick={onToggleWaitingList}
            className={`
              hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium
              ${showWaitingList 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-beige-light text-gray-700 hover:bg-beige'}
            `}
          >
              <List className="w-4 h-4" />
              <span>{t('waitingList')}</span>
              {waitingCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                  {waitingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="px-4 py-2 border-t border-beige-dark bg-gray-50">
        <div className="flex items-center gap-4 flex-wrap">
          {statusLegend.map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${item.color}`}></div>
              <span className="text-xs text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
