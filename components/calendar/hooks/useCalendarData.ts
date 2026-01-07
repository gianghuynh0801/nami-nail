'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { useSocket } from '@/lib/socket-client'
import type { CalendarStaff, WaitingAppointment } from '../types'
import { STAFF_COLORS } from '../constants'

export function useCalendarData(salonId: string, date: Date) {
  const [staff, setStaff] = useState<CalendarStaff[]>([])
  const [waitingList, setWaitingList] = useState<WaitingAppointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { socket } = useSocket()

  const fetchData = useCallback(async () => {
    if (!salonId) return

    setIsLoading(true)
    setError(null)
    
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const res = await fetch(`/api/calendar/day?salonId=${salonId}&date=${dateStr}`)
      
      if (res.ok) {
        const data = await res.json()
        
        // Add colors to staff
        const staffWithColors = (data.staff || []).map((s: CalendarStaff, index: number) => ({
          ...s,
          avatarColor: s.avatarColor || STAFF_COLORS[index % STAFF_COLORS.length],
        }))
        
        setStaff(staffWithColors)
        setWaitingList(data.waitingList || [])
      } else {
        const errorData = await res.json()
        setError(errorData.error || 'Failed to fetch calendar data')
      }
    } catch (err) {
      console.error('Error fetching calendar data:', err)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [salonId, date])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Socket.io realtime updates
  useEffect(() => {
    if (!socket || !salonId) return

    socket.emit('join-salon', salonId)

    const handleUpdate = () => {
      fetchData()
    }

    socket.on('appointment-changed', handleUpdate)
    socket.on('appointment-moved', handleUpdate)
    socket.on('priority-changed', handleUpdate)

    return () => {
      socket.emit('leave-salon', salonId)
      socket.off('appointment-changed', handleUpdate)
      socket.off('appointment-moved', handleUpdate)
      socket.off('priority-changed', handleUpdate)
    }
  }, [socket, salonId, fetchData])

  const moveAppointment = useCallback(async (
    appointmentId: string,
    newStaffId: string,
    newStartTime: string
  ) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const res = await fetch('/api/calendar/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          newStaffId,
          newStartTime: `${dateStr}T${newStartTime}:00`,
          salonId,
        }),
      })

      if (res.ok) {
        // Emit socket event
        socket?.emit('appointment-moved', { salonId, appointmentId })
        await fetchData()
        return true
      } else {
        const errorData = await res.json()
        console.error('Error moving appointment:', errorData.error)
        return false
      }
    } catch (err) {
      console.error('Error moving appointment:', err)
      return false
    }
  }, [salonId, date, socket, fetchData])

  const assignFromWaitingList = useCallback(async (
    appointmentId: string,
    staffId: string,
    startTime: string
  ) => {
    return moveAppointment(appointmentId, staffId, startTime)
  }, [moveAppointment])

  return {
    staff,
    waitingList,
    isLoading,
    error,
    refetch: fetchData,
    moveAppointment,
    assignFromWaitingList,
  }
}
