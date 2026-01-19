'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar as CalendarIcon, Clock, Plus, Edit, Trash2, X, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, parseISO, getDay } from 'date-fns'
import { vi } from 'date-fns/locale/vi'

// --- Types ---

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

interface SalonWorkingHours {
  dayOfWeek: number
  startTime: string
  endTime: string
  isOpen: boolean
}

interface Staff {
  id: string
  name: string
}

const DAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' },
]

// --- Schema ---

const scheduleSchema = z.object({
  staffId: z.string().min(1, 'Vui lòng chọn nhân viên'),
  selectedDays: z.array(z.number()).min(1, 'Vui lòng chọn ít nhất một ngày'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Giờ bắt đầu không hợp lệ (HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Giờ kết thúc không hợp lệ (HH:mm)'),
  breakStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Giờ nghỉ bắt đầu không hợp lệ').optional().nullable().or(z.literal('')),
  breakEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Giờ nghỉ kết thúc không hợp lệ').optional().nullable().or(z.literal('')),
  date: z.string().optional().nullable(),
  isAllDay: z.boolean().optional(),
  hasBreak: z.boolean().optional(),
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
  if (data.hasBreak && data.breakStart && data.breakEnd) {
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

// --- Main Component ---

export default function WorkSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [workingHours, setWorkingHours] = useState<SalonWorkingHours[]>([])
  const [salons, setSalons] = useState<any[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  
  const [selectedSalonId, setSelectedSalonId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<StaffSchedule | null>(null)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  // For selecting days in modal
  const [selectedDaysInModal, setSelectedDaysInModal] = useState<number[]>([])

  // Salon Hours Modal State
  const [editingSalonHours, setEditingSalonHours] = useState(false)
  const [tempWorkingHours, setTempWorkingHours] = useState<SalonWorkingHours[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { selectedDays: [] },
  })

  // --- Calculations ---

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

  // --- Effects ---

  useEffect(() => {
    fetchSalons()
  }, [])

  useEffect(() => {
    if (selectedSalonId) {
      fetchData()
    }
  }, [selectedSalonId, currentDate]) // Refetch if date changes (though schedules currently fetch all, optimized fetching by date range is better later)

  // --- Data Fetching ---

  const fetchSalons = async () => {
    try {
      const res = await fetch('/api/salon')
      if (res.ok) {
        const data = await res.json()
        const salonsList = data.salons || []
        setSalons(salonsList)
        if (salonsList.length > 0 && !selectedSalonId) {
          setSelectedSalonId(salonsList[0].id)
        }
      }
    } catch (error) {
       console.error(error)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
         fetchStaff(),
         fetchWorkingHours(),
         fetchSchedules()
      ])
    } catch (e) {
       console.error(e)
    } finally {
       setLoading(false)
    }
  }

  const fetchStaff = async () => {
    if (!selectedSalonId) return
    const res = await fetch(`/api/salon/${selectedSalonId}/staff`)
    if (res.ok) {
       const data = await res.json()
       setStaff(data.staff || [])
    }
  }

  const fetchWorkingHours = async () => {
     if (!selectedSalonId) return
     const res = await fetch(`/api/salon/${selectedSalonId}/working-hours`)
     if (res.ok) {
        const data = await res.json()
        setWorkingHours(data.workingHours || [])
     }
  }

  const fetchSchedules = async () => {
    if (!selectedSalonId) return
    const params = new URLSearchParams()
    params.append('salonId', selectedSalonId)
    // Optional: Filter by date range to optimize
    const res = await fetch(`/api/schedules?${params.toString()}`)
    if (res.ok) {
       const data = await res.json()
       setSchedules(data.schedules || [])
    }
  }

  // --- Handlers ---

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
  const handleToday = () => setCurrentDate(new Date())
  const handleCellClick = (staffId: string, day: Date, currentSchedule?: StaffSchedule) => {
     if (currentSchedule) {
        // Edit existing
        setEditingSchedule(currentSchedule)
        setSelectedDaysInModal([currentSchedule.dayOfWeek])
        reset({
           staffId: staffId,
           selectedDays: [currentSchedule.dayOfWeek],
           startTime: currentSchedule.startTime,
           endTime: currentSchedule.endTime,
           breakStart: currentSchedule.breakStart || '',
           breakEnd: currentSchedule.breakEnd || '',
           date: currentSchedule.date ? new Date(currentSchedule.date).toISOString().split('T')[0] : '',
           isAllDay: currentSchedule.startTime === '00:00' && currentSchedule.endTime === '23:59',
           hasBreak: !!(currentSchedule.breakStart && currentSchedule.breakEnd),
        })
     } else {
        // Create new for this day
        setEditingSchedule(null)
        const dayOfWeek = getDay(day)
        setSelectedDaysInModal([dayOfWeek])
        reset({
           staffId: staffId,
           selectedDays: [dayOfWeek],
           startTime: '00:00',
           endTime: '23:59',
           breakStart: '',
           breakEnd: '',
           date: format(day, 'yyyy-MM-dd'),
           isAllDay: true, // Default to all day
           hasBreak: false,
        })
     }
     setShowModal(true)
  }

  const onSubmit = async (data: ScheduleFormData) => {
    setFormLoading(true)
    setFormError('')
    
    // Sanitize data
    const submissionData = { ...data }
    
    // If not using break, clear break times
    if (!submissionData.hasBreak) {
       submissionData.breakStart = null
       submissionData.breakEnd = null
    }
    
    // Remove helper fields
    delete (submissionData as any).isAllDay
    delete (submissionData as any).hasBreak

    try {
       if (editingSchedule) {
          // Update
          const res = await fetch(`/api/schedules/${editingSchedule.id}`, {
             method: 'PUT',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ ...submissionData, dayOfWeek: data.selectedDays[0] })
          })
          if (!res.ok) throw new Error('Failed to update')
       } else {
          // Create
          const promises = data.selectedDays.map(dayOfWeek => 
             fetch('/api/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...submissionData, dayOfWeek })
             })
          )
          await Promise.all(promises)
       }
       setShowModal(false)
       fetchSchedules()
    } catch (e: any) {
       setFormError(e.message || 'Error occurred')
    } finally {
       setFormLoading(false)
    }
  }
  
  const handleDelete = async () => {
     if (!editingSchedule) return
     if (!confirm('Bạn có chắc chắn muốn xóa?')) return
     try {
        await fetch(`/api/schedules/${editingSchedule.id}`, { method: 'DELETE' })
        setShowModal(false)
        fetchSchedules()
     } catch (e) {
        alert('Lỗi khi xóa')
     }
  }

  const handleUpdateTempSalonHours = (dayValue: number, updates: Partial<SalonWorkingHours>) => {
     setTempWorkingHours(prev => {
        return prev.map(p => p.dayOfWeek === dayValue ? { ...p, ...updates } : p)
     })
  }

  const saveSalonHours = async () => {
     if (!selectedSalonId) return
     setFormLoading(true)
     try {
        const promises = tempWorkingHours.map(wh => 
           fetch(`/api/salon/${selectedSalonId}/working-hours`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(wh)
           })
        )
        await Promise.all(promises)
        setEditingSalonHours(false)
        fetchWorkingHours()
     } catch (e) {
        console.error(e)
        alert('Lỗi khi lưu giờ làm việc')
     } finally {
        setFormLoading(false)
     }
  }

  const toggleDayInModal = (val: number) => {
     const current = watch('selectedDays')
     if (current.includes(val)) setValue('selectedDays', current.filter(d => d !== val))
     else setValue('selectedDays', [...current, val])
  }

  // --- Render Helpers ---

  const getScheduleForCell = (staffId: string, day: Date) => {
     // Priority: Specific Date > Recurring Day
     const specific = schedules.find(s => s.staff.id === staffId && s.date && isSameDay(parseISO(s.date), day))
     if (specific) return specific
     
     const dayOfWeek = getDay(day)
     const recurring = schedules.find(s => s.staff.id === staffId && !s.date && s.dayOfWeek === dayOfWeek)
     
     // Check validity (recurrence often overridden by specific absence/date? Logic might be complex server side, but here we just show what we found)
     // Also check if there's a specific "Off" schedule? (Maybe breakStart/End empty means something?)
     
     return recurring
  }

  const getSalonHoursForDay = (day: Date) => {
     const dayOfWeek = getDay(day)
     return workingHours.find(wh => wh.dayOfWeek === dayOfWeek)
  }

  return (
    <div className="space-y-6">
       
       {/* Header & Controls */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Lịch phân công nhiệm vụ</h1>
          
          <div className="bg-white rounded-lg shadow-sm border p-1 flex items-center">
             <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
             <span className="px-4 font-medium min-w-[200px] text-center">
                {format(weekStart, 'dd.MM.yyyy')} – {format(addDays(weekStart, 6), 'dd.MM.yyyy')}
             </span>
             <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
          </div>
       </div>

      {loading ? (
        <div className="text-center py-12">Đang tải...</div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
           {/* Grid Container */}
           <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                 {/* Header Row */}
                 <div className="grid grid-cols-[250px_repeat(7,1fr)] bg-gray-50 border-b">
                    <div className="p-4 font-medium text-gray-500">Giờ mở cửa</div>
                    {weekDays.map(day => (
                       <div key={day.toISOString()} className="p-4 text-center border-l">
                          <div className="font-medium text-gray-900">{format(day, 'EEEE', { locale: vi })}</div>
                          <div className="text-sm text-gray-500">{format(day, 'dd.MM')}</div>
                       </div>
                    ))}
                 </div>

                 {/* Salon Hours Row */}
                 <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b bg-gray-50/50">
                    <div className="p-4 font-medium text-gray-900 flex items-center justify-between gap-2 group">
                       <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600"><Clock className="w-4 h-4"/></div>
                          Giờ mở cửa
                       </div>
                       <button 
                          onClick={() => {
                             const defaultHours = [1,2,3,4,5,6,0].map(d => ({ dayOfWeek: d, startTime: '09:00', endTime: '19:00', isOpen: true }))
                             const merged = defaultHours.map(d => {
                                const existing = workingHours.find(w => w.dayOfWeek === d.dayOfWeek)
                                return existing || d
                             })
                             setTempWorkingHours(merged)
                             setEditingSalonHours(true)
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-white rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Sửa giờ mở cửa"
                       >
                          <Edit className="w-4 h-4" />
                       </button>
                    </div>
                    {weekDays.map(day => {
                       const hours = getSalonHoursForDay(day)
                       return (
                          <div key={day.toISOString()} className="p-4 text-center border-l text-sm text-gray-600 flex items-center justify-center">
                             {hours && hours.isOpen ? (
                                <span>{hours.startTime} - {hours.endTime}</span>
                             ) : (
                                <span className="text-gray-400 italic">Đóng cửa</span>
                             )}
                          </div>
                       )
                    })}
                 </div>

                 {/* Staff Rows */}
                 {staff.map(s => (
                    <div key={s.id} className="grid grid-cols-[250px_repeat(7,1fr)] border-b hover:bg-gray-50 transition-colors group">
                       <div className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                             {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                             <div className="font-medium text-gray-900">{s.name}</div>
                             <div className="text-xs text-gray-500">Nhân viên</div>
                          </div>
                       </div>
                       
                       {weekDays.map(day => {
                          const schedule = getScheduleForCell(s.id, day)
                          const isClosed = !getSalonHoursForDay(day)?.isOpen
                          
                          return (
                             <div 
                                key={day.toISOString()} 
                                className={`
                                   p-4 border-l text-center cursor-pointer transition-all relative
                                   ${isClosed ? 'bg-gray-50/50' : 'hover:bg-primary-50'}
                                   ${schedule ? 'bg-white' : ''}
                                `}
                                onClick={() => handleCellClick(s.id, day, schedule)}
                             >
                                {schedule ? (
                                   <div className="inline-flex flex-col items-center">
                                      <span className="font-medium text-sm">{schedule.startTime} - {schedule.endTime}</span>
                                      {schedule.breakStart && (
                                         <span className="text-xs text-gray-400 mt-1">Nghỉ: {schedule.breakStart}-{schedule.breakEnd}</span>
                                      )}
                                      {!schedule.date && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400" title="Lịch lặp lại hàng tuần"></span>}
                                   </div>
                                ) : (
                                   !isClosed && <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <Plus className="w-4 h-4 text-gray-400" />
                                   </div>
                                )}
                             </div>
                          )
                       })}
                    </div>
                 ))}
                 
                 {staff.length === 0 && (
                    <div className="p-8 text-center text-gray-500">Chưa có nhân viên nào</div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Salon Hours Modal */}
      {editingSalonHours && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-6">
                  <div>
                     <h3 className="text-xl font-bold">Giờ mở cửa của salon</h3>
                     <p className="text-sm text-gray-500">Thiết lập giờ làm việc chung cho toàn bộ salon</p>
                  </div>
                  <button onClick={() => setEditingSalonHours(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
               </div>

               <div className="space-y-4">
                  {[1, 2, 3, 4, 5, 6, 0].map((dayValue) => {
                     const currentSetting = tempWorkingHours.find(w => w.dayOfWeek === dayValue)
                     const isOpen = currentSetting ? currentSetting.isOpen : true
                     const startTime = currentSetting?.startTime || '09:00'
                     const endTime = currentSetting?.endTime || '19:00'
                     
                     return (
                        <div key={dayValue} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                           <div className="w-32 font-medium">
                              {DAYS.find(d => d.value === dayValue)?.label}
                           </div>
                           
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                 type="checkbox" 
                                 checked={isOpen}
                                 onChange={(e) => {
                                    // Update local state is tricky without a dedicated form state.
                                    // For simplicity in this "inline" approach, we'll create a new array on the fly for saving,
                                    // but to support UI interactivity we need a temp state.
                                    // Let's defer to a separate component approach in logic if simple state fails,
                                    // bu request was to keep it simple. Let's create a Temp state wrapper above.
                                    handleUpdateTempSalonHours(dayValue, { isOpen: e.target.checked })
                                 }}
                                 className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-600">Mở cửa</span>
                           </label>

                           {isOpen && (
                              <div className="flex items-center gap-2 ml-auto">
                                 <input 
                                    type="time" 
                                    value={startTime}
                                    onChange={(e) => handleUpdateTempSalonHours(dayValue, { startTime: e.target.value })}
                                    className="border rounded px-2 py-1 text-sm"
                                 />
                                 <span>-</span>
                                 <input 
                                    type="time" 
                                    value={endTime}
                                    onChange={(e) => handleUpdateTempSalonHours(dayValue, { endTime: e.target.value })}
                                    className="border rounded px-2 py-1 text-sm"
                                 />
                              </div>
                           )}
                           
                           {!isOpen && (
                              <div className="ml-auto text-sm text-gray-400 italic">Đã đóng cửa</div>
                           )}
                        </div>
                     )
                  })}
               </div>

               <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button onClick={() => setEditingSalonHours(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                  <button 
                     onClick={saveSalonHours} 
                     disabled={formLoading}
                     className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                     {formLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Modal Logic */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold">{editingSchedule ? 'Sửa lịch làm việc' : 'Thêm ca làm việc'}</h3>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                 {formError && <div className="bg-red-50 text-red-600 p-3 rounded">{formError}</div>}
                 
                 {/* Days Selection */}
                 <div>
                    <label className="block text-sm font-medium mb-2">Ngày áp dụng</label>
                    <div className="flex flex-wrap gap-2">
                       {DAYS.map(day => (
                          <button
                             key={day.value}
                             type="button"
                             onClick={() => toggleDayInModal(day.value)}
                             className={`
                                width-8 h-8 px-3 py-1 rounded text-sm border transition-colors
                                ${watch('selectedDays').includes(day.value) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 hover:bg-gray-50'}
                             `}
                          >
                             {day.label}
                          </button>
                       ))}
                    </div>
                    {watch('selectedDays').length === 0 && <p className="text-red-500 text-xs mt-1">Chọn ít nhất một ngày</p>}
                 </div>
                 
                 {/* All Day Toggle */}
                 <div className="flex items-center gap-2">
                    <input 
                       type="checkbox" 
                       id="isAllDay"
                       {...register('isAllDay')}
                       onChange={(e) => {
                          register('isAllDay').onChange(e)
                          if (e.target.checked) {
                             setValue('startTime', '00:00')
                             setValue('endTime', '23:59')
                          }
                       }}
                       className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="isAllDay" className="text-sm font-medium text-gray-700 select-none">Làm cả ngày (09:00 - 19:00)</label>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium mb-1">Bắt đầu</label>
                       <input 
                           type="time" 
                           {...register('startTime')} 
                           disabled={watch('isAllDay')}
                           className={`w-full border rounded-lg px-3 py-2 ${watch('isAllDay') ? 'bg-gray-100 text-gray-500' : ''}`} 
                        />
                       {errors.startTime && <p className="text-red-500 text-xs">{errors.startTime.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Kết thúc</label>
                        <input 
                           type="time" 
                           {...register('endTime')} 
                           disabled={watch('isAllDay')}
                           className={`w-full border rounded-lg px-3 py-2 ${watch('isAllDay') ? 'bg-gray-100 text-gray-500' : ''}`} 
                        />
                        {errors.endTime && <p className="text-red-500 text-xs">{errors.endTime.message}</p>}
                    </div>
                 </div>

                 {/* Break Time Toggle */}
                 <div>
                    <label className="flex items-center gap-2 mb-2">
                       <input 
                          type="checkbox" 
                          {...register('hasBreak')}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                       />
                       <span className="text-sm font-medium text-gray-700 select-none">Thêm giờ nghỉ</span>
                    </label>

                    {watch('hasBreak') && (
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                           <div>
                              <label className="block text-xs font-medium mb-1 text-gray-500">Nghỉ từ</label>
                              <input type="time" {...register('breakStart')} className="w-full border rounded-lg px-3 py-2 text-sm" />
                           </div>
                           <div>
                               <label className="block text-xs font-medium mb-1 text-gray-500">Đến</label>
                               <input type="time" {...register('breakEnd')} className="w-full border rounded-lg px-3 py-2 text-sm" />
                           </div>
                        </div>
                    )}
                 </div>
                 
                 {/* Date Override */}
                 <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed">
                    <input type="date" {...register('date')} className="border rounded-lg px-3 py-2 text-sm" />
                    <span className="text-xs text-gray-500">Chọn ngày cụ thể nếu không muốn lặp lại hàng tuần</span>
                 </div>

                 <div className="flex gap-3 mt-6 pt-4 border-t">
                    {editingSchedule && (
                       <button type="button" onClick={handleDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg mr-auto">Xóa</button>
                    )}
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                    <button type="submit" disabled={formLoading} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                       {formLoading ? 'Đang lưu...' : 'Lưu'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  )
}

