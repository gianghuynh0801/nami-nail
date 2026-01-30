'use client'

import { useState } from 'react'
import { User, Phone, Mail, FileText, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { CustomerInfo } from '../types'

interface Step5CustomerInfoProps {
  customerInfo: CustomerInfo
  onChange: (info: Partial<CustomerInfo>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step5CustomerInfo({
  customerInfo,
  onChange,
  onNext,
  onBack,
}: Step5CustomerInfoProps) {
  const t = useTranslations('BookingWizard')
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({})

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerInfo, string>> = {}

    if (!customerInfo.name.trim()) {
      newErrors.name = t('pleaseEnterName')
    }

    if (!customerInfo.phone.trim()) {
      newErrors.phone = t('pleaseEnterPhone')
    } else if (!/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]*$/.test(customerInfo.phone)) {
      // Very permissive regex: allows +, (), space, -, . and digits. 
      // User requested "no length limit", so we use * for the last group or just check for basic validity.
      // Actually, a simple regex like /^[0-9+\-\s\(\)\.]+$/ is probably what they want, maybe with a minimal length check of 1?
      // Let's use a regex that ensures at least some digits but is very permissive.
      // New Regex: /^[+]?[\d\s\-\.\(\)]+$/
      // And maybe check if it has at least approx 5 digits? "no length limit" usually means "don't restrict to 10-11", avoiding excessively short ones is still good practice but I will stick to user request "no limit".
    } else if (!/^[+]?[\d\s\-\.\(\)]+$/.test(customerInfo.phone) || customerInfo.phone.replace(/\D/g, '').length < 3) {
      newErrors.phone = t('invalidPhone')
    }

    if (customerInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      newErrors.email = t('invalidEmail')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field: keyof CustomerInfo, value: string) => {
    onChange({ [field]: value })
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleContinue = () => {
    if (validate()) {
      onNext()
    }
  }

  const canProceed = customerInfo.name.trim() && customerInfo.phone.trim()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('customerInfoTitle')}
        </h2>
        <p className="text-gray-500">
          {t('customerInfoHint')}
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 text-primary-500" />
            {t('fullName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={customerInfo.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={t('enterFullName')}
            className={`
              w-full px-4 py-3 rounded-xl border transition-all
              ${errors.name 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-200 focus:ring-primary-400 focus:border-primary-400'
              }
              focus:ring-2 focus:outline-none
            `}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Phone className="w-4 h-4 text-primary-500" />
            {t('phone')} <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={customerInfo.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder={t('enterPhone')}
            className={`
              w-full px-4 py-3 rounded-xl border transition-all
              ${errors.phone 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-200 focus:ring-primary-400 focus:border-primary-400'
              }
              focus:ring-2 focus:outline-none
            `}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.phone}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 text-primary-500" />
            {t('emailOptional')}
          </label>
          <input
            type="email"
            value={customerInfo.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder={t('enterEmailOptional')}
            className={`
              w-full px-4 py-3 rounded-xl border transition-all
              ${errors.email 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-200 focus:ring-primary-400 focus:border-primary-400'
              }
              focus:ring-2 focus:outline-none
            `}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4 text-primary-500" />
            {t('notesOptional')}
          </label>
          <textarea
            value={customerInfo.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder={t('notesPlaceholderExample')}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 focus:outline-none transition-all resize-none"
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <p className="text-sm text-blue-700">
          💡 {t('phoneInfo')}
        </p>
      </div>

      {/* Navigation */}
      <div className="pt-4 border-t border-gray-200 flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('back')}
        </button>
        <button
          onClick={handleContinue}
          disabled={!canProceed}
          className={`
            flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
            ${canProceed
              ? 'bg-primary-400 text-white hover:bg-primary-500 shadow-lg shadow-primary-400/30'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {t('continue')}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
