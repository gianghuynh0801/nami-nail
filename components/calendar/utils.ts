import { CalendarStaff } from './types'

export function checkWorkingHour(
  staff: CalendarStaff, 
  hour: number, 
  minute: number
): 'working' | 'break' | false {
  // Nếu không set giờ làm việc, coi như nhân viên NGHỈ (disabled)
  if (!staff.workingHours) return false
  
  const time = hour * 60 + minute
  const [startH, startM] = staff.workingHours.start.split(':').map(Number)
  const [endH, endM] = staff.workingHours.end.split(':').map(Number)
  const startTime = startH * 60 + startM
  const endTime = endH * 60 + endM
  
  // Check if in break time
  if (staff.workingHours.breakStart && staff.workingHours.breakEnd) {
    const [breakStartH, breakStartM] = staff.workingHours.breakStart.split(':').map(Number)
    const [breakEndH, breakEndM] = staff.workingHours.breakEnd.split(':').map(Number)
    const breakStart = breakStartH * 60 + breakStartM
    const breakEnd = breakEndH * 60 + breakEndM
    
    if (time >= breakStart && time < breakEnd) {
      return 'break'
    }
  }
  
  return time >= startTime && time < endTime ? 'working' : false
}
