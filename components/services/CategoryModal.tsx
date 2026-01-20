'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  salonId: string
  initialData?: { id: string; name: string } | null
}

export default function CategoryModal({ isOpen, onClose, onSuccess, salonId, initialData }: CategoryModalProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [loading, setLoading] = useState(false)

  // Reset name when initialData changes or modal opens
  useState(() => {
    if (isOpen) {
      setName(initialData?.name || '')
    }
  })

  // Also update when initialData prop updates directly
  const [prevInitialData, setPrevInitialData] = useState(initialData)
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData)
    setName(initialData?.name || '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const url = initialData 
        ? `/api/salon/${salonId}/service-category/${initialData.id}`
        : `/api/salon/${salonId}/service-category`
      
      const method = initialData ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      })

      if (!res.ok) throw new Error('Failed to save category')

      setName('')
      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      alert('Lỗi khi lưu danh mục')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-bold">{initialData ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên danh mục <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ví dụ: Làm móng tay"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Thêm mới')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
