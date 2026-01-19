'use client'

import { useState, useMemo } from 'react'
import { Building2, MapPin, Phone, Search } from 'lucide-react'

interface Salon {
  id: string
  name: string
  slug: string
  address: string
  phone: string
}

interface StepBranchProps {
  salons: Salon[]
  selectedSalonId: string | null
  onSelect: (salonId: string) => void
}

export default function StepBranch({ salons, selectedSalonId, onSelect }: StepBranchProps) {
  const [searchText, setSearchText] = useState('')

  const filteredSalons = useMemo(() => {
    if (!searchText.trim()) return salons
    const search = searchText.toLowerCase().trim()
    return salons.filter(salon => 
      salon.name.toLowerCase().includes(search) ||
      salon.address.toLowerCase().includes(search)
    )
  }, [salons, searchText])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Chọn chi nhánh</h2>
        <p className="text-gray-500">Vui lòng chọn chi nhánh bạn muốn đặt lịch</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm theo tên hoặc địa chỉ..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
        />
      </div>

      <div className="space-y-4">
        {filteredSalons.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Không tìm thấy chi nhánh phù hợp
          </div>
        ) : (
          filteredSalons.map((salon) => (
            <div
              key={salon.id}
              onClick={() => onSelect(salon.id)}
              className={`
                p-6 rounded-xl border-2 cursor-pointer transition-all
                ${selectedSalonId === salon.id
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0
                  ${selectedSalonId === salon.id
                    ? 'bg-primary-400 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {salon.name}
                  </h3>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-400" />
                      <span>{salon.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary-400" />
                      <span>{salon.phone}</span>
                    </div>
                  </div>
                </div>
                {selectedSalonId === salon.id && (
                  <div className="w-6 h-6 bg-primary-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
