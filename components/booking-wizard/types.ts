export interface Salon {
  id: string
  name: string
  address: string
  phone: string
  slug: string
}

export interface Service {
  id: string
  name: string
  price: number
  duration: number
  description?: string
  categoryIds?: string[]
}

export interface ServiceCategory {
  id: string
  name: string
  description?: string
  order: number
  serviceIds: string[]
}

export interface Staff {
  id: string
  name: string
  phone: string
  avatarColor?: string
  rating?: number
}

export interface CustomerInfo {
  name: string
  phone: string
  email: string
  notes: string
}

export interface WizardState {
  currentStep: number
  completedSteps: number[]
  
  // Step 1: Branch
  salonId: string | null
  salon: Salon | null
  
  // Step 2: Service
  serviceIds: string[]
  services: Service[]
  
  // Step 3: Staff
  staffId: string | null  // null means "any staff"
  staff: Staff | null
  isAnyStaff: boolean
  
  // Step 4: Date & Time
  selectedDate: string | null  // YYYY-MM-DD
  selectedTime: string | null  // HH:mm
  
  // Step 5: Customer Info
  customerInfo: CustomerInfo
  
  // Loading states
  isLoading: boolean
  error: string | null
  
  // Success state
  createdAppointmentId: string | null
}

export type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'COMPLETE_STEP'; step: number }
  | { type: 'SET_SALON'; salon: Salon }
  | { type: 'SET_SERVICES'; services: Service[] }
  | { type: 'TOGGLE_SERVICE'; service: Service }
  | { type: 'SET_STAFF'; staff: Staff | null; isAnyStaff: boolean }
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_TIME'; time: string }
  | { type: 'SET_CUSTOMER_INFO'; info: Partial<CustomerInfo> }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SUCCESS'; appointmentId: string }
  | { type: 'RESET' }
  | { type: 'GO_TO_STEP'; step: number }

export const STEPS = [
  { id: 1, title: 'Chi nhánh', icon: 'Building2', description: 'Chọn chi nhánh' },
  { id: 2, title: 'Dịch vụ', icon: 'Scissors', description: 'Chọn dịch vụ' },
  { id: 3, title: 'Nhân viên', icon: 'User', description: 'Chọn nhân viên' },
  { id: 4, title: 'Ngày & Giờ', icon: 'Calendar', description: 'Chọn thời gian' },
  { id: 5, title: 'Thông tin', icon: 'UserCircle', description: 'Thông tin khách' },
  { id: 6, title: 'Xác nhận', icon: 'ClipboardCheck', description: 'Kiểm tra & đặt' },
] as const

export const initialCustomerInfo: CustomerInfo = {
  name: '',
  phone: '',
  email: '',
  notes: '',
}

export const initialWizardState: WizardState = {
  currentStep: 1,
  completedSteps: [],
  salonId: null,
  salon: null,
  serviceIds: [],
  services: [],
  staffId: null,
  staff: null,
  isAnyStaff: false,
  selectedDate: null,
  selectedTime: null,
  customerInfo: initialCustomerInfo,
  isLoading: false,
  error: null,
  createdAppointmentId: null,
}
