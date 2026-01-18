'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Scissors, UserCog, Clock, FileText, CheckCircle2, XCircle, Circle, CheckCircle, Edit2, Save, XIcon } from 'lucide-react'
import { format, addMinutes } from 'date-fns'
import { usePermissions } from '@/hooks/usePermissions'

interface Appointment {
  id: string
  customerName: string
  customerPhone: string
  service: {
    id: string
    name: string
    price: number
    duration: number
  }
  staff: {
    id: string
    name: string
  }
  salon: {
    id: string
    name: string
  }
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'CANCELLED' | 'COMPLETED'
  notes?: string | null
}

interface EventDetailModalProps {
  appointment: Appointment | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function EventDetailModal({ appointment, isOpen, onClose, onUpdate }: EventDetailModalProps) {
  const [notes, setNotes] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  
  // Edit mode states
  const [isEditingAppointment, setIsEditingAppointment] = useState(false)
  
  // ... (rest of states)

  // ... (rest of functions)

  const handleCheckIn = async () => {
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/appointments/${appointment!.id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.ok) {
        onUpdate()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to check in')
      }
    } catch (error) {
      console.error('Error checking in:', error)
      alert('Error verifying customer arrival')
    } finally {
      setStatusLoading(false)
    }
  }

  // ... (rest of component render)

  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    staffId: '',
    startTime: '',
    endTime: '',
    status: '',
    additionalServiceId: '', // State for adding extra service
  })
  
  // Data for dropdowns
  const [services, setServices] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  
  const { hasPermission, role } = usePermissions()
  const canEdit = hasPermission('UPDATE_APPOINTMENT') || role === 'OWNER' || role === 'MANAGER'

  useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes || '')
      setIsEditingNotes(false)
      setIsEditingAppointment(false)
      
      // Initialize edit form
      setEditForm({
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        serviceId: appointment.service.id,
        staffId: appointment.staff.id,
        startTime: format(new Date(appointment.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(appointment.endTime), "yyyy-MM-dd'T'HH:mm"),
        status: appointment.status,
        additionalServiceId: '',
      })
      
      // Fetch services and staff for the salon
      if (appointment.salon?.id) {
        fetchServicesAndStaff(appointment.salon.id)
      }
    }
  }, [appointment])

  const fetchServicesAndStaff = async (salonId: string) => {
    setLoadingData(true)
    try {
      const [servicesRes, staffRes] = await Promise.all([
        fetch(`/api/salon/${salonId}/service`),
        fetch(`/api/salon/${salonId}/staff`),
      ])

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json()
        setServices(servicesData.services || servicesData || [])
      }

      if (staffRes.ok) {
        const staffData = await staffRes.json()
        setStaff(staffData.staff || staffData || [])
      }
    } catch (error) {
      console.error('Error fetching services and staff:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (!isOpen || !appointment) return null

  const handleSaveNotes = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (res.ok) {
        setIsEditingNotes(false)
        onUpdate()
      }
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAppointment = async () => {
    setLoading(true)
    try {
      // Handle additional service note
      let finalNotes = appointment.notes || ''
      if (editForm.additionalServiceId) {
        const addedService = services.find(s => s.id === editForm.additionalServiceId)
        if (addedService) {
          const serviceNote = `\n[+Dịch vụ: ${addedService.name} (${addedService.duration}p)]`
          finalNotes = finalNotes ? finalNotes + serviceNote : serviceNote
        }
      }

      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: editForm.customerName,
          customerPhone: editForm.customerPhone,
          serviceId: editForm.serviceId,
          staffId: editForm.staffId,
          startTime: new Date(editForm.startTime).toISOString(),
          endTime: new Date(editForm.endTime).toISOString(),
          status: editForm.status,
          notes: finalNotes !== appointment.notes ? finalNotes : undefined, // Only send if changed
        }),
      })

      if (res.ok) {
        setIsEditingAppointment(false)
        onUpdate()
        onClose()
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Failed to update appointment')
      }
    } catch (error) {
      console.error('Error saving appointment:', error)
      alert('Failed to update appointment')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditingAppointment(false)
    setEditForm({
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      serviceId: appointment.service.id,
      staffId: appointment.staff.id,
      startTime: format(new Date(appointment.startTime), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(appointment.endTime), "yyyy-MM-dd'T'HH:mm"),
      status: appointment.status,
      additionalServiceId: '',
    })
  }

  const handleStatusChange = async (newStatus: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setStatusLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle2 className="w-4 h-4" />
      case 'CANCELLED':
        return <XCircle className="w-4 h-4" />
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Circle className="w-4 h-4" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmed'
      case 'CANCELLED':
        return 'Cancelled'
      case 'COMPLETED':
        return 'Completed'
      default:
        return 'Pending'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Appointment Details</h2>
          <div className="flex items-center gap-2">
            {/* Edit Button - Only visible if has permission */}
            {!isEditingAppointment && canEdit && appointment.status !== 'CANCELLED' && (
              <button
                onClick={() => setIsEditingAppointment(true)}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors ml-2"
                title="Edit Appointment"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(appointment.status)}`}>
              {getStatusIcon(appointment.status)}
              {getStatusLabel(appointment.status)}
            </span>
          </div>

          {/* Customer Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Customer</p>
                {isEditingAppointment ? (
                  <input
                    type="text"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-semibold"
                    placeholder="Customer name"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{appointment.customerName}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Phone Number</p>
                {isEditingAppointment ? (
                  <input
                    type="tel"
                    value={editForm.customerPhone}
                    onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-semibold"
                    placeholder="Phone number"
                  />
                ) : (
                  <p className="font-semibold text-gray-900">{appointment.customerPhone}</p>
                )}
              </div>
            </div>

            {isEditingAppointment && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Trạng thái</p>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-semibold"
                  >
                    <option value="PENDING">Chờ xác nhận (Pending)</option>
                    <option value="CONFIRMED">Đã xác nhận (Confirmed)</option>
                    <option value="CHECKED_IN">Đã check-in (Checked In)</option>
                    <option value="IN_PROGRESS">Đang thực hiện (In Progress)</option>
                    <option value="COMPLETED">Hoàn thành (Completed)</option>
                    <option value="CANCELLED">Đã hủy (Cancelled)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Service</p>
                {isEditingAppointment ? (
                  <select
                    value={editForm.serviceId}
                    onChange={(e) => setEditForm({ ...editForm, serviceId: e.target.value })}
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-semibold"
                    disabled={loadingData}
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - €{service.price.toLocaleString()} • {service.duration} min
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900">{appointment.service?.name || 'Unknown Service'}</p>
                    {appointment.service && (
                      <p className="text-sm text-gray-600">€{appointment.service.price.toLocaleString()} • {appointment.service.duration} min</p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <UserCog className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Staff Member</p>
                {isEditingAppointment ? (
                  <select
                    value={editForm.staffId}
                    onChange={(e) => setEditForm({ ...editForm, staffId: e.target.value })}
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-semibold"
                    disabled={loadingData}
                  >
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-semibold text-gray-900">{appointment.staff?.name || 'Unknown Staff'}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Time</p>
                {isEditingAppointment ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-600">Start Time</label>
                      <input
                        type="datetime-local"
                        value={editForm.startTime}
                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">End Time</label>
                      <input
                        type="datetime-local"
                        value={editForm.endTime}
                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-semibold"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(appointment.startTime), 'EEEE, MM/dd/yyyy')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(appointment.startTime), 'HH:mm')} - {format(new Date(appointment.endTime), 'HH:mm')}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Save/Cancel buttons for appointment editing */}
          {isEditingAppointment && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex gap-3">
                <button
                  onClick={handleSaveAppointment}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
                >
                  <XIcon className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Notes</h3>
              </div>
              {!isEditingNotes && canEdit && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-sm text-primary-400 hover:text-primary-500 font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter notes for the appointment..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={4}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveNotes}
                    disabled={loading}
                    className="px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingNotes(false)
                      setNotes(appointment.notes || '')
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 min-h-[100px]">
                {notes ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{notes}</p>
                ) : (
                  <p className="text-gray-400 italic">No notes</p>
                )}
              </div>
            )}
          </div>
          {/* Actions */}
          {!isEditingAppointment && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex gap-3">
                {appointment.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('CONFIRMED')}
                      disabled={statusLoading}
                      className="flex-1 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 font-medium"
                    >
                      Xác nhận
                    </button>
                    <button
                      onClick={() => handleStatusChange('CANCELLED')}
                      disabled={statusLoading}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
                    >
                      Hủy
                    </button>
                  </>
                )}
                {appointment.status === 'CONFIRMED' && (
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => setIsEditingAppointment(true)}
                      disabled={statusLoading}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Sửa
                    </button>
                    <button
                      onClick={handleCheckIn}
                      disabled={statusLoading}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Đã đến
                    </button>
                    <button
                      onClick={() => handleStatusChange('CANCELLED')}
                      disabled={statusLoading}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 font-medium"
                    >
                      Hủy
                    </button>
                  </div>
                )}
                {appointment.status === 'IN_PROGRESS' && (
                   <div className="flex gap-3 w-full">
                    <button
                      onClick={() => handleStatusChange('COMPLETED')}
                      disabled={statusLoading}
                      className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Hoàn thành
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
