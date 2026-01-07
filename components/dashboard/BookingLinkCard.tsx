'use client'

import { useState } from 'react'
import { Link as LinkIcon, Copy, Check } from 'lucide-react'

interface BookingLinkCardProps {
  slug: string
}

export default function BookingLinkCard({ slug }: BookingLinkCardProps) {
  const [copied, setCopied] = useState(false)
  
  const bookingUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/booking/${slug}`
    : `/booking/${slug}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = bookingUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-pink-50 border border-primary-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-primary-600" />
            Link đặt lịch
          </h3>
          <p className="text-xs text-gray-600 mb-2">
            Chia sẻ link này để khách hàng có thể đặt lịch trực tuyến
          </p>
          <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
            <input
              type="text"
              value={bookingUrl}
              readOnly
              className="flex-1 bg-transparent text-xs font-mono text-gray-700 outline-none"
            />
            <button
              type="button"
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors text-xs font-medium whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  Đã copy!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

