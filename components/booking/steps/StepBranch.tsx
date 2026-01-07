'use client'

import { Building2, MapPin, Phone } from 'lucide-react'

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
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Branch</h2>
        <p className="text-gray-500">Please select the branch you want to book an appointment at</p>
      </div>

      <div className="space-y-4">
        {salons.map((salon) => (
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
        ))}
      </div>
    </div>
  )
}
