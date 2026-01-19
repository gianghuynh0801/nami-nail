'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useSalonContext } from '@/contexts/SalonContext'

interface Staff {
  id: string
  name: string
  phone?: string
}

interface StaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  staff?: Staff | null
}

export default function StaffModal({ isOpen, onClose, onSuccess, staff }: StaffModalProps) {
  const { selectedSalon } = useSalonContext()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name,
        phone: staff.phone || '',
      })
    } else {
      setFormData({
        name: '',
        phone: '',
      })
    }
  }, [staff, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSalon?.id) return

    setLoading(true)
    try {
      const url = staff
        ? `/api/salon/${selectedSalon.id}/staff/${staff.id}`
        : `/api/salon/${selectedSalon.id}/staff`
      
      const method = staff ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error('Failed to save staff')
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving staff:', error)
      alert('Có lỗi xảy ra khi lưu thông tin nhân viên')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">
            {staff ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên nhân viên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Nhập tên nhân viên"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : (staff ? 'Cập nhật' : 'Thêm mới')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
