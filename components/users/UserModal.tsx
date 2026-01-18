'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Check } from 'lucide-react'
import { PERMISSIONS, DEFAULT_PERMISSIONS } from '@/lib/permissions'

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF', 'CUSTOMER']),
  staffId: z.string().optional(),
})

type UserFormData = z.infer<typeof userSchema>

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user?: any
}

export default function UserModal({ isOpen, onClose, onSuccess, user }: UserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [availableStaff, setAvailableStaff] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'STAFF',
    }
  })

  const selectedRole = watch('role')

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        phone: user.phone || '',
        email: user.email || '',
        role: user.role,
        staffId: user.staff?.id || '',
      })
      setSelectedPermissions(user.permissions || [])
    } else {
      reset({
        role: 'STAFF',
        name: '',
        phone: '',
        email: '',
        password: '',
      })
      setSelectedPermissions(DEFAULT_PERMISSIONS.STAFF)
    }
    fetchStaff()
  }, [user, isOpen])

  // Update default permissions when role changes (only for new users)
  useEffect(() => {
    if (!user && selectedRole) {
      setSelectedPermissions(DEFAULT_PERMISSIONS[selectedRole])
    }
  }, [selectedRole, user])

  const fetchStaff = async () => {
    try {
      // We need a route to fetch all staff for linking. 
      // For now, let's assume we can hit the salon endpoint or a specific all-staff endpoint.
      // Since we don't have a "get all staff across all salons" easily exposed yet without salonId,
      // I'll fetch salons first then their staff, or just rely on a new endpoint.
      // To keep it simple for now, I'll fetch salons and aggregate.
      
      const res = await fetch('/api/salon') // This returns salons with counts, maybe not full staff?
      // Actually /api/salon returns minimal info.
      // Let's rely on the user manually selecting salon context later or
      // Assume the user manager is usually for a specific salon? No, users are global.
      // Let's Try to fetch from a new endpoint or update existing.
      // UPDATE: I'll invoke /api/salon first, then fetch staff for the first salon or all.
      // Better: I'll update the API to allow fetching all staff if needed, but for now
      // let's fetch the first salon's staff as a fallback if we can't get all.
      // Actually, looking at the previous file views, we can fetch /api/salon which returns salons.
      // Then fetch /api/salon/[id] to get staff.
      
      const salonRes = await fetch('/api/salon')
      if (salonRes.ok) {
        const { salons } = await salonRes.json()
        let allStaff: any[] = []
        for (const salon of salons) {
          const detailRes = await fetch(`/api/salon/${salon.id}`)
          if (detailRes.ok) {
            const { salon: detail } = await detailRes.json()
            if (detail.staff) {
              const staffWithSalon = detail.staff.map((s: any) => ({
                ...s,
                salonName: detail.name
              }))
              allStaff = [...allStaff, ...staffWithSalon]
            }
          }
        }
        setAvailableStaff(allStaff)
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const onSubmit = async (data: UserFormData) => {
    setLoading(true)
    setError('')

    try {
      const url = user ? `/api/users/${user.id}` : '/api/users'
      const method = user ? 'PATCH' : 'POST'

      // Validate required fields based on logic
      if (!user && !data.password && data.role !== 'CUSTOMER') {
        throw new Error('Password is required for new users')
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          permissions: selectedPermissions,
          email: data.email || undefined, // Send undefined if empty string
          phone: data.phone || undefined,
          password: data.password || undefined,
          staffId: data.staffId || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'An error occurred')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {user ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ và tên *
              </label>
              <input
                {...register('name')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Nhập tên người dùng"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vai trò
              </label>
              <select
                {...register('role')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="STAFF">Nhân viên</option>
                <option value="MANAGER">Quản lý</option>
                <option value="OWNER">Chủ tiệm</option>
                <option value="CUSTOMER">Khách hàng</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại
              </label>
              <input
                {...register('phone')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="0912345678"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                {...register('email')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu {user && '(Để trống nếu không đổi)'}
              </label>
              <input
                type="password"
                {...register('password')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder={user ? "********" : "Nhập mật khẩu"}
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {selectedRole === 'STAFF' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Liên kết hồ sơ Nhân viên
                </label>
                <select
                  {...register('staffId')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {availableStaff.map((staff) => (
                    <option 
                      key={staff.id} 
                      value={staff.id}
                      disabled={staff.userId && staff.userId !== user?.id}
                    >
                      {staff.name} - {staff.salonName} {staff.userId && staff.userId !== user?.id ? '(Đã liên kết)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Liên kết tài khoản này với một hồ sơ nhân viên để tính lương/ca làm.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Phân quyền</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(PERMISSIONS).map(([key, value]) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPermissions.includes(value)
                      ? 'bg-primary-50 border-primary-200'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-0.5 ${
                      selectedPermissions.includes(value)
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {selectedPermissions.includes(value) && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedPermissions.includes(value)}
                    onChange={() => togglePermission(value)}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">
                      {key.replace(/_/g, ' ')}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50 font-medium min-w-[100px]"
            >
              {loading ? 'Đang lưu...' : user ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
