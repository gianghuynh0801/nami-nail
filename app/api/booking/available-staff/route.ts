import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const salonId = searchParams.get('salonId')
    const date = searchParams.get('date')
    const time = searchParams.get('time')
    const serviceId = searchParams.get('serviceId')

    if (!salonId || !date || !time || !serviceId) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      )
    }

    // Get service duration
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Parse selected date and time
    const selectedDateTime = new Date(`${date}T${time}`)
    const selectedDayOfWeek = selectedDateTime.getDay() // 0 = Sunday, 1 = Monday, etc.
    const selectedTimeStr = time // "HH:mm"

    // Get all staff for the salon
    const allStaff = await prisma.staff.findMany({
      where: { salonId },
      include: {
        schedules: {
          where: {
            dayOfWeek: selectedDayOfWeek,
            OR: [
              { date: null }, // Weekly schedule
              { date: startOfDay(selectedDateTime) }, // Specific date schedule
            ],
          },
        },
        appointments: {
          where: {
            startTime: {
              gte: new Date(selectedDateTime.getFullYear(), selectedDateTime.getMonth(), selectedDateTime.getDate()),
              lt: new Date(selectedDateTime.getFullYear(), selectedDateTime.getMonth(), selectedDateTime.getDate() + 1),
            },
            status: {
              not: 'CANCELLED',
            },
          },
        },
        staffServices: {
          where: {
            serviceId,
          },
        },
      },
    })

    // Filter staff based on schedule
    const availableStaff = allStaff.filter((staff) => {
      // Lấy duration riêng của thợ này cho dịch vụ này
      const staffService = staff.staffServices.find((ss) => ss.serviceId === serviceId)
      const duration = staffService?.duration ?? service.duration
      // Check if staff has schedule for this day
      // Schedules are already filtered in the query above
      if (staff.schedules.length === 0) {
        return false // No schedule for this day
      }

      // Priority: specific date schedule > weekly schedule
      const specificDateSchedule = staff.schedules.find((s) => s.date !== null)
      const schedule = specificDateSchedule || staff.schedules[0]

      if (!schedule) {
        return false
      }

      // Check if time is within working hours
      const [startHour, startMin] = schedule.startTime.split(':').map(Number)
      const [endHour, endMin] = schedule.endTime.split(':').map(Number)
      const [selectedHour, selectedMin] = selectedTimeStr.split(':').map(Number)

      const scheduleStart = startHour * 60 + startMin
      const scheduleEnd = endHour * 60 + endMin
      const selectedTime = selectedHour * 60 + selectedMin
      const serviceEndTime = selectedTime + duration

      // Check if appointment time is within schedule
      if (selectedTime < scheduleStart || serviceEndTime > scheduleEnd) {
        return false
      }

      // Check break time
      if (schedule.breakStart && schedule.breakEnd) {
        const [breakStartHour, breakStartMin] = schedule.breakStart.split(':').map(Number)
        const [breakEndHour, breakEndMin] = schedule.breakEnd.split(':').map(Number)
        const breakStart = breakStartHour * 60 + breakStartMin
        const breakEnd = breakEndHour * 60 + breakEndMin

        // Check if appointment overlaps with break time
        if (
          (selectedTime >= breakStart && selectedTime < breakEnd) ||
          (serviceEndTime > breakStart && serviceEndTime <= breakEnd) ||
          (selectedTime < breakStart && serviceEndTime > breakEnd)
        ) {
          return false
        }
      }

      // Check if staff has conflicting appointments
      const hasConflict = staff.appointments.some((apt) => {
        const aptStart = new Date(apt.startTime)
        const aptEnd = new Date(apt.endTime)
        return (
          (selectedDateTime >= aptStart && selectedDateTime < aptEnd) ||
          (new Date(selectedDateTime.getTime() + duration * 60000) > aptStart &&
            new Date(selectedDateTime.getTime() + duration * 60000) <= aptEnd) ||
          (selectedDateTime <= aptStart && new Date(selectedDateTime.getTime() + duration * 60000) >= aptEnd)
        )
      })

      return !hasConflict
    })

    return NextResponse.json({
      staff: availableStaff.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
      })),
    })
  } catch (error) {
    console.error('Error fetching available staff:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

