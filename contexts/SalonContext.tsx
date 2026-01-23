'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Salon {
  id: string
  name: string
  slug: string
  address: string
  phone: string
  timezone?: string
}

interface SalonContextType {
  salons: Salon[]
  selectedSalonId: string | null
  selectedSalon: Salon | null
  setSelectedSalonId: (id: string) => void
  loading: boolean
  error: string | null
}

const SalonContext = createContext<SalonContextType | undefined>(undefined)

const STORAGE_KEY = 'selectedSalonId'

export function SalonProvider({ children }: { children: ReactNode }) {
  const [salons, setSalons] = useState<Salon[]>([])
  const [selectedSalonId, setSelectedSalonIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch salons on mount
  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const res = await fetch('/api/salon')
        if (!res.ok) throw new Error('Failed to fetch salons')
        
        const data = await res.json()
        const salonList = data.salons || []
        setSalons(salonList)

        // Try to restore from localStorage
        const savedId = localStorage.getItem(STORAGE_KEY)
        if (savedId && salonList.find((s: Salon) => s.id === savedId)) {
          setSelectedSalonIdState(savedId)
        } else if (salonList.length > 0) {
          // Default to first salon
          setSelectedSalonIdState(salonList[0].id)
        }
      } catch (err) {
        console.error('Error fetching salons:', err)
        setError('Failed to load salons')
      } finally {
        setLoading(false)
      }
    }

    fetchSalons()
  }, [])

  // Save selection to localStorage
  const setSelectedSalonId = (id: string) => {
    setSelectedSalonIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const selectedSalon = salons.find(s => s.id === selectedSalonId) || null

  return (
    <SalonContext.Provider value={{
      salons,
      selectedSalonId,
      selectedSalon,
      setSelectedSalonId,
      loading,
      error
    }}>
      {children}
    </SalonContext.Provider>
  )
}

export function useSalonContext() {
  const context = useContext(SalonContext)
  if (context === undefined) {
    throw new Error('useSalonContext must be used within a SalonProvider')
  }
  return context
}
