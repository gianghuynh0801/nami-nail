'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Settings, Clock, Calendar, User, Phone, Save, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale/vi'

const staffSchema = z.object({
  name: z.string().min(1, 'Tên thợ là bắt buộc'),
  phone: z.string().min(1, 'Số điện thoại là bắt buộc'),
})

type StaffFormData = z.infer<typeof staffSchema>

export default function StaffDetailPage() {
  const params = useParams()
  const router = useRouter()
  const salonId = params.id as string
  const staffId = params.staffId as string

  const [staff, setStaff] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [staffServices, setStaffServices] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [durationInputs, setDurationInputs] = useState<Record<string, string>>({})

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
  })

  useEffect(() => {
    fetchData()
  }, [salonId, staffId])

  useEffect(() => {
    if (isServiceModalOpen) {
      fetchStaffServices()
    }
  }, [isServiceModalOpen])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [staffRes, servicesRes, appointmentsRes] = await Promise.all([
        fetch(`/api/salon/${salonId}/staff/${staffId}`),
        fetch(`/api/salon/${salonId}/service`),
        fetch(`/api/appointments?salonId=${salonId}&staffId=${staffId}`),
      ])

      if (staffRes.ok) {
        const staffData = await staffRes.json()
        setStaff(staffData.staff)
        reset({
          name: staffData.staff.name,
          phone: staffData.staff.phone,
        })
      }

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json()
        setServices(servicesData.services || [])
      }

      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json()
        setAppointments(appointmentsData.appointments || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const fetchStaffServices = async () => {
    try {
      const res = await fetch(`/api/salon/${salonId}/staff/${staffId}/service`)
      if (res.ok) {
        const data = await res.json()
        setStaffServices(data.staffServices || [])
        // Initialize duration inputs
        const inputs: Record<string, string> = {}
        services.forEach((service) => {
          const staffService = data.staffServices.find((ss: any) => ss.serviceId === service.id)
          inputs[service.id] = staffService?.duration?.toString() || service.duration.toString()
        })
        setDurationInputs(inputs)
      }
    } catch (error) {
      console.error('Error fetching staff services:', error)
    }
  }

  const onSubmit = async (data: StaffFormData) => {
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/salon/${salonId}/staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Có lỗi xảy ra')
      }

      const updatedData = await res.json()
      setStaff(updatedData.staff)
      alert('Cập nhật thông tin thành công!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStaffService = async (serviceId: string, duration: number) => {
    try {
      const res = await fetch(`/api/salon/${salonId}/staff/${staffId}/service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, duration }),
      })

      if (res.ok) {
        await fetchStaffServices()
        alert('Đã lưu thời gian làm việc!')
      } else {
        const error = await res.json()
        alert(error.error || 'Không thể lưu')
      }
    } catch (error) {
      console.error('Error saving staff service:', error)
      alert('Không thể lưu')
    }
  }

  const handleDeleteStaffService = async (serviceId: string) => {
    if (!confirm('Bạn có chắc muốn xóa cài đặt thời gian này?')) return

    try {
      const res = await fetch(
        `/api/salon/${salonId}/staff/${staffId}/service?serviceId=${serviceId}`,
        {
          method: 'DELETE',
        }
      )

      if (res.ok) {
        await fetchStaffServices()
        setDurationInputs((prev) => {
          const service = services.find((s) => s.id === serviceId)
          return {
            ...prev,
            [serviceId]: service?.duration.toString() || '',
          }
        })
      }
    } catch (error) {
      console.error('Error deleting staff service:', error)
    }
  }

  const getStaffServiceDuration = (serviceId: string) => {
    const staffService = staffServices.find((ss) => ss.serviceId === serviceId)
    return staffService?.duration
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">Đang tải...</div>
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">Không tìm thấy thợ nail</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-primary-400 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        <h1 className="text-3xl font-bold text-primary-400 mb-2">
          Chi tiết thợ nail
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-primary-400 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Thông tin cơ bản
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ tên *
                </label>
                <input
                  {...register('name')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại *
                </label>
                <input
                  {...register('phone')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </form>
          </div>

          {/* Service Durations */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary-400 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Thời gian làm việc cho từng dịch vụ
              </h2>
              <button
                onClick={() => setIsServiceModalOpen(true)}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2 text-sm"
              >
                <Settings className="w-4 h-4" />
                Quản lý
              </button>
            </div>
            {services.length === 0 ? (
              <p className="text-gray-500">Chưa có dịch vụ nào</p>
            ) : (
              <div className="space-y-2">
                {services.map((service) => {
                  const customDuration = getStaffServiceDuration(service.id)
                  return (
                    <div
                      key={service.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{service.name}</p>
                        <p className="text-sm text-gray-600">
                          Mặc định: {service.duration} phút
                          {customDuration && customDuration !== service.duration && (
                            <span className="ml-2 text-blue-600 font-medium">
                              • Thợ này: {customDuration} phút
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Appointments */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-primary-400 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Lịch hẹn ({appointments.length})
            </h2>
            {appointments.length === 0 ? (
              <p className="text-gray-500">Chưa có lịch hẹn nào</p>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 10).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-3 bg-gray-50 rounded-lg border-l-4 border-primary-400"
                  >
                    <p className="font-medium text-sm">{appointment.customerName}</p>
                    <p className="text-xs text-gray-600">{appointment.service.name}</p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(appointment.startTime), 'dd/MM/yyyy HH:mm', {
                        locale: vi,
                      })}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                        appointment.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-700'
                          : appointment.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-700'
                          : appointment.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {appointment.status === 'PENDING'
                        ? 'Chờ xác nhận'
                        : appointment.status === 'CONFIRMED'
                        ? 'Đã xác nhận'
                        : appointment.status === 'CANCELLED'
                        ? 'Đã hủy'
                        : 'Hoàn thành'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-primary-400 mb-4">Thông tin nhanh</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Tên</p>
                <p className="font-medium">{staff.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Số điện thoại</p>
                <p className="font-medium">{staff.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tổng lịch hẹn</p>
                <p className="font-medium">{appointments.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Duration Management Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Quản lý thời gian làm việc - {staff.name}
              </h2>
              <button
                onClick={() => {
                  setIsServiceModalOpen(false)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Đặt thời gian làm việc riêng cho từng dịch vụ. Nếu không đặt, hệ thống sẽ dùng
                thời gian mặc định của dịch vụ.
              </p>

              {services.map((service) => {
                const customDuration = getStaffServiceDuration(service.id)
                const duration = durationInputs[service.id] || service.duration.toString()

                return (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{service.name}</p>
                      <p className="text-sm text-gray-600">
                        Mặc định: {service.duration} phút
                        {customDuration && customDuration !== service.duration && (
                          <span className="ml-2 text-blue-600">Custom: {customDuration} phút</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={duration}
                        onChange={(e) => {
                          setDurationInputs((prev) => ({
                            ...prev,
                            [service.id]: e.target.value,
                          }))
                        }}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder={service.duration.toString()}
                      />
                      <span className="text-sm text-gray-600">phút</span>
                      <button
                        onClick={() => {
                          const dur = parseInt(duration)
                          if (dur > 0) {
                            handleSaveStaffService(service.id, dur)
                          }
                        }}
                        className="px-4 py-2 text-sm bg-primary-400 text-white rounded-lg hover:bg-primary-500"
                      >
                        Lưu
                      </button>
                      {customDuration && (
                        <button
                          onClick={() => {
                            handleDeleteStaffService(service.id)
                          }}
                          className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

