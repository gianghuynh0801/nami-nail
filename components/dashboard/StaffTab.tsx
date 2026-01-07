'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Clock, Settings } from 'lucide-react'

const staffSchema = z.object({
  name: z.string().min(1, 'Staff name is required'),
  phone: z.string().min(1, 'Phone number is required'),
})

type StaffFormData = z.infer<typeof staffSchema>

export default function StaffTab({ salonId, onUpdate }: { salonId: string; onUpdate: () => void }) {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [staffServices, setStaffServices] = useState<any[]>([])
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
    fetchStaff()
    fetchServices()
  }, [salonId])

  useEffect(() => {
    if (selectedStaffId) {
      fetchStaffServices()
    }
  }, [selectedStaffId])

  const fetchStaff = async () => {
    try {
      const res = await fetch(`/api/salon/${salonId}/staff`)
      if (res.ok) {
        const data = await res.json()
        setStaff(data.staff || [])
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const onSubmit = async (data: StaffFormData) => {
    setLoading(true)
    setError('')

    try {
      const url = editingId
        ? `/api/salon/${salonId}/staff/${editingId}`
        : `/api/salon/${salonId}/staff`
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
      fetchStaff()
      onUpdate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (staffMember: any) => {
    setEditingId(staffMember.id)
    reset({
      name: staffMember.name,
      phone: staffMember.phone,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return

    try {
      const res = await fetch(`/api/salon/${salonId}/staff/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchStaff()
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting staff:', error)
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

  const fetchStaffServices = async () => {
    if (!selectedStaffId) return
    try {
      const res = await fetch(`/api/salon/${salonId}/staff/${selectedStaffId}/service`)
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

  const handleManageServices = (staffId: string) => {
    setSelectedStaffId(staffId)
    setIsServiceModalOpen(true)
    // Initialize duration inputs with default service durations
    const inputs: Record<string, string> = {}
    services.forEach((service) => {
      inputs[service.id] = service.duration.toString()
    })
    setDurationInputs(inputs)
  }

  const handleSaveStaffService = async (serviceId: string, duration: number) => {
    if (!selectedStaffId) return

    try {
      const res = await fetch(`/api/salon/${salonId}/staff/${selectedStaffId}/service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, duration }),
      })

      if (res.ok) {
        await fetchStaffServices()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save')
      }
    } catch (error) {
      console.error('Error saving staff service:', error)
      alert('Failed to save')
    }
  }

  const handleDeleteStaffService = async (serviceId: string) => {
    if (!selectedStaffId) return
    if (!confirm('Are you sure you want to remove this service duration setting?')) return

    try {
      const res = await fetch(
        `/api/salon/${salonId}/staff/${selectedStaffId}/service?serviceId=${serviceId}`,
        {
          method: 'DELETE',
        }
      )

      if (res.ok) {
        fetchStaffServices()
      }
    } catch (error) {
      console.error('Error deleting staff service:', error)
    }
  }

  const getStaffServiceDuration = (serviceId: string) => {
    const staffService = staffServices.find((ss) => ss.serviceId === serviceId)
    return staffService?.duration
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-pastel-yellow p-4 rounded-lg space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff Name
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
              Phone Number
            </label>
            <input
              {...register('phone')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50"
        >
          {editingId ? 'Update' : 'Add Staff'}
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
        {staff.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Chưa có thợ nail nào. Hãy thêm thợ nail để bắt đầu.</p>
        ) : (
          staff.map((staffMember) => (
            <div
              key={staffMember.id}
              className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div>
                <p className="font-medium text-gray-900">{staffMember.name}</p>
                <p className="text-sm text-gray-600">{staffMember.phone}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleManageServices(staffMember.id)}
                  className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1 transition-colors font-medium"
                  title="Quản lý thời gian làm việc cho từng dịch vụ"
                >
                  <Settings className="w-4 h-4" />
                  Quản lý dịch vụ
                </button>
                <button
                  onClick={() => handleEdit(staffMember)}
                  className="px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(staffMember.id)}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Service Duration Management Modal */}
      {isServiceModalOpen && selectedStaffId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Manage Service Durations - {staff.find((s) => s.id === selectedStaffId)?.name}
              </h2>
              <button
                onClick={() => {
                  setIsServiceModalOpen(false)
                  setSelectedStaffId(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Set custom duration for each service. If not set, the default service duration will be used.
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
                        Default: {service.duration} min
                        {customDuration && customDuration !== service.duration && (
                          <span className="ml-2 text-blue-600">Custom: {customDuration} min</span>
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
                      <span className="text-sm text-gray-600">min</span>
                      <button
                        onClick={() => {
                          const dur = parseInt(duration)
                          if (dur > 0) {
                            handleSaveStaffService(service.id, dur)
                          }
                        }}
                        className="px-4 py-2 text-sm bg-primary-400 text-white rounded-lg hover:bg-primary-500"
                      >
                        Save
                      </button>
                      {customDuration && (
                        <button
                          onClick={() => {
                            handleDeleteStaffService(service.id)
                            setDurationInputs((prev) => ({
                              ...prev,
                              [service.id]: service.duration.toString(),
                            }))
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

