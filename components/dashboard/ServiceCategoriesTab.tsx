'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react'

const categorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục là bắt buộc'),
  description: z.string().optional().or(z.literal('')),
  order: z.number().int(),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface ServiceCategory {
  id: string
  name: string
  description?: string
  order: number
  serviceIds: string[]
}

interface Service {
  id: string
  name: string
  price: number
  duration: number
}

export default function ServiceCategoriesTab({ salonId }: { salonId: string }) {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [assigningCategoryId, setAssigningCategoryId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      order: 0,
    },
  })

  useEffect(() => {
    fetchCategories()
    fetchServices()
  }, [salonId])

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/salon/${salonId}/service-category`)
      if (res.ok) {
        const data = await res.json()
        // Transform categories to include serviceIds array
        const transformedCategories = (data.categories || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          order: cat.order,
          serviceIds: cat.services?.map((sc: any) => sc.serviceId) || [],
        }))
        setCategories(transformedCategories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

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

  const onSubmit = async (data: CategoryFormData) => {
    setLoading(true)
    setError('')

    try {
      const url = editingId
        ? `/api/salon/${salonId}/service-category/${editingId}`
        : `/api/salon/${salonId}/service-category`
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Có lỗi xảy ra')
      }

      reset()
      setEditingId(null)
      fetchCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category: ServiceCategory) => {
    setEditingId(category.id)
    setError('')
    setAssigningCategoryId(null) // Close any open assign section
    
    // Use setValue to ensure form is updated
    setValue('name', category.name)
    setValue('description', category.description || '')
    setValue('order', category.order)
    
    // Also reset to ensure form state is correct
    reset({
      name: category.name,
      description: category.description || '',
      order: category.order,
    })
    
    // Scroll to form
    setTimeout(() => {
      const formElement = document.getElementById('category-form')
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // Focus on first input
        const firstInput = formElement.querySelector('input')
        if (firstInput) {
          firstInput.focus()
        }
      }
    }, 100)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return

    try {
      const res = await fetch(`/api/salon/${salonId}/service-category/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchCategories()
      }
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  const handleAssignServices = async (categoryId: string, serviceIds: string[]) => {
    try {
      const res = await fetch(`/api/salon/${salonId}/service-category/${categoryId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceIds }),
      })

      if (res.ok) {
        fetchCategories()
        setAssigningCategoryId(null)
      }
    } catch (error) {
      console.error('Error assigning services:', error)
    }
  }

  return (
    <div className="space-y-6">
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className={`bg-pastel-pink-light p-4 rounded-lg space-y-4 transition-all ${
          editingId ? 'ring-2 ring-primary-400 shadow-lg' : ''
        }`}
        id="category-form"
      >
        {editingId && (
          <div className="bg-primary-50 border border-primary-200 text-primary-700 px-4 py-2 rounded-lg text-sm font-medium">
            Đang chỉnh sửa: {categories.find(c => c.id === editingId)?.name}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên danh mục *
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
              Mô tả
            </label>
            <input
              {...register('description')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Mô tả ngắn..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thứ tự hiển thị
            </label>
            <input
              type="number"
              {...register('order', { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              defaultValue={0}
            />
            {errors.order && (
              <p className="text-red-500 text-sm mt-1">{errors.order.message}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50"
        >
          {editingId ? 'Cập nhật' : 'Thêm danh mục'}
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

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Danh sách danh mục</h3>
        {categories.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Chưa có danh mục nào</p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{category.name}</h4>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Thứ tự: {category.order} • {(category.serviceIds || []).length} dịch vụ
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                    title="Sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setAssigningCategoryId(assigningCategoryId === category.id ? null : category.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Gán dịch vụ"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Assign services section */}
              {assigningCategoryId === category.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Gán dịch vụ vào danh mục này:</p>
                    <button
                      onClick={() => setAssigningCategoryId(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Đóng
                    </button>
                  </div>
                  
                  {services.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Chưa có dịch vụ nào</p>
                  ) : (
                    <>
                      <div className="max-h-60 overflow-y-auto space-y-2 mb-3">
                        {services.map((service) => {
                          const serviceIds = category.serviceIds || []
                          const isAssigned = serviceIds.includes(service.id)
                          return (
                            <label
                              key={service.id}
                              className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer border border-transparent hover:border-primary-200"
                            >
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={(e) => {
                                  const newServiceIds = e.target.checked
                                    ? [...serviceIds, service.id]
                                    : serviceIds.filter(id => id !== service.id)
                                  handleAssignServices(category.id, newServiceIds)
                                }}
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700 flex-1">
                                {service.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {service.duration} phút • {new Intl.NumberFormat('vi-VN').format(service.price)}đ
                              </span>
                              {isAssigned && (
                                <Check className="w-4 h-4 text-primary-600" />
                              )}
                            </label>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Đã chọn: {(category.serviceIds || []).length} / {services.length} dịch vụ
                        </p>
                        <button
                          onClick={() => setAssigningCategoryId(null)}
                          className="px-4 py-2 text-sm bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors"
                        >
                          Hoàn tất
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Show assigned services */}
              {(category.serviceIds || []).length > 0 && assigningCategoryId !== category.id && (
                <div 
                  className="mt-3 pt-3 border-t border-gray-100 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                  onClick={() => setAssigningCategoryId(category.id)}
                  title="Click để chỉnh sửa dịch vụ"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500 font-medium">Dịch vụ trong danh mục:</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setAssigningCategoryId(category.id)
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 hover:underline font-medium"
                    >
                      Chỉnh sửa
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(category.serviceIds || []).map(serviceId => {
                      const service = services.find(s => s.id === serviceId)
                      return service ? (
                        <span
                          key={serviceId}
                          className="px-2 py-1 text-xs bg-primary-50 text-primary-700 rounded border border-primary-200"
                        >
                          {service.name}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
              )}
              
              {/* Show message if no services assigned */}
              {(category.serviceIds || []).length === 0 && assigningCategoryId !== category.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 italic">Chưa có dịch vụ nào trong danh mục này</p>
                  <button
                    onClick={() => setAssigningCategoryId(category.id)}
                    className="mt-2 text-xs text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    + Thêm dịch vụ
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
