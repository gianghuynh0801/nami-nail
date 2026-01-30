'use client'

import { User, Phone, Mail, Users } from 'lucide-react'

export interface CustomerInfo {
  name: string
  phone: string
  email: string
}

interface StepCustomerInfoProps {
  customerInfo: CustomerInfo
  onChange: (info: CustomerInfo) => void
  guestCount?: number
  onGuestCountChange?: (n: number) => void
  extraCustomers?: CustomerInfo[]
  onExtraCustomersChange?: (list: CustomerInfo[]) => void
}

export default function StepCustomerInfo({
  customerInfo,
  onChange,
  guestCount = 1,
  onGuestCountChange,
  extraCustomers = [],
  onExtraCustomersChange,
}: StepCustomerInfoProps) {
  const handleChange = (field: keyof CustomerInfo, value: string) => {
    onChange({ ...customerInfo, [field]: value })
  }

  const handleExtraChange = (index: number, field: keyof CustomerInfo, value: string) => {
    if (!onExtraCustomersChange) return
    const next = [...extraCustomers]
    next[index] = { ...(next[index] || { name: '', phone: '', email: '' }), [field]: value }
    onExtraCustomersChange(next)
  }

  const needExtra = (guestCount || 1) > 1
  const extraCount = Math.max(0, (guestCount || 1) - 1)
  const extraList = needExtra ? extraCustomers.slice(0, extraCount) : []
  while (extraList.length < extraCount) extraList.push({ name: '', phone: '', email: '' })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thông tin khách hàng</h2>
        <p className="text-gray-500">Vui lòng nhập thông tin liên hệ</p>
      </div>

      {onGuestCountChange && (
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Users className="w-4 h-4 text-primary-400" />
            Số lượng khách
          </label>
          <select
            value={guestCount}
            onChange={(e) => onGuestCountChange(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} khách</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm font-medium text-gray-700">Khách 1</p>
        <div className="grid gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Họ tên *</label>
            <input
              type="text"
              value={customerInfo.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Họ tên"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Số điện thoại *</label>
            <input
              type="tel"
              value={customerInfo.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Số điện thoại"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email (tùy chọn)</label>
            <input
              type="email"
              value={customerInfo.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>
      </div>

      {needExtra && onExtraCustomersChange && extraList.map((extra, index) => (
        <div key={index} className="space-y-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700">Khách {index + 2}</p>
          <div className="grid gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Họ tên *</label>
              <input
                type="text"
                value={extra.name}
                onChange={(e) => handleExtraChange(index, 'name', e.target.value)}
                placeholder="Họ tên"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Số điện thoại *</label>
              <input
                type="tel"
                value={extra.phone}
                onChange={(e) => handleExtraChange(index, 'phone', e.target.value)}
                placeholder="Số điện thoại"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email (tùy chọn)</label>
              <input
                type="email"
                value={extra.email}
                onChange={(e) => handleExtraChange(index, 'email', e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
