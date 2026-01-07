'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Settings } from 'lucide-react'

export default function CreateStaffPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [serviceDurations, setServiceDurations] = useState<Record<string, string>>({})
  const [showServiceSettings, setShowServiceSettings] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [params.id])

  const fetchServices = async () => {
    try {
      const res = await fetch(`/api/salon/${params.id}/service`)
      if (res.ok) {
        const data = await res.json()
        setServices(data.services || [])
        // Initialize durations with default service durations
        const durations: Record<string, string> = {}
        data.services?.forEach((service: any) => {
          durations[service.id] = service.duration.toString()
        })
        setServiceDurations(durations)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // First create the staff
      const response = await fetch(`/api/salon/${params.id}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Đã có lỗi xảy ra')
        setLoading(false)
        return
      }

      const staffId = data.staff.id

      // Then save service durations if any are different from default
      if (showServiceSettings && services.length > 0) {
        const savePromises = services.map(async (service) => {
          const customDuration = parseInt(serviceDurations[service.id] || service.duration.toString())
          // Only save if different from default
          if (customDuration !== service.duration) {
            try {
              await fetch(`/api/salon/${params.id}/staff/${staffId}/service`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  serviceId: service.id,
                  duration: customDuration,
                }),
              })
            } catch (error) {
              console.error(`Error saving duration for service ${service.id}:`, error)
            }
          }
        })
        await Promise.all(savePromises)
      }

      router.push(`/dashboard/salon/${params.id}/manage?tab=staff`)
    } catch (error) {
      setError('Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-primary-400 mb-6">
        Thêm thợ nail mới
      </h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
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
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số điện thoại *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Service Duration Settings */}
        {services.length > 0 && (
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowServiceSettings(!showServiceSettings)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-600 mb-4"
            >
              <Settings className="w-4 h-4" />
              {showServiceSettings ? 'Ẩn' : 'Hiện'} cài đặt thời gian làm việc cho từng dịch vụ
            </button>

            {showServiceSettings && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-gray-600 mb-3">
                  Đặt thời gian làm việc riêng cho từng dịch vụ. Nếu không đặt, hệ thống sẽ dùng thời gian mặc định của dịch vụ.
                </p>
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-500">
                        Mặc định: {service.duration} phút
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={serviceDurations[service.id] || service.duration.toString()}
                        onChange={(e) => {
                          setServiceDurations((prev) => ({
                            ...prev,
                            [service.id]: e.target.value,
                          }))
                        }}
                        className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-600">phút</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang thêm...' : 'Thêm thợ'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  )
}

