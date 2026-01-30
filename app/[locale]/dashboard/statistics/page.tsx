'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react'

interface Statistics {
  totalRevenue: number
  totalInvoices: number
  revenueBySalon: Array<{
    salon: { id: string; name: string }
    revenue: number
    count: number
  }>
  topServices: Array<{
    service: { id: string; name: string }
    quantity: number
    revenue: number
    count: number
  }>
  staffPerformance: Array<{
    staff: { id: string; name: string }
    appointments: number
    revenue: number
  }>
  revenueByDate: Array<{
    date: string
    revenue: number
  }>
  appointmentStats: {
    PENDING?: number
    CONFIRMED?: number
    COMPLETED?: number
    CANCELLED?: number
  }
}

const COLORS = ['#FF6B9D', '#FFC107', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA']

export default function StatisticsPage() {
  const t = useTranslations('DashboardPages.statistics')
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSalonId, setSelectedSalonId] = useState<string>('')
  const [salons, setSalons] = useState<any[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchSalons()
  }, [])

  useEffect(() => {
    fetchStatistics()
  }, [selectedSalonId, startDate, endDate])

  const fetchSalons = async () => {
    try {
      const res = await fetch('/api/salon')
      if (res.ok) {
        const data = await res.json()
        setSalons(data.salons || [])
      }
    } catch (error) {
      console.error('Error fetching salons:', error)
    }
  }

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedSalonId) params.append('salonId', selectedSalonId)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const res = await fetch(`/api/statistics?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setStatistics(data)
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const revenueByDateData = statistics?.revenueByDate.map(item => ({
    date: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    revenue: item.revenue,
  })) || []

  const appointmentStatsData = statistics?.appointmentStats ? [
    { name: t('completed'), value: statistics.appointmentStats.COMPLETED || 0 },
    { name: t('confirmed'), value: statistics.appointmentStats.CONFIRMED || 0 },
    { name: t('pending'), value: statistics.appointmentStats.PENDING || 0 },
    { name: t('cancelled'), value: statistics.appointmentStats.CANCELLED || 0 },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">{t('title')}</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
        <select
          value={selectedSalonId}
          onChange={(e) => setSelectedSalonId(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
        >
          <option value="">{t('allBranches')}</option>
          {salons.map((salon) => (
            <option key={salon.id} value={salon.id}>
              {salon.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder={t('fromDate')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder={t('toDate')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
        </div>
      ) : statistics ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('totalRevenue')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statistics.totalRevenue.toLocaleString('vi-VN')} đ
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('totalInvoices')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statistics.totalInvoices}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('completedAppointments')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statistics.appointmentStats.COMPLETED || 0}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('branches')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statistics.revenueBySalon.length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Date */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('revenueByDate')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueByDateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString('vi-VN')} đ`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#FF6B9D" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Appointment Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('appointmentStatus')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={appointmentStatsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {appointmentStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Salon */}
          {statistics.revenueBySalon.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('revenueByBranch')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statistics.revenueBySalon.map(s => ({ name: s.salon.name, revenue: s.revenue }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString('vi-VN')} đ`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#FF6B9D" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Services */}
          {statistics.topServices.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('topServices')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('service')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('quantity')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('revenue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {statistics.topServices.map((item) => (
                      <tr key={item.service.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.service.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {item.revenue.toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Staff Performance */}
          {statistics.staffPerformance.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('staffPerformance')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('staffMember')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('appointmentCount')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('revenue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {statistics.staffPerformance.map((item) => (
                      <tr key={item.staff.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.staff.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.appointments}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {item.revenue.toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">{t('noData')}</p>
        </div>
      )}
    </div>
  )
}

