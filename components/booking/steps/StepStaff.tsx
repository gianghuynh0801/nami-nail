'use client'

import { useState, useEffect } from 'react'
import { Users, User } from 'lucide-react'

interface Staff {
  id: string
  name: string
}

interface StepStaffProps {
  salonId: string
  serviceIds: string[]
  staff: Staff[]
  selectedStaffId: string
  onSelect: (staffId: string) => void
}

export default function StepStaff({ salonId, serviceIds, staff, selectedStaffId, onSelect }: StepStaffProps) {
  const [availableStaff, setAvailableStaff] = useState<Staff[]>(staff)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // In the future, we can filter staff based on service availability
    // For now, show all staff
    setAvailableStaff(staff)
  }, [staff, serviceIds])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Chọn nhân viên</h2>
        <p className="text-gray-500">Chọn nhân viên bạn muốn phục vụ</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto"></div>
          <p className="text-gray-500 mt-4">Đang tải danh sách nhân viên...</p>
        </div>
      ) : availableStaff.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Không có nhân viên nào khả dụng</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableStaff.map((staffMember) => (
            <div
              key={staffMember.id}
              onClick={() => onSelect(staffMember.id)}
              className={`
                p-6 rounded-xl border-2 cursor-pointer transition-all
                ${selectedStaffId === staffMember.id
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                  ${selectedStaffId === staffMember.id
                    ? 'bg-primary-400 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{staffMember.name}</h3>
                </div>
                {selectedStaffId === staffMember.id && (
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
      )}
    </div>
  )
}
