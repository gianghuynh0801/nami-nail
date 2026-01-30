'use client'

import { Check, Building2, Scissors, User, Calendar, UserCircle, ClipboardCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { STEPS } from './types'
import type { WizardState } from './types'

const IconMap = {
  Building2,
  Scissors,
  User,
  Calendar,
  UserCircle,
  ClipboardCheck,
}

interface WizardProgressProps {
  state: WizardState
  onStepClick: (step: number) => void
  hideBranchSelection?: boolean
}

export default function WizardProgress({ state, onStepClick, hideBranchSelection = false }: WizardProgressProps) {
  const t = useTranslations('BookingWizard')
  const { currentStep, completedSteps, salon, services, staff, isAnyStaff, selectedDate, selectedTime } = state

  // Filter out step 1 if hideBranchSelection is true
  const visibleSteps = hideBranchSelection 
    ? STEPS.filter(step => step.id !== 1)
    : STEPS

  const getStepStatus = (stepId: number) => {
    if (completedSteps.includes(stepId)) return 'completed'
    if (stepId === currentStep) return 'current'
    return 'pending'
  }

  const getStepValue = (stepId: number): string | null => {
    switch (stepId) {
      case 1:
        return salon?.name || null
      case 2:
        if (services.length > 0) {
          return services.length === 1 
            ? services[0].name 
            : t('servicesCount', { count: services.length })
        }
        return null
      case 3:
        return isAnyStaff ? t('any') : staff?.name || null
      case 4:
        if (selectedDate && selectedTime) {
          const date = new Date(selectedDate)
          return `${date.getDate()}/${date.getMonth() + 1} lúc ${selectedTime}`
        }
        return null
      case 5:
        return state.customerInfo.name || null
      default:
        return null
    }
  }

  const canClickStep = (stepId: number): boolean => {
    // Can click on completed steps or the next available step
    return completedSteps.includes(stepId) || stepId <= Math.max(...completedSteps, 0) + 1
  }

  return (
    <div className="w-full lg:w-72 bg-gradient-to-b from-primary-700 to-primary-800 text-white p-4 lg:p-6 lg:min-h-full">
      {/* Header - Mobile */}
      <div className="lg:hidden mb-4">
        <h3 className="text-lg font-semibold">
          {t('stepLabel')} {hideBranchSelection ? currentStep - 1 : currentStep}/{visibleSteps.length}
        </h3>
        <p className="text-sm text-primary-200">
          {STEPS[currentStep - 1] ? t(`step${STEPS[currentStep - 1].id}Title` as 'step1Title') : ''}
        </p>
      </div>

      {/* Progress Steps - Desktop */}
      <div className="hidden lg:block space-y-2">
        {visibleSteps.map((step) => {
          const status = getStepStatus(step.id)
          const Icon = IconMap[step.icon as keyof typeof IconMap]
          const value = getStepValue(step.id)
          const clickable = canClickStep(step.id)

          return (
            <button
              key={step.id}
              onClick={() => clickable && onStepClick(step.id)}
              disabled={!clickable}
              className={`
                w-full text-left p-3 rounded-xl transition-all duration-200
                ${status === 'current' 
                  ? 'bg-white/20 ring-2 ring-white/50' 
                  : status === 'completed'
                    ? 'bg-white/10 hover:bg-white/15'
                    : 'bg-transparent opacity-50'
                }
                ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Icon/Check */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${status === 'completed' 
                    ? 'bg-green-500' 
                    : status === 'current'
                      ? 'bg-white text-primary-700'
                      : 'bg-white/20'
                  }
                `}>
                  {status === 'completed' ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <Icon className={`w-4 h-4 ${status === 'current' ? 'text-primary-700' : 'text-white'}`} />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${status === 'pending' ? 'text-white/70' : 'text-white'}`}>
                    {t(`step${step.id}Title` as 'step1Title')}
                  </p>
                  {value ? (
                    <p className="text-xs text-primary-200 truncate mt-0.5">
                      {value}
                    </p>
                  ) : (
                    <p className="text-xs text-white/50 mt-0.5">
                      {t(`step${step.id}Desc` as 'step1Desc')}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Progress Steps - Mobile (horizontal) */}
      <div className="lg:hidden flex items-center justify-between px-2">
        {visibleSteps.map((step, index) => {
          const status = getStepStatus(step.id)
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step dot */}
              <button
                onClick={() => canClickStep(step.id) && onStepClick(step.id)}
                disabled={!canClickStep(step.id)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
                  transition-all duration-200
                  ${status === 'completed' 
                    ? 'bg-green-500 text-white' 
                    : status === 'current'
                      ? 'bg-white text-primary-700 ring-2 ring-white/50'
                      : 'bg-white/20 text-white/50'
                  }
                `}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  // Adjust step number display if branch is hidden
                  hideBranchSelection ? step.id - 1 : step.id
                )}
              </button>
              
              {/* Connector line */}
              {index < visibleSteps.length - 1 && (
                <div className={`
                  h-0.5 mx-1 flex-1
                  ${completedSteps.includes(step.id) && completedSteps.includes(visibleSteps[index + 1].id) 
                    ? 'bg-green-500' 
                    : 'bg-white/20'
                  }
                `} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
