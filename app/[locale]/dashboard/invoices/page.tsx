'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Plus, Eye, X } from 'lucide-react'
import { format } from 'date-fns'
import { vi, enUS } from 'date-fns/locale'

interface Invoice {
  id: string
  totalAmount: number
  discount: number
  finalAmount: number
  paymentMethod?: string
  status: string
  createdAt: string
  customer?: {
    id: string
    name: string
    phone: string
  }
  salon: {
    id: string
    name: string
  }
  items: Array<{
    id: string
    quantity: number
    unitPrice: number
    totalPrice: number
    customName?: string | null
    service?: {
      id: string
      name: string
    } | null
  }>
}

const dateLocaleMap = { vi, en: enUS } as const

export default function InvoicesPage() {
  const t = useTranslations('DashboardPages.invoices')
  const locale = useLocale()
  const dateLocale = (dateLocaleMap as Record<string, typeof enUS>)[locale] || enUS
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSalonId, setSelectedSalonId] = useState<string>('')
  const [salons, setSalons] = useState<any[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    fetchSalons()
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [selectedSalonId, startDate, endDate])

  const fetchSalons = async () => {
    try {
      const res = await fetch('/api/salon')
      if (res.ok) {
        const data = await res.json()
        setSalons(data.salons || [])
        if (data.salons && data.salons.length > 0) {
          setSelectedSalonId(data.salons[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching salons:', error)
    }
  }

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedSalonId) params.append('salonId', selectedSalonId)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const res = await fetch(`/api/invoices?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
        return t('statusPaid')
      case 'PENDING':
        return t('statusPending')
      case 'CANCELLED':
        return t('statusCancelled')
      case 'DRAFT':
        return t('statusDraft')
      default:
        return status
    }
  }

  const getPaymentMethodText = (method?: string) => {
    switch (method) {
      case 'CASH':
        return t('paymentCash')
      case 'BANK_TRANSFER':
        return t('paymentTransfer')
      case 'CARD':
        return t('paymentCard')
      case 'OTHER':
        return t('paymentOther')
      default:
        return t('paymentNone')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">{t('title')}</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors">
          <Plus className="w-5 h-5" />
          {t('createInvoice')}
        </button>
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

      {/* Invoices List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">{t('noInvoices')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('invoiceId')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('customer')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('branch')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('totalAmount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('payment')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('createdAt')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{invoice.id.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.customer ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.customer.name}</div>
                          <div className="text-sm text-gray-500">{invoice.customer.phone}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">{t('walkIn')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.salon.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invoice.finalAmount.toLocaleString('vi-VN')} đ
                      </div>
                      {invoice.discount > 0 && (
                        <div className="text-xs text-gray-500 line-through">
                          {invoice.totalAmount.toLocaleString('vi-VN')} đ
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getPaymentMethodText(invoice.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(invoice.createdAt), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        className="text-primary-600 hover:text-primary-900"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedInvoice(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('detailTitle')} #{selectedInvoice.id.slice(-8)}
              </h3>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-1 hover:bg-gray-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Customer Info */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('customerLabel')}</span>
                <span className="font-medium">
                  {selectedInvoice.customer?.name || t('walkIn')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('branchLabel')}</span>
                <span className="font-medium">{selectedInvoice.salon.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('createdAtLabel')}</span>
                <span className="font-medium">
                  {format(new Date(selectedInvoice.createdAt), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}
                </span>
              </div>

              <hr />

              {/* Items List */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('servicesLabel')}</h4>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, idx) => (
                    <div 
                      key={item.id} 
                      className={`flex justify-between items-center text-sm p-2 rounded ${
                        item.customName ? 'bg-green-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex-1">
                        <span className={item.customName ? 'text-green-700' : 'text-gray-900'}>
                          {item.customName ? `+ ${item.customName}` : item.service?.name || t('serviceUnknown')}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-gray-500 text-xs ml-2">x{item.quantity}</span>
                        )}
                      </div>
                      <span className="font-medium">
                        {item.totalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <hr />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('subtotal')}</span>
                  <span>{selectedInvoice.totalAmount.toLocaleString('vi-VN')}đ</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('discount')}</span>
                    <span className="text-red-500">-{selectedInvoice.discount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold pt-2 border-t">
                  <span>{t('total')}</span>
                  <span className="text-primary-600">{selectedInvoice.finalAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* Payment */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-gray-500">{t('payment')}:</span>
                <span className="text-sm font-medium">{getPaymentMethodText(selectedInvoice.paymentMethod)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{t('status')}:</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                  {getStatusText(selectedInvoice.status)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

