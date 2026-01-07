'use client'

import { useSession, signOut } from 'next-auth/react'
import { Bell, User, LogOut, Menu, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { BookingWizardModal } from '@/components/booking-wizard'

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { data: session } = useSession()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [showBookingWizard, setShowBookingWizard] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const time = currentTime ? format(currentTime, 'HH:mm') : '--:--'
  const date = currentTime ? format(currentTime, 'MMM dd, yyyy') : '-- --, ----'

  return (
    <>
      <div className="h-16 bg-white border-b border-beige-dark/30 fixed top-0 left-0 lg:left-64 right-0 z-40 flex items-center justify-between px-4 lg:px-6">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>

        {/* Title */}
        <div className="text-base lg:text-lg font-playfair font-semibold text-primary-600 flex-1 lg:flex-initial">
          <span className="hidden sm:inline">NAMI Nail Management</span>
          <span className="sm:hidden">NAMI</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Add Appointment Button */}
          <button
            onClick={() => setShowBookingWizard(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Đặt lịch</span>
          </button>

          {/* Time - hidden on small mobile */}
          <div 
            className="hidden md:block text-gray-700 font-medium text-sm"
            suppressHydrationWarning
          >
            {time}
          </div>
          
          {/* Date - hidden on mobile */}
          <div 
            className="hidden lg:block text-gray-500 text-sm"
            suppressHydrationWarning
          >
            {date}
          </div>
          
          {/* Bell Icon */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
          </button>
          
          {/* User */}
          <div className="flex items-center gap-2 lg:gap-3">
            <span className="hidden md:block text-gray-700 font-medium text-sm">{session?.user?.name || 'User'}</span>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center">
              <User className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="p-2 hover:bg-beige-light rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4 lg:w-5 lg:h-5 text-primary-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Booking Wizard Modal */}
      <BookingWizardModal
        isOpen={showBookingWizard}
        onClose={() => setShowBookingWizard(false)}
        onSuccess={(appointmentId) => {
          console.log('Booking created from TopBar:', appointmentId)
        }}
      />
    </>
  )
}

