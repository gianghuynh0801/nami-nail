'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSocket } from '@/lib/socket-client'
import { useSalonContext } from '@/contexts/SalonContext'
import { Maximize2, Minimize2, Bell } from 'lucide-react'
import StaffLeaderboard from '@/components/dashboard/StaffLeaderboard'
import QueueList from '@/components/dashboard/QueueList'

interface ShiftData {
  staff: Array<{
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
    currentAppointment: any
    upcomingAppointments: any[]
    stats: {
      completedToday: number
      revenue: number
      revenueYesterday: number
      revenueDiff: number
      workingMinutes: number
    }
  }>
  waitingQueue: any[] // Khách đã check-in, đang chờ
  inProgressAppointments: any[]
}

export default function ShiftManagementPage() {
  const { socket, isConnected } = useSocket()
  const { selectedSalonId, selectedSalon, loading: salonLoading } = useSalonContext()
  const [shiftData, setShiftData] = useState<ShiftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  
  // Ref to track current salonId for use in callbacks/intervals
  const currentSalonIdRef = useRef<string>('')
  
  // Keep ref in sync with context
  useEffect(() => {
    currentSalonIdRef.current = selectedSalonId || ''
  }, [selectedSalonId])

  // Define fetchShiftStatus BEFORE useEffects that use it
  // Pass salonId as parameter to avoid stale closure issues
  const fetchShiftStatus = useCallback(async (salonId: string, showLoading = false) => {
    if (!salonId) return

    // Only show loading on initial load, not on refresh
    if (showLoading) setLoading(true)
    
    try {
      const res = await fetch(`/api/shift/status?salonId=${salonId}`)
      if (res.ok) {
        const data = await res.json()
        setShiftData(data)
      }
    } catch (error) {
      console.error('Error fetching shift status:', error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSalonId) {
      // Clear old data first when salon changes
      setShiftData(null)
      // Show loading only on initial load or when salon changes
      fetchShiftStatus(selectedSalonId, true)
      if (socket) {
        socket.emit('join-salon', selectedSalonId)
      }
    }

    return () => {
      if (socket && selectedSalonId) {
        socket.emit('leave-salon', selectedSalonId)
      }
    }
  }, [selectedSalonId, socket, fetchShiftStatus])

  useEffect(() => {
    if (!socket) return

    const handleAppointmentChanged = () => {
      if (currentSalonIdRef.current) {
        fetchShiftStatus(currentSalonIdRef.current)
      }
    }

    const handlePriorityChanged = () => {
      if (currentSalonIdRef.current) {
        fetchShiftStatus(currentSalonIdRef.current)
      }
    }

    const handleAssignmentChanged = (data: any) => {
      if (currentSalonIdRef.current) {
        fetchShiftStatus(currentSalonIdRef.current)
      }
      // Show notification for new assignment
      if (data.type === 'new-appointment') {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: `Có lịch hẹn mới: ${data.customerName}`,
            type: 'info',
          },
        ])
        setTimeout(() => {
          setNotifications((prev) => prev.slice(1))
        }, 5000)
      }
    }

    socket.on('appointment-changed', handleAppointmentChanged)
    socket.on('priority-changed', handlePriorityChanged)
    socket.on('assignment-changed', handleAssignmentChanged)

    return () => {
      socket.off('appointment-changed', handleAppointmentChanged)
      socket.off('priority-changed', handlePriorityChanged)
      socket.off('assignment-changed', handleAssignmentChanged)
    }
  }, [socket, fetchShiftStatus])

  const handleStart = async (appointmentId: string) => {
    if (!selectedSalonId) return
    try {
      const res = await fetch('/api/shift/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          salonId: selectedSalonId,
        }),
      })

      if (res.ok) {
        if (socket) {
          socket.emit('appointment-updated', {
            salonId: selectedSalonId,
            appointmentId,
            type: 'started',
          })
        }
        if (selectedSalonId) fetchShiftStatus(selectedSalonId)
      }
    } catch (error) {
      console.error('Error starting appointment:', error)
    }
  }

  const handleComplete = async (appointmentId: string) => {
    if (!selectedSalonId) return
    try {
      const res = await fetch('/api/shift/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          salonId: selectedSalonId,
        }),
      })

      if (res.ok) {
        if (socket) {
          socket.emit('appointment-updated', {
            salonId: selectedSalonId,
            appointmentId,
            type: 'completed',
          })
        }
        fetchShiftStatus(selectedSalonId)
      }
    } catch (error) {
      console.error('Error completing appointment:', error)
    }
  }

  const handleAssign = async (appointmentId: string, staffId: string) => {
    if (!selectedSalonId) return
    try {
      const res = await fetch('/api/shift/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          staffId,
          salonId: selectedSalonId,
        }),
      })

      if (res.ok) {
        if (socket) {
          socket.emit('appointment-assigned', {
            salonId: selectedSalonId,
            appointmentId,
            staffId,
            type: 'assigned',
          })
        }
        fetchShiftStatus(selectedSalonId)
      }
    } catch (error) {
      console.error('Error assigning appointment:', error)
    }
  }

  const handlePriorityChange = async (staffId: string, direction: 'up' | 'down') => {
    if (!shiftData || !selectedSalonId) return

    const staff = shiftData.staff.find((s) => s.staff.id === staffId)
    if (!staff || !staff.priority) return

    const currentOrder = staff.priority.priorityOrder
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1

    // Find staff with the order we want to swap with
    const swapStaff = shiftData.staff.find(
      (s) => s.priority && s.priority.priorityOrder === newOrder
    )

    try {
      // Update both priorities
      if (swapStaff && swapStaff.priority) {
        await fetch('/api/shift/priority', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: swapStaff.staff.id,
            salonId: selectedSalonId,
            priorityOrder: currentOrder,
            sortByRevenue: swapStaff.priority.sortByRevenue,
          }),
        })
      }

      await fetch('/api/shift/priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          salonId: selectedSalonId,
          priorityOrder: newOrder,
          sortByRevenue: staff.priority.sortByRevenue,
        }),
      })

      if (socket) {
        socket.emit('priority-updated', {
          salonId: selectedSalonId,
          staffId,
        })
      }
      fetchShiftStatus(selectedSalonId)
    } catch (error) {
      console.error('Error updating priority:', error)
    }
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
    setIsFullscreen(!isFullscreen)
  }

  // Auto-refresh data periodically
  useEffect(() => {
    if (!selectedSalonId) return

    const interval = setInterval(() => {
      // Use ref to get current salonId to avoid stale closure
      if (currentSalonIdRef.current) {
        fetchShiftStatus(currentSalonIdRef.current) // No loading spinner for auto-refresh
      }
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [selectedSalonId, fetchShiftStatus])

  // Show loading while salon context is loading
  if (salonLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  // Show message if no salon selected
  if (!selectedSalonId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Vui lòng chọn chi nhánh từ menu trên cùng.</p>
        </div>
      </div>
    )
  }

  // Only show full-screen loading on initial load (when no data yet)
  if (loading && !shiftData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${isFullscreen ? 'p-3' : 'p-4'}`}>
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Chia ca Realtime</h1>
          {selectedSalon && (
            <span className="px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg">
              {selectedSalon.name}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              title={isConnected ? 'Đã kết nối' : 'Mất kết nối'}
            />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Đã kết nối' : 'Đang kết nối...'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title={isFullscreen ? 'Thoát fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              <span className="text-sm">{notif.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Content - Leaderboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Staff Leaderboard - Table Style */}
        <div className="lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900">Bảng xếp hạng nhân viên</h2>
              <span className="text-xs text-gray-500">
                {shiftData?.staff.length || 0} người
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Rảnh</span>
              <span className="w-2 h-2 rounded-full bg-yellow-500 ml-1.5"></span>
              <span>Có lịch</span>
              <span className="w-2 h-2 rounded-full bg-blue-500 ml-1.5"></span>
              <span>Đang làm</span>
            </div>
          </div>
          <StaffLeaderboard
            staffList={shiftData?.staff || []}
            salonId={selectedSalonId}
            onStart={handleStart}
            onComplete={handleComplete}
            onPriorityChange={handlePriorityChange}
          />
        </div>

        {/* Queue Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <QueueList
            waitingQueue={shiftData?.waitingQueue || []}
            onStart={handleStart}
          />
          
          {/* Summary Stats - Compact */}
          <div className="bg-white rounded-lg shadow p-3">
            <h3 className="font-semibold text-sm text-gray-900 mb-2">Tổng quan</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-xs text-gray-600">Đang làm:</span>
                <span className="text-xs font-semibold text-blue-600">
                  {shiftData?.inProgressAppointments.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-600">Đang chờ:</span>
                <span className="text-xs font-semibold text-yellow-600">
                  {shiftData?.waitingQueue.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-600">Nhân viên rảnh:</span>
                <span className="text-xs font-semibold text-green-600">
                  {shiftData?.staff.filter((s) => !s.currentAppointment && s.upcomingAppointments.length === 0).length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

