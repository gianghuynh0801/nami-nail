'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, FolderOpen } from 'lucide-react'
import ServiceGroupList from '@/components/services/ServiceGroupList'
import ServiceGroupModal from '@/components/services/ServiceGroupModal'
import AddTypeSelector from '@/components/services/AddTypeSelector'
import CategoryModal from '@/components/services/CategoryModal'
import { useSalonContext } from '@/contexts/SalonContext'

interface ServiceCategory {
  id: string
  name: string
}

export default function ServicesPage() {
  const { selectedSalonId, selectedSalon, loading: salonLoading } = useSalonContext()
  const [groups, setGroups] = useState([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)

  // Fetch data when salon changes
  useEffect(() => {
    if (selectedSalonId) {
      fetchData(selectedSalonId)
    } else {
      setLoading(false)
    }
  }, [selectedSalonId])

  const fetchData = async (salonId: string) => {
    setLoading(true)
    try {
      // Fetch both categories and service groups
      const [categoriesRes, groupsRes] = await Promise.all([
        fetch(`/api/salon/${salonId}/service-category`),
        fetch(`/api/service-groups?salonId=${salonId}`)
      ])

      if (categoriesRes.ok) {
        const catData = await categoriesRes.json()
        setCategories(catData.categories || [])
      }

      if (groupsRes.ok) {
        const grpData = await groupsRes.json()
        setGroups(grpData.serviceGroups || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddClick = () => {
    setShowTypeSelector(true)
  }

  const handleSelectService = () => {
    setEditingGroup(null)
    setShowServiceModal(true)
  }

  const handleSelectCategory = () => {
    setShowCategoryModal(true)
  }

  const handleEdit = (group: any) => {
    setEditingGroup(group)
    setShowServiceModal(true)
  }

  const handleSuccess = () => {
    if (selectedSalonId) {
      fetchData(selectedSalonId)
    }
  }

  const handleDelete = async (groupId: string) => {
    try {
      const res = await fetch(`/api/service-groups/${groupId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete')
      handleSuccess() // Refresh the list
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('Lỗi khi xóa dịch vụ')
    }
  }

  if (salonLoading) {
    return <div className="p-8 text-center">Đang tải...</div>
  }

  if (!selectedSalonId) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Vui lòng chọn chi nhánh từ menu trên cùng.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dịch vụ</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý danh mục và dịch vụ của bạn</p>
          </div>
          <button
            onClick={handleAddClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-5 h-5" />
            Thêm mới
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm dịch vụ..." 
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">Đang tải dịch vụ...</div>
        ) : (
          <ServiceGroupList 
            groups={groups}
            categories={categories}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

      </div>

      {/* Add Type Selector Modal */}
      <AddTypeSelector
        isOpen={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        onSelectService={handleSelectService}
        onSelectCategory={handleSelectCategory}
      />

      {/* Category Modal */}
      {selectedSalonId && (
        <CategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSuccess={handleSuccess}
          salonId={selectedSalonId}
        />
      )}

      {/* Service Group Modal */}
      {showServiceModal && selectedSalonId && (
        <ServiceGroupModal
          isOpen={showServiceModal}
          onClose={() => setShowServiceModal(false)}
          onSuccess={handleSuccess}
          salonId={selectedSalonId}
          initialData={editingGroup}
        />
      )}
    </div>
  )
}
