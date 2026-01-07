'use client'

import { MapPin, Phone } from 'lucide-react'

interface SalonInfoProps {
  name: string
  address: string
  phone: string
}

export default function SalonInfo({ name, address, phone }: SalonInfoProps) {
  return (
    <div className="text-center mb-8 animate-fade-in">
      <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent mb-4">
        {name}
      </h1>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-gray-600 text-lg">
          <MapPin className="w-5 h-5 text-primary-400" />
          <span>{address}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="w-5 h-5 text-primary-400" />
          <span className="font-medium">{phone}</span>
        </div>
      </div>
    </div>
  )
}

