export interface CalendarStaff {
  id: string
  name: string
  phone: string
  avatarColor: string
  priorityOrder: number
  workingHours: {
    start: string  // "08:00"
    end: string    // "18:00"
    breakStart?: string
    breakEnd?: string
  } | null
  appointments: CalendarAppointment[]
}

export interface CalendarAppointment {
  id: string
  customerName: string
  customerPhone: string
  service: {
    id: string
    name: string
    duration: number
  }
  staffId: string
  startTime: string  // ISO string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  checkedInAt?: string  // ISO string
  startedAt?: string    // ISO string
  createdAt?: string    // ISO string
  queueNumber?: number
}

export interface WaitingAppointment {
  id: string
  customerName: string
  customerPhone: string
  service: {
    id: string
    name: string
    duration: number
  }
  requestedTime?: string
  notes?: string
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN'
  createdAt: string  // ISO string
  startTime: string  // ISO string - thời gian hẹn
  assignedStaff: {   // Nhân viên đã gán (nếu có)
    id: string
    name: string
  } | null
}

export interface DragState {
  isDragging: boolean
  draggedAppointment: CalendarAppointment | null
  dragPosition: { x: number; y: number }
  dropTarget: {
    staffId: string
    time: string
  } | null
  sourceStaffId: string | null
}

export interface DropZone {
  staffId: string
  time: string  // "09:00", "09:15", etc.
  rect: DOMRect | null
}
