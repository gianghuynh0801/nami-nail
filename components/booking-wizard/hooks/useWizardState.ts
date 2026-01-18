'use client'

import { useReducer, useCallback } from 'react'
import type { WizardState, WizardAction, Salon, Service, Staff, CustomerInfo } from '../types'
import { initialWizardState } from '../types'

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step }
    
    case 'COMPLETE_STEP':
      if (state.completedSteps.includes(action.step)) {
        return state
      }
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.step],
      }
    
    case 'SET_SALON':
      return {
        ...state,
        salonId: action.salon.id,
        salon: action.salon,
        // Reset dependent fields when salon changes
        serviceIds: [],
        services: [],
        staffId: null,
        staff: null,
        isAnyStaff: false,
        selectedDate: null,
        selectedTime: null,
        completedSteps: state.completedSteps.filter(s => s < 1),
      }
    
    case 'SET_SERVICES':
      return {
        ...state,
        serviceIds: action.services.map(s => s.id),
        services: action.services,
        // Reset dependent fields when service changes
        staffId: null,
        staff: null,
        isAnyStaff: false,
        selectedTime: null,
        completedSteps: state.completedSteps.filter(s => s < 2),
      }

    case 'TOGGLE_SERVICE':
      const isSelected = state.serviceIds.includes(action.service.id)
      let newServices: Service[]
      
      if (isSelected) {
        newServices = state.services.filter(s => s.id !== action.service.id)
      } else {
        newServices = [...state.services, action.service]
      }
      
      return {
        ...state,
        serviceIds: newServices.map(s => s.id),
        services: newServices,
        // Reset dependent fields when service changes
        staffId: null,
        staff: null,
        isAnyStaff: false,
        selectedTime: null,
        completedSteps: state.completedSteps.filter(s => s < 2),
      }
    
    case 'SET_STAFF':
      return {
        ...state,
        staffId: action.staff?.id || null,
        staff: action.staff,
        isAnyStaff: action.isAnyStaff,
        // Reset time when staff changes
        selectedTime: null,
        completedSteps: state.completedSteps.filter(s => s < 3),
      }
    
    case 'SET_DATE':
      return {
        ...state,
        selectedDate: action.date,
        selectedTime: null, // Reset time when date changes
      }
    
    case 'SET_TIME':
      return {
        ...state,
        selectedTime: action.time,
      }
    
    case 'SET_CUSTOMER_INFO':
      return {
        ...state,
        customerInfo: { ...state.customerInfo, ...action.info },
      }
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading }
    
    case 'SET_ERROR':
      return { ...state, error: action.error }
    
    case 'SET_SUCCESS':
      return {
        ...state,
        createdAppointmentId: action.appointmentId,
        currentStep: 7, // Move to success step
      }
    
    case 'GO_TO_STEP':
      // Only allow going to completed steps or current step + 1
      if (action.step <= Math.max(...state.completedSteps, 0) + 1) {
        return { ...state, currentStep: action.step }
      }
      return state
    
    case 'RESET':
      return initialWizardState
    
    default:
      return state
  }
}

export function useWizardState(initialSalonId?: string) {
  const [state, dispatch] = useReducer(wizardReducer, {
    ...initialWizardState,
    salonId: initialSalonId || null,
  })

  const setStep = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', step })
  }, [])

  const completeStep = useCallback((step: number) => {
    dispatch({ type: 'COMPLETE_STEP', step })
  }, [])

  const setSalon = useCallback((salon: Salon) => {
    dispatch({ type: 'SET_SALON', salon })
    dispatch({ type: 'COMPLETE_STEP', step: 1 })
  }, [])

  const setServices = useCallback((services: Service[]) => {
    dispatch({ type: 'SET_SERVICES', services })
    // If services are cleared, we might want to un-complete step 2, but for now we just update state
    // Don't auto-complete step 2 here as user might want to select more
  }, [])

  const toggleService = useCallback((service: Service) => {
    dispatch({ type: 'TOGGLE_SERVICE', service })
  }, [])

  const setStaff = useCallback((staff: Staff | null, isAnyStaff: boolean = false) => {
    dispatch({ type: 'SET_STAFF', staff, isAnyStaff })
    dispatch({ type: 'COMPLETE_STEP', step: 3 })
  }, [])

  const setDate = useCallback((date: string) => {
    dispatch({ type: 'SET_DATE', date })
  }, [])

  const setTime = useCallback((time: string) => {
    dispatch({ type: 'SET_TIME', time })
  }, [])

  const setCustomerInfo = useCallback((info: Partial<CustomerInfo>) => {
    dispatch({ type: 'SET_CUSTOMER_INFO', info })
  }, [])

  const completeDateTime = useCallback(() => {
    dispatch({ type: 'COMPLETE_STEP', step: 4 })
  }, [])

  const completeCustomerInfo = useCallback(() => {
    dispatch({ type: 'COMPLETE_STEP', step: 5 })
  }, [])

  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', isLoading })
  }, [])

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', error })
  }, [])

  const setSuccess = useCallback((appointmentId: string) => {
    dispatch({ type: 'SET_SUCCESS', appointmentId })
  }, [])

  const goToStep = useCallback((step: number) => {
    dispatch({ type: 'GO_TO_STEP', step })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const nextStep = useCallback(() => {
    if (state.currentStep < 6) {
      dispatch({ type: 'SET_STEP', step: state.currentStep + 1 })
    }
  }, [state.currentStep])

  const prevStep = useCallback(() => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', step: state.currentStep - 1 })
    }
  }, [state.currentStep])

  const canProceed = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        return !!state.salonId
      case 2:
        return state.serviceIds.length > 0
      case 3:
        return !!state.staffId || state.isAnyStaff
      case 4:
        return !!state.selectedDate && !!state.selectedTime
      case 5:
        return !!state.customerInfo.name && !!state.customerInfo.phone
      case 6:
        return true // Review step, always can proceed to confirm
      default:
        return false
    }
  }, [state])

  return {
    state,
    dispatch,
    setStep,
    completeStep,
    setSalon,
    setServices,
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
    canProceed,
  }
}
