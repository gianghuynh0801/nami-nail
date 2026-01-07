'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, Calendar, Users, DollarSign, TrendingUp, Phone, Copy, Check, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale/vi'

interface Salon {
  id: string
  name: string
  slug: string
  address: string
  phone: string
  createdAt: string
  _count: {
    appointments: number
    services: number
    staff: number
  }
}

export default function BranchesPage() {
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState<any>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  useEffect(() => {
    fetchSalons()
    fetchStatistics()
  }, [])

  const fetchSalons = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/salon')
      if (res.ok) {
        const data = await res.json()
        setSalons(data.salons || [])
      }
    } catch (error) {
      console.error('Error fetching salons:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const res = await fetch('/api/statistics')
      if (res.ok) {
        const data = await res.json()
        setStatistics(data)
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Chi nhánh</h1>
        <Link
          href="/dashboard/salon/create"
          className="flex items-center gap-2 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm chi nhánh
        </Link>
      </div>

      {/* Summary Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tổng doanh thu</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statistics.totalRevenue?.toLocaleString('vi-VN') || 0} đ
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tổng hóa đơn</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statistics.totalInvoices || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tổng lịch hẹn</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(Object.values(statistics.appointmentStats || {}) as number[]).reduce((a: number, b: number) => a + b, 0)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tổng chi nhánh</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {salons.length}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Branches List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
        </div>
      ) : salons.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Chưa có chi nhánh nào</p>
          <Link
            href="/dashboard/salon/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tạo chi nhánh đầu tiên
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salons.map((salon) => {
            const salonStats = statistics?.revenueBySalon?.find((s: any) => s.salon?.id === salon.id)
            return (
              <div key={salon.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{salon.name}</h3>
                        <p className="text-sm text-gray-500">{salon.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      {salon.phone}
                    </div>
                    <div className="text-xs text-gray-500">
                      Tạo: {format(new Date(salon.createdAt), 'dd/MM/yyyy', { locale: vi })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{salon._count?.appointments || 0}</div>
                      <div className="text-xs text-gray-500">Lịch hẹn</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{salon._count?.services || 0}</div>
                      <div className="text-xs text-gray-500">Dịch vụ</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{salon._count?.staff || 0}</div>
                      <div className="text-xs text-gray-500">Nhân viên</div>
                    </div>
                  </div>

                  {salonStats && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Doanh thu</span>
                        <span className="text-sm font-semibold text-green-600">
                          {salonStats.revenue.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Booking Link */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        Link đặt lịch
                      </span>
                      <button
                        onClick={async () => {
                          const url = `${window.location.origin}/booking/${salon.slug}`
                          try {
                            await navigator.clipboard.writeText(url)
                            setCopiedSlug(salon.slug)
                            setTimeout(() => setCopiedSlug(null), 2000)
                          } catch (err) {
                            console.error('Failed to copy:', err)
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-100 text-primary-600 rounded hover:bg-primary-200 transition-colors"
                      >
                        {copiedSlug === salon.slug ? (
                          <>
                            <Check className="w-3 h-3" />
                            Đã copy
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy link
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      /booking/{salon.slug}
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/dashboard/salon/${salon.id}`}
                      className="flex-1 text-center px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm"
                    >
                      Quản lý
                    </Link>
                    <Link
                      href={`/dashboard/statistics?salonId=${salon.id}`}
                      className="flex-1 text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      Thống kê
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

