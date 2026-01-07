'use client'

import { FileText } from 'lucide-react'

interface CustomEventProps {
  event: any
}

export default function CustomEvent({ event }: CustomEventProps) {
  const appointment = event.resource
  const hasNotes = appointment?.notes && appointment.notes.trim().length > 0

  return (
    <div className="flex flex-col gap-0.5 w-full h-full px-1 py-0.5">
      <div className="flex items-center gap-1">
        <span className="flex-1 truncate text-xs md:text-xs font-semibold leading-tight">
          {appointment?.customerName || 'Unknown'}
        </span>
        {hasNotes && (
          <FileText className="w-3 h-3 flex-shrink-0 opacity-75" />
        )}
      </div>
      {/* Hide service name on very small screens, show on larger */}
      <div className="truncate text-[10px] md:text-[10px] opacity-90 hidden sm:block">
        {appointment?.service?.name || 'Unknown Service'}
      </div>
      {/* Hide phone on mobile, show on tablet+ */}
      {appointment?.customerPhone && (
        <div className="truncate text-[9px] md:text-[10px] opacity-75 hidden md:block">
          📞 {appointment.customerPhone}
        </div>
      )}
      {/* Mobile: Show compact info */}
      <div className="truncate text-[9px] opacity-75 sm:hidden">
        {appointment?.service?.name?.substring(0, 15) || 'Service'}
        {appointment?.service?.name && appointment.service.name.length > 15 && '...'}
      </div>
    </div>
  )
}

