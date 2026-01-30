'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Search, Edit, Trash2, Phone } from 'lucide-react'
import { useSalonContext } from '@/contexts/SalonContext'
import StaffModal from '@/components/staff/StaffModal'

interface Staff {
  id: string
  name: string
  phone?: string
  createdAt: string
}

export default function StaffPage() {
  const t = useTranslations('DashboardPages.staff')
  const { selectedSalonId, loading: salonLoading } = useSalonContext()
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)

  useEffect(() => {
    if (selectedSalonId) {
      fetchStaff()
    } else {
      setLoading(false)
    }
  }, [selectedSalonId])

  const fetchStaff = async () => {
    if (!selectedSalonId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/salon/${selectedSalonId}/staff`)
      if (res.ok) {
        const data = await res.json()
        setStaffList(data.staff || [])
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddClick = () => {
    setEditingStaff(null)
    setIsModalOpen(true)
  }

  const handleEditClick = (staff: Staff) => {
    setEditingStaff(staff)
    setIsModalOpen(true)
  }

  const handleDeleteClick = async (staffId: string) => {
    if (!selectedSalonId) return
    if (!confirm(t('confirmDelete'))) return

    try {
      const res = await fetch(`/api/salon/${selectedSalonId}/staff/${staffId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchStaff()
      } else {
        alert(t('cannotDelete'))
      }
    } catch (error) {
      console.error('Error deleting staff:', error)
      alert(t('errorDelete'))
    }
  }

  const handleModalSuccess = () => {
    fetchStaff()
    setIsModalOpen(false)
  }

  const filteredStaff = staffList.filter(staff => 
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staff.phone && staff.phone.includes(searchQuery))
  )

  if (salonLoading) return <div className="p-8 text-center text-gray-500">{t('loading')}</div>

  if (!selectedSalonId) {
    return (
      <div className="p-8 text-center bg-gray-50 min-h-screen flex flex-col justify-center items-center">
        <p className="text-gray-500 mb-4">{t('selectBranchHint')}</p>
      </div>
    )
  }

  const STAFF_COLORS = [
    'bg-amber-100 text-amber-800',
    'bg-blue-100 text-blue-800',
    'bg-rose-100 text-rose-800',
    'bg-emerald-100 text-emerald-800',
    'bg-purple-100 text-purple-800',
  ]

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-5 h-5" />
            {t('addStaff')}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Staff List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              <p className="mt-4 text-gray-500">{t('loadingList')}</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {searchQuery ? t('noResults') : t('noStaffYet')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('info')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('contact')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStaff.map((staff, index) => {
                     const colorClass = STAFF_COLORS[index % STAFF_COLORS.length]
                     return (
                      <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${colorClass}`}>
                              {staff.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                              <div className="text-xs text-gray-500">ID: {staff.id.slice(-6)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {staff.phone ? (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              {staff.phone}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">{t('noPhone')}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditClick(staff)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                            title={t('edit')}
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(staff.id)}
                            className="text-red-600 hover:text-red-900"
                            title={t('delete')}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        staff={editingStaff}
      />
    </div>
  )
}
