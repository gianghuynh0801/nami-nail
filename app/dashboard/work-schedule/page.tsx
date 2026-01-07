'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Clock, Plus, Edit, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale/vi'

interface StaffSchedule {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  breakStart?: string
  breakEnd?: string
  date?: string
  staff: {
    id: string
    name: string
    salon: {
      id: string
      name: string
    }
  }
}

const DAYS = [
  { value: 0, label: 'Chủ nhật' },
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
]

const scheduleSchema = z.object({
  staffId: z.string().min(1, 'Vui lòng chọn nhân viên'),
  selectedDays: z.array(z.number()).min(1, 'Vui lòng chọn ít nhất một ngày'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Giờ bắt đầu không hợp lệ (HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Giờ kết thúc không hợp lệ (HH:mm)'),
  breakStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Giờ nghỉ bắt đầu không hợp lệ').optional().nullable(),
  breakEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Giờ nghỉ kết thúc không hợp lệ').optional().nullable(),
  date: z.string().optional().nullable(),
}).refine((data) => {
  const [startHour, startMin] = data.startTime.split(':').map(Number)
  const [endHour, endMin] = data.endTime.split(':').map(Number)
  const start = startHour * 60 + startMin
  const end = endHour * 60 + endMin
  return end > start
}, {
  message: 'Giờ kết thúc phải lớn hơn giờ bắt đầu',
  path: ['endTime'],
}).refine((data) => {
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
  message: 'Giờ nghỉ phải nằm trong giờ làm việc',
  path: ['breakEnd'],
})

type ScheduleFormData = z.infer<typeof scheduleSchema>

export default function WorkSchedulePage() {
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSalonId, setSelectedSalonId] = useState<string>('')
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [salons, setSalons] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<StaffSchedule | null>(null)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      selectedDays: [],
    },
  })

  useEffect(() => {
    fetchSalons()
  }, [])

  useEffect(() => {
    if (selectedSalonId) {
      fetchStaff()
      fetchSchedules()
    }
  }, [selectedSalonId, selectedStaffId])

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

  const fetchStaff = async () => {
    if (!selectedSalonId) return
    try {
      const res = await fetch(`/api/salon/${selectedSalonId}/staff`)
      if (res.ok) {
        const data = await res.json()
        setStaff(data.staff || [])
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedSalonId) params.append('salonId', selectedSalonId)
      if (selectedStaffId) params.append('staffId', selectedStaffId)

      const res = await fetch(`/api/schedules?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDayLabel = (dayOfWeek: number) => {
    return DAYS.find(d => d.value === dayOfWeek)?.label || ''
  }

  const groupSchedulesByStaff = () => {
    const grouped: { [key: string]: StaffSchedule[] } = {}
    schedules.forEach(schedule => {
      const staffId = schedule.staff.id
      if (!grouped[staffId]) {
        grouped[staffId] = []
      }
      grouped[staffId].push(schedule)
    })
    return grouped
  }

  const groupedSchedules = groupSchedulesByStaff()

  const handleOpenModal = () => {
    setEditingSchedule(null)
    setSelectedDays([])
    reset({
      staffId: selectedStaffId || '',
      selectedDays: [],
      startTime: '09:00',
      endTime: '18:00',
      breakStart: '',
      breakEnd: '',
      date: '',
    })
    setFormError('')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingSchedule(null)
    reset()
    setFormError('')
  }

  const handleEdit = (schedule: StaffSchedule) => {
    setEditingSchedule(schedule)
    setSelectedDays([schedule.dayOfWeek])
    reset({
      staffId: schedule.staff.id,
      selectedDays: [schedule.dayOfWeek],
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      breakStart: schedule.breakStart || '',
      breakEnd: schedule.breakEnd || '',
      date: schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '',
    })
    setFormError('')
    setShowModal(true)
  }

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch làm việc này?')) return

    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchSchedules()
      } else {
        alert('Có lỗi xảy ra khi xóa lịch làm việc')
      }
    } catch (error) {
      console.error('Error deleting schedule:', error)
      alert('Có lỗi xảy ra khi xóa lịch làm việc')
    }
  }

  const handleSelectPreset = (preset: 'all' | 'weekdays' | 'weekend') => {
    let days: number[] = []
    if (preset === 'all') {
      days = [0, 1, 2, 3, 4, 5, 6]
    } else if (preset === 'weekdays') {
      days = [1, 2, 3, 4, 5]
    } else if (preset === 'weekend') {
      days = [0, 6]
    }
    setSelectedDays(days)
    setValue('selectedDays', days)
  }

  const handleToggleDay = (dayValue: number) => {
    const newDays = selectedDays.includes(dayValue)
      ? selectedDays.filter(d => d !== dayValue)
      : [...selectedDays, dayValue]
    setSelectedDays(newDays)
    setValue('selectedDays', newDays)
  }

  const onSubmit = async (data: ScheduleFormData) => {
    setFormLoading(true)
    setFormError('')

    try {
      // Nếu đang edit, chỉ update 1 schedule
      if (editingSchedule) {
        const url = `/api/schedules/${editingSchedule.id}`
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: data.staffId,
            dayOfWeek: data.selectedDays[0],
            startTime: data.startTime,
            endTime: data.endTime,
            breakStart: data.breakStart,
            breakEnd: data.breakEnd,
            date: data.date,
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Có lỗi xảy ra')
        }
      } else {
        // Nếu tạo mới, tạo nhiều schedules cho các ngày đã chọn
        const promises = data.selectedDays.map(dayOfWeek =>
          fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              staffId: data.staffId,
              dayOfWeek,
              startTime: data.startTime,
              endTime: data.endTime,
              breakStart: data.breakStart,
              breakEnd: data.breakEnd,
              date: data.date,
            }),
          })
        )

        const results = await Promise.allSettled(promises)
        const errors = results
          .map((result, index) => {
            if (result.status === 'rejected') {
              return `Ngày ${DAYS.find(d => d.value === data.selectedDays[index])?.label}: ${result.reason}`
            }
            if (!result.value.ok) {
              return `Ngày ${DAYS.find(d => d.value === data.selectedDays[index])?.label}: Lỗi tạo lịch`
            }
            return null
          })
          .filter(Boolean)

        if (errors.length > 0) {
          throw new Error(errors.join('\n'))
        }
      }

      handleCloseModal()
      fetchSchedules()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Lịch làm việc</h1>
        <button 
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm lịch làm việc
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
        <select
          value={selectedSalonId}
          onChange={(e) => {
            setSelectedSalonId(e.target.value)
            setSelectedStaffId('')
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
        >
          <option value="">Tất cả chi nhánh</option>
          {salons.map((salon) => (
            <option key={salon.id} value={salon.id}>
              {salon.name}
            </option>
          ))}
        </select>
        <select
          value={selectedStaffId}
          onChange={(e) => setSelectedStaffId(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
        >
          <option value="">Tất cả nhân viên</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Schedules */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Chưa có lịch làm việc nào</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSchedules).map(([staffId, staffSchedules]) => {
            const firstSchedule = staffSchedules[0]
            return (
              <div key={staffId} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">{firstSchedule.staff?.name || 'Không có tên'}</h3>
                  <p className="text-sm text-gray-500">{firstSchedule.staff?.salon?.name || 'Chưa có salon'}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giờ làm việc</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giờ nghỉ</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày đặc biệt</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {staffSchedules
                        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                        .map((schedule) => (
                          <tr key={schedule.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">
                                  {schedule.date 
                                    ? format(new Date(schedule.date), 'dd/MM/yyyy', { locale: vi })
                                    : getDayLabel(schedule.dayOfWeek)
                                  }
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 text-sm text-gray-900">
                                <Clock className="w-4 h-4 text-gray-400" />
                                {schedule.startTime} - {schedule.endTime}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {schedule.breakStart && schedule.breakEnd ? (
                                <span className="text-sm text-gray-500">
                                  {schedule.breakStart} - {schedule.breakEnd}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">Không có</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {schedule.date ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Có
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Hàng tuần
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleEdit(schedule)}
                                  className="p-2 text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
                                  title="Sửa"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(schedule.id)}
                                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingSchedule ? 'Sửa lịch làm việc' : 'Thêm lịch làm việc'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhân viên *
                  </label>
                  <select
                    {...register('staffId')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="">Chọn nhân viên</option>
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn ngày trong tuần *
                  </label>
                  
                  {/* Preset buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('all')}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Cả tuần
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('weekdays')}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Thứ 2 - 6
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('weekend')}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Thứ 7 - CN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDays([])
                        setValue('selectedDays', [])
                      }}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>

                  {/* Day checkboxes */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {DAYS.map((day) => (
                      <label
                        key={day.value}
                        className={`
                          flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${selectedDays.includes(day.value)
                            ? 'border-primary-400 bg-primary-50 text-primary-700'
                            : 'border-gray-300 hover:border-gray-400 bg-white'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDays.includes(day.value)}
                          onChange={() => handleToggleDay(day.value)}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium text-center">{day.label}</span>
                      </label>
                    ))}
                  </div>
                  
                  <input
                    type="hidden"
                    {...register('selectedDays')}
                  />
                  {errors.selectedDays && (
                    <p className="text-red-500 text-sm mt-1">{errors.selectedDays.message}</p>
                  )}
                  {selectedDays.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Đã chọn {selectedDays.length} ngày: {selectedDays.map(d => DAYS.find(day => day.value === d)?.label).join(', ')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giờ bắt đầu * (HH:mm)
                  </label>
                  <input
                    type="time"
                    {...register('startTime')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                  {errors.startTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.startTime.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giờ kết thúc * (HH:mm)
                  </label>
                  <input
                    type="time"
                    {...register('endTime')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                  {errors.endTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.endTime.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giờ nghỉ bắt đầu (HH:mm) - Tùy chọn
                  </label>
                  <input
                    type="time"
                    {...register('breakStart')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                  {errors.breakStart && (
                    <p className="text-red-500 text-sm mt-1">{errors.breakStart.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giờ nghỉ kết thúc (HH:mm) - Tùy chọn
                  </label>
                  <input
                    type="time"
                    {...register('breakEnd')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                  {errors.breakEnd && (
                    <p className="text-red-500 text-sm mt-1">{errors.breakEnd.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày đặc biệt (chỉ áp dụng cho 1 ngày) - Tùy chọn
                  </label>
                  <input
                    type="date"
                    {...register('date')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Để trống nếu là lịch hàng tuần
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-6 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50 transition-colors"
                >
                  {formLoading ? 'Đang lưu...' : editingSchedule ? 'Cập nhật' : `Thêm lịch (${selectedDays.length} ngày)`}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

