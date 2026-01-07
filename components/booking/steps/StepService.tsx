'use client'

import { Scissors } from 'lucide-react'

interface Service {
  id: string
  name: string
  price: number
  duration: number
}

interface StepServiceProps {
  services: Service[]
  selectedServiceId: string
  onSelect: (serviceId: string) => void
}

export default function StepService({ services, selectedServiceId, onSelect }: StepServiceProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Service</h2>
        <p className="text-gray-500">Please select the service you want to book</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            onClick={() => onSelect(service.id)}
            className={`
              p-6 rounded-xl border-2 cursor-pointer transition-all
              ${selectedServiceId === service.id
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                ${selectedServiceId === service.id
                  ? 'bg-primary-400 text-white'
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                <Scissors className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {service.duration} min
                </p>
                <p className="text-lg font-bold text-primary-400">
                  €{service.price.toLocaleString()}
                </p>
              </div>
              {selectedServiceId === service.id && (
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
