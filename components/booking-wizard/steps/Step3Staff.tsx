'use client'

import { useState, useEffect } from 'react'
import { User, Shuffle, Star, ChevronRight, ChevronLeft } from 'lucide-react'
import type { Staff } from '../types'

interface Step3StaffProps {
  salonId: string
  serviceId: string
  selectedStaffId: string | null
  isAnyStaff: boolean
  onSelect: (staff: Staff | null, isAnyStaff: boolean) => void
  onNext: () => void
  onBack: () => void
}

// Staff avatar colors
const STAFF_COLORS = [
  '#bca37f', '#9d8565', '#7d6a4f', '#d4c4a8',
  '#e8b4b8', '#c9a9a6', '#a67c52', '#8b7355',
]

export default function Step3Staff({ 
  salonId,
  serviceId,
  selectedStaffId, 
  isAnyStaff,
  onSelect, 
  onNext, 
  onBack 
}: Step3StaffProps) {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (salonId) {
      fetchStaff()
    }
  }, [salonId, serviceId])

  const fetchStaff = async () => {
    try {
      const res = await fetch(`/api/salon/${salonId}/staff`)
      if (res.ok) {
        const data = await res.json()
        // Add colors to staff
        const staffWithColors = (data.staff || []).map((s: Staff, index: number) => ({
          ...s,
          avatarColor: s.avatarColor || STAFF_COLORS[index % STAFF_COLORS.length],
        }))
        setStaffList(staffWithColors)
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectStaff = (staff: Staff) => {
    onSelect(staff, false)
  }

  const handleSelectAny = () => {
    onSelect(null, true)
  }

  const handleContinue = () => {
    if (selectedStaffId || isAnyStaff) {
      onNext()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-400 mx-auto" />
          <p className="mt-4 text-gray-500">Đang tải danh sách nhân viên...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Chọn Nhân viên
        </h2>
        <p className="text-gray-500">
          Chọn nhân viên phục vụ hoặc để hệ thống tự động phân công
        </p>
      </div>

      {/* Any Staff Option */}
      <button
        onClick={handleSelectAny}
        className={`
          w-full text-left p-4 rounded-xl border-2 transition-all duration-200
          ${isAnyStaff
            ? 'border-primary-400 bg-primary-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
          }
        `}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`
            w-14 h-14 rounded-full flex items-center justify-center
            ${isAnyStaff ? 'bg-primary-400 text-white' : 'bg-gradient-to-br from-primary-200 to-primary-300 text-primary-700'}
          `}>
            <Shuffle className="w-7 h-7" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              Bất kỳ nhân viên
            </h3>
            <p className="text-sm text-gray-500">
              Hệ thống sẽ tự động chọn nhân viên phù hợp nhất
            </p>
          </div>

          {/* Selected indicator */}
          {isAnyStaff && (
            <div className="w-6 h-6 rounded-full bg-primary-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-400">hoặc chọn nhân viên</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
        {staffList.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Không có nhân viên</p>
          </div>
        ) : (
          staffList.map((staff) => (
            <button
              key={staff.id}
              onClick={() => handleSelectStaff(staff)}
              className={`
                p-4 rounded-xl border-2 transition-all duration-200 text-center
                ${selectedStaffId === staff.id && !isAnyStaff
                  ? 'border-primary-400 bg-primary-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
                }
              `}
            >
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-semibold"
                style={{ backgroundColor: staff.avatarColor }}
              >
                {staff.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <h3 className="font-medium text-gray-900 text-sm truncate">
                {staff.name}
              </h3>

              {/* Rating (if available) */}
              {staff.rating && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-gray-500">{staff.rating}</span>
                </div>
              )}

              {/* Selected indicator */}
              {selectedStaffId === staff.id && !isAnyStaff && (
                <div className="w-5 h-5 rounded-full bg-primary-400 flex items-center justify-center mx-auto mt-2">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Navigation */}
      <div className="pt-4 border-t border-gray-200 flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Quay lại
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedStaffId && !isAnyStaff}
          className={`
            flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
            ${selectedStaffId || isAnyStaff
              ? 'bg-primary-400 text-white hover:bg-primary-500 shadow-lg shadow-primary-400/30'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Tiếp tục
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
