// Main component
export { default as BookingWizardModal } from './BookingWizardModal'

// Progress component
export { default as WizardProgress } from './WizardProgress'

// Step components
export { default as Step1Branch } from './steps/Step1Branch'
export { default as Step2Service } from './steps/Step2Service'
export { default as Step3Staff } from './steps/Step3Staff'
export { default as Step4DateTime } from './steps/Step4DateTime'
export { default as Step5CustomerInfo } from './steps/Step5CustomerInfo'
export { default as Step6Review } from './steps/Step6Review'
export { default as Step7Success } from './steps/Step7Success'

// Hooks
export { useWizardState } from './hooks/useWizardState'

// Types
export type {
  Salon,
  Service,
  Staff,
  CustomerInfo,
  WizardState,
  WizardAction,
} from './types'

// Constants
export { STEPS, initialWizardState, initialCustomerInfo } from './types'
