'use client'

import type { CalendarStaff } from './types'

interface StaffColumnHeaderProps {
  staff: CalendarStaff
  isActive?: boolean
  onClick?: () => void
}

export default function StaffColumnHeader({
  staff,
  isActive = false,
  onClick,
}: StaffColumnHeaderProps) {
  const appointmentCount = staff.appointments.length
  const inProgressCount = staff.appointments.filter(a => a.status === 'IN_PROGRESS').length

  return (
    <div
      className={`
        p-3 text-center cursor-pointer transition-colors
        ${isActive ? 'bg-primary-100' : 'hover:bg-beige-light'}
      `}
      onClick={onClick}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center text-white font-semibold text-sm shadow-sm"
        style={{ backgroundColor: staff.avatarColor }}
      >
        {staff.name.charAt(0).toUpperCase()}
      </div>
      
      {/* Name */}
      <p className="text-sm font-medium text-gray-900 truncate">
        {staff.name}
      </p>
      
      {/* Working hours */}
      {staff.workingHours && (
        <p className="text-xs text-gray-500">
          {staff.workingHours.start} - {staff.workingHours.end}
        </p>
      )}

      {/* Appointment status or stats badges */}
      {appointmentCount === 0 ? (
        <p className="text-xs text-gray-500 mt-1">
          Chưa có lịch
        </p>
      ) : (
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary-100 text-primary-700">
            {appointmentCount} lịch
          </span>
          {inProgressCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-700">
              Đang làm
            </span>
          )}
        </div>
      )}
    </div>
  )
}
