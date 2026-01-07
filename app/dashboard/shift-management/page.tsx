'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '@/lib/socket-client'
import { Maximize2, Minimize2, Bell, Settings } from 'lucide-react'
import StaffCard from '@/components/dashboard/StaffCard'
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
      workingMinutes: number
    }
  }>
  pendingAppointments: any[]
  inProgressAppointments: any[]
}

export default function ShiftManagementPage() {
  const { socket, isConnected } = useSocket()
  const [shiftData, setShiftData] = useState<ShiftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSalonId, setSelectedSalonId] = useState<string>('')
  const [salons, setSalons] = useState<any[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    fetchSalons()
  }, [])

  useEffect(() => {
    if (selectedSalonId) {
      fetchShiftStatus()
      if (socket) {
        socket.emit('join-salon', selectedSalonId)
      }
    }

    return () => {
      if (socket && selectedSalonId) {
        socket.emit('leave-salon', selectedSalonId)
      }
    }
  }, [selectedSalonId, socket])

  useEffect(() => {
    if (!socket) return

    socket.on('appointment-changed', (data) => {
      fetchShiftStatus()
    })

    socket.on('priority-changed', (data) => {
      fetchShiftStatus()
    })

    socket.on('assignment-changed', (data) => {
      fetchShiftStatus()
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
    })

    return () => {
      socket.off('appointment-changed')
      socket.off('priority-changed')
      socket.off('assignment-changed')
    }
  }, [socket])

  const fetchSalons = async () => {
    try {
      const res = await fetch('/api/salon')
      if (res.ok) {
        const data = await res.json()
        setSalons(data.salons || [])
        if (data.salons && data.salons.length > 0) {
          setSelectedSalonId(data.salons[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching salons:', error)
    }
  }

  const fetchShiftStatus = async () => {
    if (!selectedSalonId) return

    setLoading(true)
    try {
      const res = await fetch(`/api/shift/status?salonId=${selectedSalonId}`)
      if (res.ok) {
        const data = await res.json()
        setShiftData(data)
      }
    } catch (error) {
      console.error('Error fetching shift status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async (appointmentId: string) => {
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
        fetchShiftStatus()
      }
    } catch (error) {
      console.error('Error starting appointment:', error)
    }
  }

  const handleComplete = async (appointmentId: string) => {
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
        fetchShiftStatus()
      }
    } catch (error) {
      console.error('Error completing appointment:', error)
    }
  }

  const handleAssign = async (appointmentId: string, staffId: string) => {
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
        fetchShiftStatus()
      }
    } catch (error) {
      console.error('Error assigning appointment:', error)
    }
  }

  const handlePriorityChange = async (staffId: string, direction: 'up' | 'down') => {
    if (!shiftData) return

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
      fetchShiftStatus()
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
      fetchShiftStatus()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [selectedSalonId])

  if (loading) {
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
    <div className={`space-y-4 ${isFullscreen ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Chia ca Realtime</h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              title={isConnected ? 'Đã kết nối' : 'Mất kết nối'}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Đã kết nối' : 'Đang kết nối...'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedSalonId}
            onChange={(e) => setSelectedSalonId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          >
            {salons.map((salon) => (
              <option key={salon.id} value={salon.id}>
                {salon.name}
              </option>
            ))}
          </select>
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title={isFullscreen ? 'Thoát fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
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

      {/* Main Content - Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Staff Cards - Kanban Style */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Nhân viên</h2>
              <p className="text-sm text-gray-500">
                {shiftData?.staff.length || 0} nhân viên đang làm việc
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Rảnh</span>
              <span className="w-3 h-3 rounded-full bg-yellow-500 ml-2"></span>
              <span>Có lịch</span>
              <span className="w-3 h-3 rounded-full bg-blue-500 ml-2"></span>
              <span>Đang làm</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftData?.staff.map((s) => (
              <StaffCard
                key={s.staff.id}
                staff={s}
                salonId={selectedSalonId}
                onStart={handleStart}
                onComplete={handleComplete}
                onPriorityChange={handlePriorityChange}
              />
            ))}
          </div>
        </div>

        {/* Queue Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <QueueList
            appointments={shiftData?.pendingAppointments || []}
            staff={shiftData?.staff.map((s) => s.staff) || []}
            onAssign={handleAssign}
          />
          
          {/* Summary Stats */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Tổng quan</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Đang làm:</span>
                <span className="text-sm font-semibold text-blue-600">
                  {shiftData?.inProgressAppointments.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Chờ gán:</span>
                <span className="text-sm font-semibold text-yellow-600">
                  {shiftData?.pendingAppointments.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Nhân viên rảnh:</span>
                <span className="text-sm font-semibold text-green-600">
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

