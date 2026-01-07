'use client'

import { User, Phone, Mail } from 'lucide-react'

interface CustomerInfo {
  name: string
  phone: string
  email: string
}

interface StepCustomerInfoProps {
  customerInfo: CustomerInfo
  onChange: (info: CustomerInfo) => void
}

export default function StepCustomerInfo({ customerInfo, onChange }: StepCustomerInfoProps) {
  const handleChange = (field: keyof CustomerInfo, value: string) => {
    onChange({
      ...customerInfo,
      [field]: value,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Information</h2>
        <p className="text-gray-500">Please provide your contact information</p>
      </div>

      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <User className="w-4 h-4 text-primary-400" />
            Full Name *
          </label>
          <input
            type="text"
            value={customerInfo.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter your full name"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Phone className="w-4 h-4 text-primary-400" />
            Phone Number *
          </label>
          <input
            type="tel"
            value={customerInfo.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="Enter phone number"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
          />
        </div>

        {/* Email (Optional) */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Mail className="w-4 h-4 text-primary-400" />
            Email (Optional)
          </label>
          <input
            type="email"
            value={customerInfo.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="Enter email address (optional)"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
          />
        </div>
      </div>
    </div>
  )
}
