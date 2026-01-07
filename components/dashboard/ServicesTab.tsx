'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import ServiceCategoriesTab from './ServiceCategoriesTab'

const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  price: z.number().min(0, 'Price must be greater than 0'),
  duration: z.number().min(1, 'Duration must be greater than 0'),
})

type ServiceFormData = z.infer<typeof serviceSchema>

type SubTab = 'services' | 'categories'

export default function ServicesTab({ salonId, onUpdate }: { salonId: string; onUpdate: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('services')
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
  })

  useEffect(() => {
    if (activeSubTab === 'services') {
      fetchServices()
    }
  }, [salonId, activeSubTab])

  const fetchServices = async () => {
    try {
      const res = await fetch(`/api/salon/${salonId}/service`)
      if (res.ok) {
        const data = await res.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const onSubmit = async (data: ServiceFormData) => {
    setLoading(true)
    setError('')

    try {
      const url = editingId
        ? `/api/salon/${salonId}/service/${editingId}`
        : `/api/salon/${salonId}/service`
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
      fetchServices()
      onUpdate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (service: any) => {
    setEditingId(service.id)
    reset({
      name: service.name,
      price: service.price,
      duration: service.duration,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return

    try {
      const res = await fetch(`/api/salon/${salonId}/service/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchServices()
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting service:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveSubTab('services')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'services'
                ? 'border-primary-400 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Danh sách dịch vụ
          </button>
          <button
            onClick={() => setActiveSubTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'categories'
                ? 'border-primary-400 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Danh mục dịch vụ
          </button>
        </nav>
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'services' && (
        <>
          <form onSubmit={handleSubmit(onSubmit)} className="bg-pastel-pink-light p-4 rounded-lg space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên dịch vụ *
                </label>
                <input
                  {...register('name')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Ví dụ: Làm móng, Sơn móng..."
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá (VNĐ) *
                </label>
                <input
                  type="number"
                  {...register('price', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thời gian (phút) *
                </label>
                <input
                  type="number"
                  {...register('duration', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="60"
                />
                {errors.duration && (
                  <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50"
            >
              {editingId ? 'Cập nhật' : 'Thêm dịch vụ'}
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
                Hủy
              </button>
            )}
          </form>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">Danh sách dịch vụ</h3>
            {services.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Chưa có dịch vụ nào</p>
            ) : (
              services.map((service) => (
                <div
                  key={service.id}
                  className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-gray-600">
                      {service.duration} phút - {new Intl.NumberFormat('vi-VN').format(service.price)}đ
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(service)}
                      className="px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeSubTab === 'categories' && (
        <ServiceCategoriesTab salonId={salonId} />
      )}
    </div>
  )
}
