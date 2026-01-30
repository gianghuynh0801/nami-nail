'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import SalonTab from '@/components/dashboard/SalonTab'
import ServicesTab from '@/components/dashboard/ServicesTab'
import StaffTab from '@/components/dashboard/StaffTab'
import AppointmentsTab from '@/components/dashboard/AppointmentsTab'
import SchedulesTab from '@/components/dashboard/SchedulesTab'

type Tab = 'salon' | 'services' | 'staff' | 'appointments' | 'schedules'

export default function SalonManagePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('salon')
  const [salon, setSalon] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push('/auth/login')
      return
    }

    fetchSalon()
  }, [session, params.id])

  const fetchSalon = async () => {
    try {
      const res = await fetch(`/api/salon/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setSalon(data.salon)
      }
    } catch (error) {
      console.error('Error fetching salon:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">Đang tải...</div>
    )
  }

  if (!salon) {
    return (
      <div className="text-center py-8">Salon không tồn tại</div>
    )
  }

  const tabs = [
    { id: 'salon' as Tab, label: 'Salon' },
    { id: 'services' as Tab, label: 'Dịch vụ' },
    { id: 'staff' as Tab, label: 'Thợ nail' },
    { id: 'schedules' as Tab, label: 'Ca làm việc' },
    { id: 'appointments' as Tab, label: 'Lịch hẹn' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-primary-400 mb-2 inline-block text-sm"
          >
            ← Quay lại dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {salon.name}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {activeTab === 'salon' && (
          <SalonTab salon={salon} onUpdate={fetchSalon} />
        )}
        {activeTab === 'services' && (
          <ServicesTab salonId={params.id as string} onUpdate={fetchSalon} />
        )}
        {activeTab === 'staff' && (
          <StaffTab salonId={params.id as string} onUpdate={fetchSalon} />
        )}
        {activeTab === 'schedules' && (
          <SchedulesTab salonId={params.id as string} staff={salon.staff || []} onUpdate={fetchSalon} />
        )}
        {activeTab === 'appointments' && (
          <AppointmentsTab salonId={params.id as string} />
        )}
      </div>
    </div>
  )
}

