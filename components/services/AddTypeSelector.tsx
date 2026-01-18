'use client'

import { X, Sparkles, Package, FolderOpen } from 'lucide-react'

interface AddTypeSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectService: () => void
  onSelectCategory: () => void
}

export default function AddTypeSelector({
  isOpen,
  onClose,
  onSelectService,
  onSelectCategory
}: AddTypeSelectorProps) {
  if (!isOpen) return null

  const options = [
    {
      id: 'service',
      icon: Sparkles,
      title: 'Dịch vụ',
      description: 'Mỗi dịch vụ chỉ bao gồm một liệu trình cho mỗi lần đặt chỗ - rất tiện lợi và đơn giản.',
      onClick: onSelectService
    },
    {
      id: 'category',
      icon: FolderOpen,
      title: 'Danh mục dịch vụ',
      description: 'Các danh mục dịch vụ giúp phân chia dịch vụ một cách hiệu quả, nhờ đó khách hàng có thể tìm thấy những gì họ đang tìm kiếm nhanh hơn.',
      onClick: onSelectCategory
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Thêm mới...</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onClose()
                option.onClick()
              }}
              className="w-full text-left p-4 rounded-xl hover:bg-primary-50 transition-colors flex items-start gap-4 group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <option.icon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{option.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
