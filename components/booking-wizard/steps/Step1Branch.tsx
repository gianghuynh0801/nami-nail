'use client'

import { useState, useEffect } from 'react'
import { Building2, MapPin, Phone, ChevronRight, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Salon } from '../types'

interface Step1BranchProps {
  selectedSalonId: string | null
  onSelect: (salon: Salon) => void
  onNext: () => void
}

export default function Step1Branch({ selectedSalonId, onSelect, onNext }: Step1BranchProps) {
  const t = useTranslations('BookingWizard')
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchSalons()
  }, [])

  const fetchSalons = async () => {
    try {
      const res = await fetch('/api/salon')
      if (res.ok) {
        const data = await res.json()
        setSalons(data.salons || [])
        
        // Auto-select if only one salon
        if (data.salons?.length === 1) {
          onSelect(data.salons[0])
        }
      }
    } catch (error) {
      console.error('Error fetching salons:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSalons = salons.filter(salon =>
    salon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salon.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (salon: Salon) => {
    onSelect(salon)
  }

  const handleContinue = () => {
    if (selectedSalonId) {
      onNext()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400 mx-auto" />
          <p className="mt-4 text-gray-500">{t('loadingBranches')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('selectBranchTitle')}
        </h2>
        <p className="text-gray-500">
          {t('selectBranchHint')}
        </p>
      </div>

      {/* Search */}
      {salons.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchBranch')}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
      )}

      {/* Salon List */}
      <div className="space-y-3">
        {filteredSalons.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('noBranchesFound')}</p>
          </div>
        ) : (
          filteredSalons.map((salon) => (
            <button
              key={salon.id}
              onClick={() => handleSelect(salon)}
              className={`
                w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                ${selectedSalonId === salon.id
                  ? 'border-primary-400 bg-primary-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                  ${selectedSalonId === salon.id ? 'bg-primary-400 text-white' : 'bg-primary-100 text-primary-600'}
                `}>
                  <Building2 className="w-6 h-6" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {salon.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{salon.address}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{salon.phone}</span>
                  </div>
                </div>

                {/* Selected indicator */}
                {selectedSalonId === salon.id && (
                  <div className="w-6 h-6 rounded-full bg-primary-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Continue Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleContinue}
          disabled={!selectedSalonId}
          className={`
            w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
            ${selectedSalonId
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
