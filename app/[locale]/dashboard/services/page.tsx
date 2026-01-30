'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Search } from 'lucide-react'
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
  const t = useTranslations('DashboardPages.services')
  const { selectedSalonId, selectedSalon, loading: salonLoading } = useSalonContext()
  const [groups, setGroups] = useState([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)

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
    setEditingCategory(null)
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

  const handleEditCategory = (category: ServiceCategory) => {
    setEditingCategory(category)
    setShowCategoryModal(true)
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!selectedSalonId) return
    if (!confirm(t('confirmDeleteCategory'))) return

    try {
      const res = await fetch(`/api/salon/${selectedSalonId}/service-category/${categoryId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete category')
      handleSuccess()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert(t('errorDeleteCategory'))
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
      alert(t('errorDeleteService'))
    }
  }

  if (salonLoading) {
    return <div className="p-8 text-center">{t('loading')}</div>
  }

  if (!selectedSalonId) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">{t('selectBranch')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
          <button
            onClick={handleAddClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-5 h-5" />
            {t('addNew')}
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={t('searchPlaceholder')} 
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">{t('loadingServices')}</div>
        ) : (
          <ServiceGroupList 
            groups={groups}
            categories={categories}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
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
          onClose={() => {
            setShowCategoryModal(false)
            setEditingCategory(null)
          }}
          onSuccess={handleSuccess}
          salonId={selectedSalonId}
          initialData={editingCategory}
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
