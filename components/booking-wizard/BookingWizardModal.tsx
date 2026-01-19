'use client'

import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWizardState } from './hooks/useWizardState'
import WizardProgress from './WizardProgress'
import Step1Branch from './steps/Step1Branch'
import Step2Service from './steps/Step2Service'
import Step3Staff from './steps/Step3Staff'
import Step4DateTime from './steps/Step4DateTime'
import Step5CustomerInfo from './steps/Step5CustomerInfo'
import Step6Review from './steps/Step6Review'
import Step7Success from './steps/Step7Success'

interface BookingWizardModalProps {
  isOpen: boolean
  onClose: () => void
  initialSalonId?: string
  initialStaffId?: string
  initialDateTime?: { date: string; time: string }
  onSuccess?: (appointmentId: string) => void
}

export default function BookingWizardModal({
  isOpen,
  onClose,
  initialSalonId,
  initialStaffId,
  initialDateTime,
  onSuccess,
}: BookingWizardModalProps) {
  const router = useRouter()
  const {
    state,
    setSalon,
    toggleService,
    setStaff,
    setDate,
    setTime,
    setCustomerInfo,
    completeDateTime,
    completeCustomerInfo,
    setLoading,
    setError,
    setSuccess,
    goToStep,
    reset,
    nextStep,
    prevStep,
  } = useWizardState(initialSalonId)

  // Reset wizard when modal opens
  useEffect(() => {
    if (isOpen) {
      reset()
      // If initialSalonId provided, fetch and setup salon data
      if (initialSalonId) {
        fetchInitialData(initialSalonId, initialStaffId, initialDateTime)
      }
    }
  }, [isOpen, initialSalonId, initialStaffId, initialDateTime])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const fetchInitialData = async (
    salonId: string,
    staffId?: string,
    dateTime?: { date: string; time: string }
  ) => {
    try {
      // Fetch salon
      const salonRes = await fetch('/api/salon')
      if (salonRes.ok) {
        const salonData = await salonRes.json()
        const salon = (salonData.salons || []).find((s: any) => s.id === salonId)
        if (salon) {
          setSalon(salon)
          
          // If staff and dateTime provided, fetch staff and set them
          if (staffId && dateTime) {
            try {
              // Fetch staff for this salon
              const staffRes = await fetch(`/api/salon/${salonId}/staff`)
              if (staffRes.ok) {
                const staffData = await staffRes.json()
                const staff = (staffData.staff || []).find((s: any) => s.id === staffId)
                if (staff) {
                  setStaff(staff, false)
                  setDate(dateTime.date)
                  setTime(dateTime.time)
                  // Bắt đầu từ step 2 (chọn dịch vụ) thay vì skip đến step 5
                  goToStep(2)
                  return
                }
              }
            } catch (error) {
              console.error('Error fetching staff:', error)
            }
          }
          // Just move to step 2 (service selection)
          goToStep(2)
        }
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
    }
  }

  const handleConfirm = useCallback(async () => {
    if (!state.salonId || state.serviceIds.length === 0 || !state.selectedDate || !state.selectedTime) {
      throw new Error('Thiếu thông tin đặt lịch')
    }

    setLoading(true)
    setError(null)

    try {
      // Determine staffId - if "any staff", we'll let the backend choose
      let staffIdToUse = state.staffId

      if (state.isAnyStaff && !staffIdToUse) {
        // Fetch available staff for the selected time and choose based on priority
        // Using serviceIds.join(',') for multi-service support
        const staffRes = await fetch(
          `/api/booking/available-staff?salonId=${state.salonId}&date=${state.selectedDate}&time=${state.selectedTime}&serviceIds=${state.serviceIds.join(',')}`
        )
        if (staffRes.ok) {
          const staffData = await staffRes.json()
          if (staffData.staff && staffData.staff.length > 0) {
            // Choose first available staff (they are sorted by priority on backend)
            staffIdToUse = staffData.staff[0].id
          }
        }
      }

      if (!staffIdToUse) {
        throw new Error('Không tìm thấy nhân viên phù hợp cho thời gian này')
      }

      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: state.salonId,
          customerName: state.customerInfo.name,
          customerPhone: state.customerInfo.phone,
          customerEmail: state.customerInfo.email || undefined,
          serviceIds: state.serviceIds, // Send array of IDs
          staffId: staffIdToUse,
          startTime: `${state.selectedDate}T${state.selectedTime}:00`,
          notes: state.customerInfo.notes || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok && data.appointment) {
        setSuccess(data.appointment.id)
        onSuccess?.(data.appointment.id)
      } else {
        // Handle validation errors with details
        let errorMessage = data.error || 'Có lỗi xảy ra khi đặt lịch'
        if (data.details && Array.isArray(data.details)) {
          const validationErrors = data.details.map((d: any) => d.message).join(', ')
          if (validationErrors) {
            errorMessage = `Lỗi xác thực: ${validationErrors}`
          }
        }
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      console.error('Error creating appointment:', error)
      const errorMessage = error.message || 'Có lỗi xảy ra. Vui lòng thử lại.'
      setError(errorMessage)
      throw error // Re-throw để Step6Review có thể catch và hiển thị
    } finally {
      setLoading(false)
    }
  }, [state, setLoading, setError, setSuccess, onSuccess])

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleViewAppointment = () => {
    if (state.createdAppointmentId) {
      handleClose()
      // Navigate to appointment detail or calendar
      router.push('/dashboard/calendar')
    }
  }

  const handleStepClick = (step: number) => {
    goToStep(step)
  }

  if (!isOpen) return null

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        // If initialSalonId was provided, show loading instead of branch selection
        if (initialSalonId) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
              <span className="ml-3 text-gray-600">Đang tải...</span>
            </div>
          )
        }
        return (
          <Step1Branch
            selectedSalonId={state.salonId}
            onSelect={setSalon}
            onNext={nextStep}
          />
        )

      case 2:
        return (
          <Step2Service
            salonId={state.salonId!}
            selectedServiceIds={state.serviceIds}
            onToggle={toggleService}
            onNext={nextStep}
            onBack={prevStep}
          />
        )

      case 3:
        return (
          <Step3Staff
            salonId={state.salonId!}
            serviceIds={state.serviceIds}
            selectedStaffId={state.staffId}
            isAnyStaff={state.isAnyStaff}
            onSelect={setStaff}
            onNext={nextStep}
            onBack={prevStep}
          />
        )

      case 4:
        return (
          <Step4DateTime
            salonId={state.salonId!}
            staffId={state.staffId}
            serviceIds={state.serviceIds}
            isAnyStaff={state.isAnyStaff}
            selectedDate={state.selectedDate}
            selectedTime={state.selectedTime}
            onSelectDate={setDate}
            onSelectTime={setTime}
            onNext={() => {
              completeDateTime()
              nextStep()
            }}
            onBack={prevStep}
          />
        )

      case 5:
        return (
          <Step5CustomerInfo
            customerInfo={state.customerInfo}
            onChange={setCustomerInfo}
            onNext={() => {
              completeCustomerInfo()
              nextStep()
            }}
            onBack={prevStep}
          />
        )

      case 6:
        return (
          <Step6Review
            state={state}
            onConfirm={handleConfirm}
            onBack={prevStep}
            onEditStep={handleStepClick}
          />
        )

      case 7:
        return (
          <Step7Success
            state={state}
            onClose={handleClose}
            onViewAppointment={handleViewAppointment}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={state.currentStep === 7 ? undefined : handleClose}
      />

      {/* Modal */}
      <div className="relative w-full h-full lg:h-auto lg:max-h-[90vh] lg:max-w-4xl lg:mx-4 bg-white lg:rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Progress Sidebar */}
        {state.currentStep < 7 && (
          <WizardProgress
            state={state}
            onStepClick={handleStepClick}
            hideBranchSelection={!!initialSalonId}
          />
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Close Button */}
          {state.currentStep < 7 && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors lg:bg-white lg:shadow-md"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-5 lg:p-8">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  )
}
