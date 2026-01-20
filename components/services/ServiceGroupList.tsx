'use client'

import { useState } from 'react'
import { Edit2, ChevronDown, ChevronRight, Sparkles, FolderOpen, Trash2 } from 'lucide-react'

interface ServiceVariant {
  id: string
  name: string
  duration: number
  price: number
}

interface ServiceGroup {
  id: string
  name: string
  description?: string
  categoryId?: string | null
  category?: { id: string; name: string } | null
  services: ServiceVariant[]
}

interface Category {
  id: string
  name: string
}

interface ServiceGroupListProps {
  groups: ServiceGroup[]
  categories: Category[]
  onEdit: (group: ServiceGroup) => void
  onDelete: (groupId: string) => void
  onAddToCategory?: (categoryId: string) => void
  onEditCategory?: (category: Category) => void
  onDeleteCategory?: (categoryId: string) => void
}

// Helper to format duration
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} Tiêu chuẩn`
  return `${hours} Tiêu chuẩn. ${mins.toString().padStart(2, '0')} phút`
}

export default function ServiceGroupList({ 
  groups, 
  categories, 
  onEdit, 
  onDelete, 
  onAddToCategory,
  onEditCategory,
  onDeleteCategory 
}: ServiceGroupListProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const toggleExpand = (id: string) => {
    setExpandedGroups(prev => 
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    )
  }

  if (groups.length === 0 && categories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">Chưa có dịch vụ nào</p>
        <p className="text-sm mt-1">Bấm "Thêm mới" để tạo danh mục hoặc dịch vụ.</p>
      </div>
    )
  }

  // Group services by their categoryId
  const servicesByCategory = new Map<string | null, ServiceGroup[]>()
  
  groups.forEach(group => {
    const catId = group.categoryId || null
    if (!servicesByCategory.has(catId)) {
      servicesByCategory.set(catId, [])
    }
    servicesByCategory.get(catId)!.push(group)
  })

  // Get uncategorized services
  const uncategorizedServices = servicesByCategory.get(null) || []

  // Render service row helper
  const renderServiceRow = (group: ServiceGroup) => {
    const isExpanded = expandedGroups.includes(group.id)
    
    return (
      <div key={group.id}>
        {/* Service Row */}
        <div 
          className="px-6 py-4 flex items-start justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleExpand(group.id)}
        >
          <div className="flex items-start gap-3 flex-1">
            <button className="mt-1 text-gray-400">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary-500 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">{group.name}</h4>
                {/* Show variants summary when collapsed */}
                {!isExpanded && group.services.length > 0 && (
                  <div className="mt-1 text-sm text-gray-500 space-y-0.5">
                    {group.services.slice(0, 3).map((variant, idx) => (
                      <div key={idx}>{variant.name}</div>
                    ))}
                    {group.services.length > 3 && (
                      <div className="text-gray-400">+{group.services.length - 3} thêm</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action buttons only - no price/duration summary */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(group)
              }}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
              title="Chỉnh sửa"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Bạn có chắc muốn xóa dịch vụ "${group.name}"?`)) {
                  onDelete(group.id)
                }
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Xóa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded Variants */}
        {isExpanded && group.services.length > 0 && (
          <div className="bg-gray-50/50 border-t">
            {group.services.map((variant) => (
              <div 
                key={variant.id} 
                className="px-6 py-3 flex items-center justify-between hover:bg-gray-100/50 ml-12"
              >
                <span className="text-gray-700">{variant.name || 'Standard'}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500 min-w-[100px] text-right">
                    {formatDuration(variant.duration)}
                  </span>
                  <span className="font-medium text-gray-900 min-w-[60px] text-right">
                    {variant.price} €
                  </span>
                  <div className="w-20"></div> {/* Spacer for alignment */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Categories with their services */}
      {categories.map((category) => {
        const categoryServices = servicesByCategory.get(category.id) || []
        
        return (
          <div key={category.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Category Header */}
            <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-lg">=</span>
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {onEditCategory && (
                  <button
                    onClick={() => onEditCategory(category)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Chỉnh sửa danh mục"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {onDeleteCategory && (
                  <button
                    onClick={() => onDeleteCategory(category.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa danh mục"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {onAddToCategory && (
                  <button
                    onClick={() => onAddToCategory(category.id)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1 border border-primary-200 rounded-lg hover:bg-primary-50 ml-2"
                  >
                    Thêm vào danh mục
                  </button>
                )}
              </div>
            </div>
            
            {/* Services in this category */}
            <div className="divide-y">
              {categoryServices.length > 0 ? (
                categoryServices.map(group => renderServiceRow(group))
              ) : (
                <div className="px-6 py-3 text-gray-400 text-sm italic">
                  Chưa có dịch vụ trong danh mục này
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Uncategorized Services */}
      {uncategorizedServices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-900">Dịch vụ chưa phân loại</h3>
          </div>
          
          <div className="divide-y">
            {uncategorizedServices.map(group => renderServiceRow(group))}
          </div>
        </div>
      )}
    </div>
  )
}
