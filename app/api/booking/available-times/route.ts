import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, setHours, setMinutes, startOfDay, format, isBefore } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const salonId = searchParams.get('salonId')
    const staffId = searchParams.get('staffId')
    const serviceId = searchParams.get('serviceId')
    const date = searchParams.get('date')

    if (!salonId || !staffId || !serviceId || !date) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      )
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Lấy duration riêng của thợ này cho dịch vụ này
    const staffService = await prisma.staffService.findUnique({
      where: {
        staffId_serviceId: {
          staffId,
          serviceId,
        },
      },
    })

    // Sử dụng duration của thợ nếu có, nếu không thì dùng duration mặc định của dịch vụ
    const duration = staffService?.duration ?? service.duration

    // Get staff schedule for the selected day
    const selectedDateObj = new Date(date)
    const dayOfWeek = selectedDateObj.getDay() // 0 = Sunday, 1 = Monday, etc.

    const schedule = await prisma.staffSchedule.findFirst({
      where: {
        staffId,
        dayOfWeek,
        OR: [
          { date: null }, // Weekly schedule
          { date: startOfDay(selectedDateObj) }, // Specific date schedule
        ],
      },
    })

    if (!schedule) {
      // No schedule for this day, return empty with reason
      return NextResponse.json({ 
        times: [],
        reason: 'NO_SCHEDULE',
        message: 'Nhân viên chưa có lịch làm việc cho ngày này'
      })
    }

    // Parse schedule times
    const [startHour, startMin] = schedule.startTime.split(':').map(Number)
    const [endHour, endMin] = schedule.endTime.split(':').map(Number)
    const scheduleStart = startHour * 60 + startMin
    const scheduleEnd = endHour * 60 + endMin

    // Parse break times if exists
    let breakStart: number | null = null
    let breakEnd: number | null = null
    if (schedule.breakStart && schedule.breakEnd) {
      const [breakStartHour, breakStartMin] = schedule.breakStart.split(':').map(Number)
      const [breakEndHour, breakEndMin] = schedule.breakEnd.split(':').map(Number)
      breakStart = breakStartHour * 60 + breakStartMin
      breakEnd = breakEndHour * 60 + breakEndMin
    }

    // Get existing appointments for the day
    const startOfSelectedDay = startOfDay(new Date(date))
    const endOfSelectedDay = new Date(startOfSelectedDay)
    endOfSelectedDay.setHours(23, 59, 59, 999)

    const appointments = await prisma.appointment.findMany({
      where: {
        salonId,
        staffId,
        startTime: {
          gte: startOfSelectedDay,
          lte: endOfSelectedDay,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    })

    // Generate time slots based on schedule
    const timeSlots: string[] = []

    // Generate slots for all 24 hours
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = setMinutes(setHours(startOfSelectedDay, hour), minute)
        const slotEnd = addMinutes(slotStart, duration)

        // Check if slot is in the past
        if (isBefore(slotStart, new Date())) {
          continue
        }

        // Check if slot is within schedule
        const slotStartMinutes = hour * 60 + minute
        const slotEndMinutes = slotStartMinutes + duration

        if (slotStartMinutes < scheduleStart || slotEndMinutes > scheduleEnd) {
          continue // Outside working hours
        }

        // Check if slot overlaps with break time
        if (breakStart !== null && breakEnd !== null) {
          if (
            (slotStartMinutes >= breakStart && slotStartMinutes < breakEnd) ||
            (slotEndMinutes > breakStart && slotEndMinutes <= breakEnd) ||
            (slotStartMinutes < breakStart && slotEndMinutes > breakEnd)
          ) {
            continue // Overlaps with break time
          }
        }

        // Check if slot overlaps with existing appointments
        const hasOverlap = appointments.some((apt) => {
          const aptStart = new Date(apt.startTime)
          const aptEnd = new Date(apt.endTime)
          return (
            (slotStart < aptEnd && slotEnd > aptStart) ||
            (slotStart >= aptStart && slotStart < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd)
          )
        })

        if (!hasOverlap) {
          timeSlots.push(format(slotStart, 'HH:mm'))
        }
      }
    }

    return NextResponse.json({ 
      times: timeSlots,
      reason: timeSlots.length === 0 ? 'ALL_BOOKED' : 'AVAILABLE',
      message: timeSlots.length === 0 
        ? 'Tất cả khung giờ trong ngày này đã được đặt'
        : undefined
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

