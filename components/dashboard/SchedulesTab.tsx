'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import useSWR from 'swr'

const scheduleSchema = z.object({
  staffId: z.string().min(1, 'Please select a staff member'),
  dayOfWeek: z.number().min(0).max(6, 'Invalid day of week'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time (HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time (HH:mm)'),
  breakStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid break start time').optional().nullable(),
  breakEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid break end time').optional().nullable(),
  date: z.string().optional().nullable(),
}).refine((data) => {
  // Validate endTime > startTime
  const [startHour, startMin] = data.startTime.split(':').map(Number)
  const [endHour, endMin] = data.endTime.split(':').map(Number)
  const start = startHour * 60 + startMin
  const end = endHour * 60 + endMin
  return end > start
}, {
  message: 'End time must be greater than start time',
  path: ['endTime'],
}).refine((data) => {
  // Validate break time if provided
  if (data.breakStart && data.breakEnd) {
    const [breakStartHour, breakStartMin] = data.breakStart.split(':').map(Number)
    const [breakEndHour, breakEndMin] = data.breakEnd.split(':').map(Number)
    const [startHour, startMin] = data.startTime.split(':').map(Number)
    const [endHour, endMin] = data.endTime.split(':').map(Number)
    
    const breakStart = breakStartHour * 60 + breakStartMin
    const breakEnd = breakEndHour * 60 + breakEndMin
    const start = startHour * 60 + startMin
    const end = endHour * 60 + endMin
    
    return breakEnd > breakStart && breakStart >= start && breakEnd <= end
  }
  return true
}, {
  message: 'Break time must be within working hours',
  path: ['breakEnd'],
})

type ScheduleFormData = z.infer<typeof scheduleSchema>

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SchedulesTab({ salonId, staff, onUpdate }: { salonId: string; staff: any[]; onUpdate: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data, mutate } = useSWR(`/api/schedules?salonId=${salonId}`, fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds for realtime updates
  })

  const schedules = data?.schedules || []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
  })

  const onSubmit = async (data: ScheduleFormData) => {
    setLoading(true)
    setError('')

    try {
      const url = editingId
        ? `/api/schedules/${editingId}`
        : '/api/schedules'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'An error occurred')
      }

      reset()
      setEditingId(null)
      mutate() // Refresh SWR data
      onUpdate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (schedule: any) => {
    setEditingId(schedule.id)
    reset({
      staffId: schedule.staffId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      breakStart: schedule.breakStart || '',
      breakEnd: schedule.breakEnd || '',
      date: schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work schedule?')) return

    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        mutate()
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting schedule:', error)
    }
  }

  // Group schedules by staff
  const schedulesByStaff = staff.map((staffMember) => ({
    staff: staffMember,
    schedules: schedules.filter((s: any) => s.staffId === staffMember.id),
  }))

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-pastel-yellow p-4 rounded-lg space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff Member *
            </label>
            <select
              {...register('staffId')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.staffId && (
              <p className="text-red-500 text-sm mt-1">{errors.staffId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day of Week *
            </label>
            <select
              {...register('dayOfWeek', { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              {dayNames.map((day, index) => (
                <option key={index} value={index}>
                  {day}
                </option>
              ))}
            </select>
            {errors.dayOfWeek && (
              <p className="text-red-500 text-sm mt-1">{errors.dayOfWeek.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time * (HH:mm)
            </label>
            <input
              type="time"
              {...register('startTime')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            {errors.startTime && (
              <p className="text-red-500 text-sm mt-1">{errors.startTime.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time * (HH:mm)
            </label>
            <input
              type="time"
              {...register('endTime')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            {errors.endTime && (
              <p className="text-red-500 text-sm mt-1">{errors.endTime.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Break Start (HH:mm) - Optional
            </label>
            <input
              type="time"
              {...register('breakStart')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            {errors.breakStart && (
              <p className="text-red-500 text-sm mt-1">{errors.breakStart.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Break End (HH:mm) - Optional
            </label>
            <input
              type="time"
              {...register('breakEnd')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            {errors.breakEnd && (
              <p className="text-red-500 text-sm mt-1">{errors.breakEnd.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Date (if only applies to 1 day) - Optional
            </label>
            <input
              type="date"
              {...register('date')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Để trống nếu là ca hàng tuần
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50"
        >
          {editingId ? 'Update' : 'Add Work Schedule'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null)
              reset()
            }}
            className="ml-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        )}
      </form>

      <div className="space-y-6">
        {schedulesByStaff.map(({ staff: staffMember, schedules: staffSchedules }) => (
          <div key={staffMember.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-primary-400 mb-3">{staffMember.name}</h3>
            {staffSchedules.length === 0 ? (
              <p className="text-gray-500 text-sm">No work schedules</p>
            ) : (
              <div className="space-y-2">
                {staffSchedules.map((schedule: any) => (
                  <div
                    key={schedule.id}
                    className="flex justify-between items-center p-3 bg-pastel-pink-light rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {dayNames[schedule.dayOfWeek]}
                        {schedule.date && ` (${new Date(schedule.date).toLocaleDateString()})`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {schedule.startTime} - {schedule.endTime}
                        {schedule.breakStart && schedule.breakEnd && (
                          <span className="ml-2 text-gray-500">
                            (Break: {schedule.breakStart} - {schedule.breakEnd})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(schedule)}
                        className="px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

