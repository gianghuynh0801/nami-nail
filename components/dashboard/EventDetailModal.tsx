'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Scissors, UserCog, Clock, FileText, CheckCircle2, XCircle, Circle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

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
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
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
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes || '')
      setIsEditing(false)
    }
  }, [appointment])

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
        setIsEditing(false)
        onUpdate()
      }
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setLoading(false)
    }
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
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
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-semibold text-gray-900">{appointment.customerName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-semibold text-gray-900">{appointment.customerPhone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Service</p>
                <p className="font-semibold text-gray-900">{appointment.service?.name || 'Unknown Service'}</p>
                {appointment.service && (
                  <p className="text-sm text-gray-600">€{appointment.service.price.toLocaleString()} • {appointment.service.duration} min</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <UserCog className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Staff Member</p>
                <p className="font-semibold text-gray-900">{appointment.staff?.name || 'Unknown Staff'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-semibold text-gray-900">
                  {format(new Date(appointment.startTime), 'EEEE, MM/dd/yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {format(new Date(appointment.startTime), 'HH:mm')} - {format(new Date(appointment.endTime), 'HH:mm')}
                </p>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Notes</h3>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-primary-400 hover:text-primary-500 font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
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
                      setIsEditing(false)
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
          <div className="border-t border-gray-200 pt-6">
            <div className="flex gap-3">
              {appointment.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleStatusChange('CONFIRMED')}
                    disabled={statusLoading}
                    className="flex-1 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 font-medium"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleStatusChange('CANCELLED')}
                    disabled={statusLoading}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                </>
              )}
              {appointment.status === 'CONFIRMED' && (
                <button
                  onClick={() => handleStatusChange('COMPLETED')}
                  disabled={statusLoading}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 font-medium"
                >
                  Complete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

