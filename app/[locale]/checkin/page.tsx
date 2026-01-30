'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Phone, Calendar, Clock, User, Scissors, MapPin, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

interface Appointment {
  id: string
  customerName: string
  customerPhone: string
  startTime: string
  endTime: string
  status: string
  checkedInAt: string | null
  queueNumber: number | null
  service: {
    id: string
    name: string
    duration: number
    price: number
  }
  staff: {
    id: string
    name: string
    phone: string
  }
  salon: {
    id: string
    name: string
    address: string
    phone: string
  }
}

export default function CheckInPage() {
  const [phone, setPhone] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSearch = async () => {
    if (!phone || phone.length < 10) {
      setError('Vui lòng nhập số điện thoại hợp lệ (ít nhất 10 số)')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    setAppointments([])

    try {
      const res = await fetch('/api/public/appointments/by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Không tìm thấy lịch hẹn')
      }

      setAppointments(data.appointments || [])
      
      if (!data.appointments || data.appointments.length === 0) {
        setError('Không tìm thấy lịch hẹn nào cho số điện thoại này')
      }
    } catch (err: any) {
      console.error('Error searching appointments:', err)
      setError(err.message || 'Có lỗi xảy ra khi tìm kiếm lịch hẹn')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (appointmentId: string) => {
    setCheckingIn(appointmentId)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/public/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Check-in thất bại')
      }

      setSuccess(`Check-in thành công! Số thứ tự của bạn: #${data.queueNumber}`)
      
      // Refresh appointments
      await handleSearch()
    } catch (err: any) {
      console.error('Error checking in:', err)
      setError(err.message || 'Có lỗi xảy ra khi check-in')
    } finally {
      setCheckingIn(null)
    }
  }

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
      CONFIRMED: { label: 'Đã xác nhận', color: 'bg-green-100 text-green-800' },
      CHECKED_IN: { label: 'Đã check-in', color: 'bg-blue-100 text-blue-800' },
      IN_PROGRESS: { label: 'Đang thực hiện', color: 'bg-purple-100 text-purple-800' },
      COMPLETED: { label: 'Đã hoàn thành', color: 'bg-gray-100 text-gray-800' },
      CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
    }
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Check-in</h1>
          <p className="text-gray-600">Nhập số điện thoại để xem và check-in lịch hẹn của bạn</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Nhập số điện thoại đã đặt lịch"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang tìm...
                  </>
                ) : (
                  'Tìm kiếm'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Appointments List */}
        {appointments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Lịch hẹn của bạn ({appointments.length})
            </h2>
            
            {appointments.map((apt) => {
              const statusInfo = getStatusLabel(apt.status)
              const startTime = parseISO(apt.startTime)
              const endTime = parseISO(apt.endTime)
              const canCheckIn = apt.status === 'PENDING' || apt.status === 'CONFIRMED'

              return (
                <div
                  key={apt.id}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{apt.customerName}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      {apt.queueNumber && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium mb-2">
                          <span>#</span>
                          <span className="text-lg font-bold">{apt.queueNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Ngày</p>
                        <p className="font-medium text-gray-900">
                          {format(startTime, 'EEEE, dd/MM/yyyy', { locale: vi })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Thời gian</p>
                        <p className="font-medium text-gray-900">
                          {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <Scissors className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Dịch vụ</p>
                        <p className="font-medium text-gray-900">{apt.service.name}</p>
                        <p className="text-sm text-gray-500">{apt.service.duration} phút</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Nhân viên</p>
                        <p className="font-medium text-gray-900">{apt.staff.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 md:col-span-2">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Chi nhánh</p>
                        <p className="font-medium text-gray-900">{apt.salon.name}</p>
                        <p className="text-sm text-gray-500">{apt.salon.address}</p>
                      </div>
                    </div>
                  </div>

                  {canCheckIn && (
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleCheckIn(apt.id)}
                        disabled={checkingIn === apt.id}
                        className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {checkingIn === apt.id ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Đang check-in...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Check-in ngay
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {apt.status === 'CHECKED_IN' && apt.checkedInAt && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        Đã check-in lúc: {format(parseISO(apt.checkedInAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
