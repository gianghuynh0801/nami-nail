'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Building2, Link as LinkIcon, MapPin, Phone, Save, Copy, Check } from 'lucide-react'

const salonSchema = z.object({
  name: z.string().min(1, 'Salon name is required'),
  slug: z.string().min(1, 'Slug is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone number is required'),
})

type SalonFormData = z.infer<typeof salonSchema>

export default function SalonTab({ salon, onUpdate }: { salon: any; onUpdate: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SalonFormData>({
    resolver: zodResolver(salonSchema),
    defaultValues: {
      name: salon.name,
      slug: salon.slug,
      address: salon.address,
      phone: salon.phone,
    },
  })

  const onSubmit = async (data: SalonFormData) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/salon/${salon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'An error occurred')
      }

      onUpdate()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const bookingUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/booking/${salon.slug}`
    : `/booking/${salon.slug}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Booking Link Card */}
      <div className="bg-gradient-to-r from-primary-50 to-pink-50 border border-primary-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary-600" />
              Link đặt lịch
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Chia sẻ link này để khách hàng có thể đặt lịch trực tuyến
            </p>
            <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-gray-200">
              <input
                type="text"
                value={bookingUrl}
                readOnly
                className="flex-1 bg-transparent text-sm font-mono text-gray-700 outline-none"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Đã copy!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Link: <span className="font-mono">{bookingUrl}</span>
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <Building2 className="w-4 h-4 text-primary-600" />
          Salon Name
        </label>
        <input
          {...register('name')}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <LinkIcon className="w-4 h-4 text-primary-600" />
          Slug (URL)
        </label>
        <input
          {...register('slug')}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          placeholder="vi-du-slug"
        />
        {errors.slug && (
          <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <MapPin className="w-4 h-4 text-primary-600" />
          Address
        </label>
        <input
          {...register('address')}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        />
        {errors.address && (
          <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <Phone className="w-4 h-4 text-primary-600" />
          Phone Number
        </label>
        <input
          {...register('phone')}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        />
        {errors.phone && (
          <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-400 text-white rounded-xl hover:bg-primary-500 transition-all disabled:opacity-50 font-semibold hover:shadow-xl hover:shadow-primary-400/30"
      >
        <Save className="w-5 h-5" />
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}

