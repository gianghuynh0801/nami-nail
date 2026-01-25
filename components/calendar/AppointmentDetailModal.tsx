'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Scissors, Clock, Calendar, MapPin, FileText, Play, CheckCircle, XCircle, Edit2, Trash2, Loader2, LogIn, Save, UserCog, Plus, AlertTriangle, DollarSign } from 'lucide-react'
import { format, parseISO, differenceInMinutes, addMinutes, isBefore, isAfter, areIntervalsOverlapping } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { CalendarAppointment } from './types'

// Interface cho dịch vụ thêm thủ công
interface ExtraService {
  name: string
  duration: number // phút
  price: number // VNĐ
}

// Helper để parse extra services từ notes
export function parseExtraServices(notes: string | null | undefined): ExtraService[] {
  if (!notes) return []
  const match = notes.match(/\[EXTRA_SERVICES\]([\s\S]*?)\[\/EXTRA_SERVICES\]/)
  if (!match) return []
  try {
    const data = JSON.parse(match[1])
    return data.items || []
  } catch {
    return []
  }
}

// Helper để format extra services vào notes
function formatExtraServicesToNotes(extraServices: ExtraService[], existingNotes: string): string {
  // Remove old extra services tag if exists
  let cleanNotes = existingNotes.replace(/\[EXTRA_SERVICES\][\s\S]*?\[\/EXTRA_SERVICES\]\n?/, '').trim()
  
  if (extraServices.length === 0) return cleanNotes
  
  const extraTag = `[EXTRA_SERVICES]${JSON.stringify({ items: extraServices })}[/EXTRA_SERVICES]`
  return cleanNotes ? `${cleanNotes}\n${extraTag}` : extraTag
}

// Helper để hiển thị notes mà không có tag extra services
export function getDisplayNotes(notes: string | null | undefined): string {
  if (!notes) return ''
  return notes.replace(/\[EXTRA_SERVICES\][\s\S]*?\[\/EXTRA_SERVICES\]\n?/, '').trim()
}

interface AppointmentDetailModalProps {
  salonId?: string
  staffList?: any[] // Receive staff list for conflict check
  appointment: CalendarAppointment | null
  staffName: string
  salonName?: string
  isOpen: boolean
  onClose: () => void
  onCheckIn?: (appointmentId: string) => Promise<void>
  onStart?: (appointmentId: string) => Promise<void>
  onComplete?: (appointmentId: string) => Promise<void>
  onCancel?: (appointmentId: string) => Promise<void>
  onEdit?: (appointment: CalendarAppointment) => void
  onConfirm?: (appointmentId: string) => Promise<void>
  onUpdate?: () => void
  isAdmin?: boolean
}

// ... STATUS_CONFIG ... (Keep existing if not changing)
const STATUS_CONFIG = {
  PENDING: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  CHECKED_IN: { label: 'Đã check-in', color: 'bg-green-100 text-green-800 border-green-200', icon: LogIn },
  IN_PROGRESS: { label: 'Đang thực hiện', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Play },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
}

export default function AppointmentDetailModal({
  salonId,
  staffList = [],
  appointment,
  staffName,
  salonName,
  isOpen,
  onClose,
  onCheckIn,
  onStart,
  onComplete,
  onCancel,
  onEdit,
  onConfirm,
  onUpdate,
  isAdmin = false,
}: AppointmentDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [actionType, setActionType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [staffListState, setStaffListState] = useState<any[]>([])
  
  // Extra Services State (manual input)
  const [extraServices, setExtraServices] = useState<ExtraService[]>([])
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    staffId: '',
    startTime: '',
    endTime: '',
    notes: '',
  })

  // Reset state
  useEffect(() => {
    if (appointment) {
      setIsEditing(false)
      // Parse existing extra services from notes
      setExtraServices(parseExtraServices(appointment.notes))
      setConflictWarning(null)
      setEditForm({
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        serviceId: appointment.service.id,
        staffId: appointment.staffId,
        startTime: format(parseISO(appointment.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(parseISO(appointment.endTime), "yyyy-MM-dd'T'HH:mm"),
        notes: getDisplayNotes(appointment.notes), // Show notes without extra services tag
      })
    }
  }, [appointment, isOpen])

  // Fetch edit data
  useEffect(() => {
    if (isEditing && salonId) {
      const fetchData = async () => {
        setLoadingData(true)
        try {
          const [servicesRes, staffRes] = await Promise.all([
            fetch(`/api/salon/${salonId}/service`),
            fetch(`/api/salon/${salonId}/staff`),
          ])
          if (servicesRes.ok) {
            const data = await servicesRes.json()
            setServices(data.services || [])
          }
          if (staffRes.ok) {
            const data = await staffRes.json()
            setStaffListState(data.staff || [])
          }
        } catch (err) {
          console.error('Error fetching edit data:', err)
        } finally {
          setLoadingData(false)
        }
      }
      fetchData()
    }
  }, [isEditing, salonId])

  // Auto-calculate End Time based on duration
  useEffect(() => {
    if (!isEditing || !services.length) return

    const mainSvc = services.find(s => s.id === editForm.serviceId)
    let totalDuration = mainSvc?.duration || 0

    // Add duration from manual extra services
    extraServices.forEach(extra => {
      totalDuration += extra.duration || 0
    })

    if (editForm.startTime && totalDuration > 0) {
      try {
        const start = new Date(editForm.startTime)
        const end = addMinutes(start, totalDuration)
        // Keep formatted string
        const endStr = format(end, "yyyy-MM-dd'T'HH:mm")
        
        // Only update if different (to check simple equality)
        if (endStr !== editForm.endTime) {
             setEditForm(prev => ({ ...prev, endTime: endStr }))
        }
      } catch (e) {
        // Invalid date
      }
    }
  }, [editForm.serviceId, extraServices, editForm.startTime, services, isEditing, editForm.endTime])

  // Conflict Detection
  useEffect(() => {
    if (!isEditing || !staffList.length || !editForm.staffId || !editForm.startTime || !editForm.endTime) {
      setConflictWarning(null)
      return
    }

    const targetStaff = staffList.find(s => s.id === editForm.staffId)
    if (!targetStaff) return

    try {
      const newStart = new Date(editForm.startTime)
      const newEnd = new Date(editForm.endTime)

      // Find overlapping appointments
      const conflicts = targetStaff.appointments.filter((apt: any) => {
        if (apt.id === appointment?.id) return false // Ignore self
        if (apt.status === 'CANCELLED') return false

        const aptStart = parseISO(apt.startTime)
        const aptEnd = parseISO(apt.endTime)

        return areIntervalsOverlapping(
          { start: newStart, end: newEnd },
          { start: aptStart, end: aptEnd }
        )
      })

      if (conflicts.length > 0) {
        const conflictNames = conflicts.map((c: any) => `${format(parseISO(c.startTime), 'HH:mm')} - ${c.customerName}`).join(', ')
        setConflictWarning(`Cảnh báo: Trùng lịch với ${conflicts.length} khách hàng (${conflictNames})`)
      } else {
        setConflictWarning(null)
      }
    } catch (e) {
      // Date parse error
    }
  }, [editForm.staffId, editForm.startTime, editForm.endTime, staffList, isEditing, appointment])


  // Handle Save
  const handleSaveEdit = async () => {
    setIsLoading(true)
    setActionType('save')
    try {
      // Format extra services into notes with special tag
      const validExtras = extraServices.filter(e => e.name.trim())
      const finalNotes = formatExtraServicesToNotes(validExtras, editForm.notes)

      const res = await fetch(`/api/appointments/${appointment!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: editForm.customerName,
          customerPhone: editForm.customerPhone,
          serviceId: editForm.serviceId,
          staffId: editForm.staffId,
          startTime: new Date(editForm.startTime).toISOString(),
          endTime: new Date(editForm.endTime).toISOString(),
          notes: finalNotes,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to update appointment')
      }

      setIsEditing(false)
      if (onUpdate) onUpdate()
      onClose()
    } catch (err: any) {
      console.error('Error saving appointment:', err)
      setError(err.message || 'Lỗi khi lưu lịch hẹn')
    } finally {
      setIsLoading(false)
      setActionType(null)
    }
  }
  
  // Existing render helpers...
  if (!isOpen || !appointment) return null
  
  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.PENDING
  const StatusIcon = statusConfig.icon
  const startTimeObj = parseISO(appointment.startTime)
  const endTimeObj = parseISO(appointment.endTime)

  const handleAction = async (action: any) => {
    // ... (Keep existing implementation logic but copy here for clarity/completeness of replacement)
    setIsLoading(true)
    setActionType(action)
    setError(null)
    try {
      if (action === 'checkIn' && onCheckIn) await onCheckIn(appointment.id)
      else if (action === 'start' && onStart) await onStart(appointment.id)
      else if (action === 'complete' && onComplete) await onComplete(appointment.id)
      else if (action === 'cancel' && onCancel) await onCancel(appointment.id)
      else if (action === 'confirm' && onConfirm) await onConfirm(appointment.id)
      onClose()
    } catch (error: any) {
      console.error(`Error ${action} appointment:`, error)
      setError(error?.message || `Có lỗi xảy ra`)
    } finally {
      setIsLoading(false)
      setActionType(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`px-6 py-4 ${statusConfig.color} border-b flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className="w-5 h-5" />
              <span className="font-medium">{statusConfig.label}</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Create a cleaner breakdown for readability */}
          
          {/* Customer Info */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-lg flex-shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-2">
              {isEditing ? (
                <>
                  <div>
                    <label className="text-xs text-gray-500">Tên khách hàng</label>
                    <input type="text" className="w-full px-2 py-1 border rounded" value={editForm.customerName} onChange={e => setEditForm(prev => ({ ...prev, customerName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Số điện thoại</label>
                    <input type="tel" className="w-full px-2 py-1 border rounded" value={editForm.customerPhone} onChange={e => setEditForm(prev => ({ ...prev, customerPhone: e.target.value }))} />
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-gray-900 text-lg">{appointment.customerName}</h3>
                  <a href={`tel:${appointment.customerPhone}`} className="flex items-center gap-1 text-primary-600 hover:underline text-sm"><Phone className="w-4 h-4" />{appointment.customerPhone}</a>
                </>
              )}
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Details */}
          <div className="space-y-4">
            {/* Service Selection including Extra Services */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-1">
                <Scissors className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm text-gray-500">Dịch vụ</p>
                {isEditing ? (
                  <>
                    {/* Main Service */}
                    <select
                      className="w-full px-2 py-1 border rounded"
                      value={editForm.serviceId}
                      onChange={e => setEditForm(prev => ({ ...prev, serviceId: e.target.value }))}
                      disabled={loadingData}
                    >
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.duration}p) - {s.price?.toLocaleString('vi-VN')}đ</option>
                      ))}
                    </select>
                    
                    {/* Extra Services List - Manual Input */}
                    {extraServices.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-gray-500 font-medium">Dịch vụ thêm:</p>
                        {extraServices.map((extra, index) => (
                          <div key={index} className="p-2 bg-green-50 border border-green-200 rounded-lg space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Tên dịch vụ (VD: Vẽ nail)"
                                className="flex-1 px-2 py-1 border rounded text-sm"
                                value={extra.name}
                                onChange={(e) => {
                                  const newExtras = [...extraServices]
                                  newExtras[index] = { ...newExtras[index], name: e.target.value }
                                  setExtraServices(newExtras)
                                }}
                              />
                              <button 
                                onClick={() => {
                                  const newExtras = extraServices.filter((_, i) => i !== index)
                                  setExtraServices(newExtras)
                                }}
                                className="p-1 text-red-500 hover:bg-red-100 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-[10px] text-gray-500">Thời gian (phút)</label>
                                <input
                                  type="number"
                                  placeholder="15"
                                  min="0"
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  value={extra.duration || ''}
                                  onChange={(e) => {
                                    const newExtras = [...extraServices]
                                    newExtras[index] = { ...newExtras[index], duration: parseInt(e.target.value) || 0 }
                                    setExtraServices(newExtras)
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] text-gray-500">Giá (VNĐ)</label>
                                <input
                                  type="number"
                                  placeholder="50000"
                                  min="0"
                                  step="1000"
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  value={extra.price || ''}
                                  onChange={(e) => {
                                    const newExtras = [...extraServices]
                                    newExtras[index] = { ...newExtras[index], price: parseInt(e.target.value) || 0 }
                                    setExtraServices(newExtras)
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add Service Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setExtraServices([...extraServices, { name: '', duration: 0, price: 0 }])
                      }}
                      className="text-xs flex items-center gap-1 text-primary-600 hover:underline font-medium mt-2"
                    >
                      <Plus className="w-3 h-3" /> Thêm dịch vụ
                    </button>

                    {/* Total Summary */}
                    {extraServices.length > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <div className="flex justify-between text-gray-600">
                          <span>Tổng thời gian:</span>
                          <span className="font-medium">
                            {(services.find(s => s.id === editForm.serviceId)?.duration || 0) + extraServices.reduce((sum, e) => sum + (e.duration || 0), 0)} phút
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600 mt-1">
                          <span>Tổng giá (dự kiến):</span>
                          <span className="font-semibold text-primary-600">
                            {((services.find(s => s.id === editForm.serviceId)?.price || 0) + extraServices.reduce((sum, e) => sum + (e.price || 0), 0)).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-900">{appointment.service.name} <span className="text-sm font-normal text-gray-500">({appointment.service.duration} phút)</span></p>
                    {/* Show extra services in view mode */}
                    {parseExtraServices(appointment.notes).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {parseExtraServices(appointment.notes).map((extra, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-green-50 px-2 py-1 rounded">
                            <span className="text-green-700">+ {extra.name} ({extra.duration}p)</span>
                            <span className="font-medium text-green-600">{extra.price.toLocaleString('vi-VN')}đ</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Staff */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-1">
                <UserCog className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Nhân viên</p>
                {isEditing ? (
                  <select
                    className="w-full mt-1 px-2 py-1 border rounded"
                    value={editForm.staffId}
                    onChange={e => setEditForm(prev => ({ ...prev, staffId: e.target.value }))}
                    disabled={loadingData}
                  >
                    {staffListState.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="font-medium text-gray-900">{staffName}</p>
                )}
              </div>
            </div>

            {/* Time */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-1">
                <Calendar className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Thời gian</p>
                {isEditing ? (
                   <div className="space-y-2 mt-1">
                     <input type="datetime-local" className="w-full px-2 py-1 border rounded text-sm" value={editForm.startTime} onChange={e => setEditForm(prev => ({ ...prev, startTime: e.target.value }))} />
                     <div className="flex items-center gap-2">
                        <input type="datetime-local" className="w-full px-2 py-1 border rounded text-sm bg-gray-50" value={editForm.endTime} disabled />
                        <span className="text-xs text-gray-400 whitespace-nowrap">(Tự động tính)</span>
                     </div>
                     {conflictWarning && (
                       <div className="flex items-start gap-2 p-2 bg-red-50 text-red-700 rounded text-xs border border-red-200">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{conflictWarning}</span>
                       </div>
                     )}
                   </div>
                ) : (
                  <>
                    <p className="font-medium text-gray-900">{format(startTimeObj, 'EEEE, dd/MM/yyyy', { locale: vi })}</p>
                    <p className="text-sm text-gray-600">{format(startTimeObj, 'HH:mm')} - {format(endTimeObj, 'HH:mm')}</p>
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="flex items-start gap-3">
               <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0 mt-1">
                 <FileText className="w-5 h-5 text-yellow-600" />
               </div>
               <div className="flex-1">
                 <p className="text-sm text-gray-500">Ghi chú</p>
                 {isEditing ? (
                    <textarea className="w-full mt-1 px-2 py-1 border rounded" rows={3} placeholder="Ghi chú thêm..." value={editForm.notes} onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))} />
                 ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">{getDisplayNotes(appointment.notes) || 'Không có ghi chú'}</p>
                 )}
               </div>
            </div>
            
            {/* View-Only Location Info */}
            {!isEditing && salonName && (
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center"><MapPin className="w-5 h-5 text-primary-600" /></div>
                 <div className="flex-1"><p className="text-sm text-gray-500">Chi nhánh</p><p className="font-medium text-gray-900">{salonName}</p></div>
               </div>
            )}
            
            {/* Queue & Wait Time (View Only) */}
            {!isEditing && appointment.queueNumber && (
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><span className="text-lg font-bold text-green-700">{appointment.queueNumber}</span></div>
                 <div className="flex-1"><p className="text-sm text-gray-500">Số thứ tự</p><p className="font-medium text-gray-900">#{appointment.queueNumber}</p></div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          {error && <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          
          {isEditing ? (
             <div className="flex gap-3">
                <button
                  onClick={handleSaveEdit}
                  disabled={isLoading || !!conflictWarning}  // Disable save if conflict? Or allow override? User said "cảnh báo", usually implies soft warning. Let's allowing override but make it red.
                  // Actually, "cảnh báo" means warning. Let's allow save but keep warning visible.
                  className={`flex-1 px-4 py-2 text-white rounded-lg font-medium flex items-center justify-center gap-2 ${conflictWarning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary-500 hover:bg-primary-600'}`}
                >
                  {isLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>}
                  {conflictWarning ? 'Lưu (Bỏ qua cảnh báo)' : 'Lưu thay đổi'}
                </button>
                <button onClick={() => setIsEditing(false)} disabled={isLoading} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Hủy</button>
             </div>
          ) : (
            <div className="flex flex-col gap-3">
               <div className="flex gap-2">
                {appointment.status === 'PENDING' && isAdmin && onConfirm && <button onClick={() => handleAction('confirm')} disabled={isLoading} className="flex-1 btn-primary py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600">Xác nhận</button>}
                {appointment.status === 'CONFIRMED' && onCheckIn && <button onClick={() => handleAction('checkIn')} disabled={isLoading} className="flex-1 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600">Đã đến</button>}
                {appointment.status === 'CHECKED_IN' && onStart && <button onClick={() => handleAction('start')} disabled={isLoading} className="flex-1 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600">Bắt đầu làm</button>}
                {appointment.status === 'IN_PROGRESS' && onComplete && <button onClick={() => handleAction('complete')} disabled={isLoading} className="flex-1 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600">Hoàn thành</button>}
               </div>

              <div className="flex gap-2">
                 {/* Allow editing even if appointment time has passed - only restrict by status */}
                 {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                   <button onClick={() => setIsEditing(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                     <Edit2 className="w-4 h-4" /> Sửa
                   </button>
                 )}
                 {onCancel && appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                    <button onClick={() => handleAction('cancel')} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"><Trash2 className="w-4 h-4" /> Hủy</button>
                 )}
                 <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Đóng</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
