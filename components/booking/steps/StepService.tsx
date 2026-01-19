'use client'

import { Scissors, Check } from 'lucide-react'

interface Service {
  id: string
  name: string
  price: number
  duration: number
}

interface StepServiceProps {
  services: Service[]
  selectedServiceIds: string[]
  onToggle: (serviceId: string) => void
}

export default function StepService({ services, selectedServiceIds, onToggle }: StepServiceProps) {
  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id))
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0)
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Chọn dịch vụ</h2>
        <p className="text-gray-500">Bạn có thể chọn nhiều dịch vụ cùng lúc</p>
      </div>

      {/* Summary */}
      {selectedServiceIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-primary-700 font-medium">
              Đã chọn {selectedServiceIds.length} dịch vụ
            </span>
            <div className="text-right">
              <span className="text-lg font-bold text-primary-600">€{totalPrice.toLocaleString()}</span>
              <span className="text-sm text-gray-500 ml-2">• {totalDuration} phút</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => {
          const isSelected = selectedServiceIds.includes(service.id)
          return (
            <div
              key={service.id}
              onClick={() => onToggle(service.id)}
              className={`
                p-6 rounded-xl border-2 cursor-pointer transition-all
                ${isSelected
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                  ${isSelected
                    ? 'bg-primary-400 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  <Scissors className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {service.duration} phút
                  </p>
                  <p className="text-lg font-bold text-primary-400">
                    €{service.price.toLocaleString()}
                  </p>
                </div>
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2
                  ${isSelected
                    ? 'bg-primary-400 border-primary-400'
                    : 'border-gray-300 bg-white'
                  }
                `}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
