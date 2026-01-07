'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { MapPin, Phone, Building2, ArrowRight } from 'lucide-react'

interface Salon {
  id: string
  name: string
  slug: string
  address: string
  phone: string
}

interface BookingBranchSelectionProps {
  salons: Salon[]
}

export default function BookingBranchSelection({ salons }: BookingBranchSelectionProps) {
  const router = useRouter()
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null)

  const handleContinue = () => {
    if (selectedSalonId) {
      const salon = salons.find(s => s.id === selectedSalonId)
      if (salon) {
        router.push(`/booking/${salon.slug}`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-beige-light via-white to-beige-light relative overflow-hidden">
      <div className="container mx-auto px-4 py-8 md:py-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/images/logo.webp"
                alt="NAMI Nail"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent mb-2">
              Book Appointment
            </h1>
            <p className="text-gray-600 text-lg">
              Please select the branch you want to book an appointment at
            </p>
          </div>

          {/* Branch Selection */}
          <div className="space-y-4 mb-8">
            {salons.map((salon) => (
              <div
                key={salon.id}
                onClick={() => setSelectedSalonId(salon.id)}
                className={`
                  card-modern rounded-2xl p-6 cursor-pointer transition-all
                  ${selectedSalonId === salon.id
                    ? 'ring-2 ring-primary-400 bg-primary-50'
                    : 'hover:shadow-lg'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-8 h-8 text-primary-400" />
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

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!selectedSalonId}
            className="w-full md:w-auto md:min-w-[200px] px-8 py-4 bg-primary-400 text-white rounded-xl hover:bg-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg hover:shadow-xl hover:shadow-primary-400/30 flex items-center justify-center gap-2 mx-auto"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
