import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import { getSalonTz } from '@/lib/timezone'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const salonId = searchParams.get('salonId')
    const staffId = searchParams.get('staffId')
    const serviceId = searchParams.get('serviceId')
    const serviceIdsParam = searchParams.get('serviceIds')
    const date = searchParams.get('date')
    const includeDetails = searchParams.get('includeDetails') === 'true'

    if (!salonId || !staffId || (!serviceId && !serviceIdsParam) || !date) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      )
    }

    // Determine service IDs
    const serviceIds = serviceIdsParam ? serviceIdsParam.split(',') : (serviceId ? [serviceId] : [])

    if (serviceIds.length === 0) {
       return NextResponse.json({ error: 'No services selected' }, { status: 400 })
    }

    // Fetch all services
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    })

    if (services.length !== serviceIds.length) {
       return NextResponse.json({ error: 'Some services not found' }, { status: 404 })
    }

    // Calculate total duration
    let totalDuration = 0
    for (const service of services) {
       // Check for staff-specific duration
       const staffService = await prisma.staffService.findUnique({
          where: {
             staffId_serviceId: {
                staffId,
                serviceId: service.id
             }
          }
       })
       totalDuration += staffService?.duration ?? service.duration
    }

    // Get salon timezone (fallback to Asia/Ho_Chi_Minh)
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { timezone: true },
    })
    const tz = getSalonTz(salon?.timezone)

    // Get staff schedule for the selected day in salon timezone
    const dayStartUtc = fromZonedTime(`${date}T00:00:00`, tz)
    const dayStartZoned = toZonedTime(dayStartUtc, tz)
    const dayOfWeek = dayStartZoned.getDay() // 0 = Sunday, 1 = Monday, etc.

    let schedule = await prisma.staffSchedule.findFirst({
      where: {
        staffId,
        dayOfWeek,
        OR: [
          { date: null }, // Weekly schedule
          { date: dayStartUtc }, // Specific date schedule (stored as midnight in salon timezone, converted to UTC)
        ],
      },
    })

    // Fallback to salon working hours if no staff schedule
    let scheduleTimes = { startTime: '', endTime: '', breakStart: null as string | null, breakEnd: null as string | null }
    
    if (!schedule) {
      // Try salon working hours as fallback
      const salonHours = await prisma.salonWorkingHours.findFirst({
        where: {
          salonId,
          dayOfWeek,
          isOpen: true,
        },
      })
      
      if (salonHours) {
        scheduleTimes = {
          startTime: salonHours.startTime,
          endTime: salonHours.endTime,
          breakStart: null,
          breakEnd: null,
        }
      } else {
        // Nếu không có salon hours, sử dụng giờ mặc định 09:00 - 18:00
        // Thay vì trả về lỗi, cho phép đặt lịch với giờ mặc định
        scheduleTimes = {
          startTime: '09:00',
          endTime: '18:00',
          breakStart: null,
          breakEnd: null,
        }
      }
    } else {
      scheduleTimes = {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart || null,
        breakEnd: schedule.breakEnd || null,
      }
    }

    // Parse schedule times
    const [startHour, startMin] = scheduleTimes.startTime.split(':').map(Number)
    const [endHour, endMin] = scheduleTimes.endTime.split(':').map(Number)
    const scheduleStart = startHour * 60 + startMin
    const scheduleEnd = endHour * 60 + endMin

    // Parse break times if exists
    let breakStart: number | null = null
    let breakEnd: number | null = null
    if (scheduleTimes.breakStart && scheduleTimes.breakEnd) {
      const [breakStartHour, breakStartMin] = scheduleTimes.breakStart.split(':').map(Number)
      const [breakEndHour, breakEndMin] = scheduleTimes.breakEnd.split(':').map(Number)
      breakStart = breakStartHour * 60 + breakStartMin
      breakEnd = breakEndHour * 60 + breakEndMin
    }

    // Get existing appointments for the day (range calculated in salon timezone, converted to UTC)
    const startOfSelectedDay = dayStartUtc
    const endOfSelectedDay = fromZonedTime(`${date}T23:59:59.999`, tz)

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
    const timeSlots: any[] = []

    // Helper to check overlap
    const checkOverlap = (slotStart: Date, slotEnd: Date) => {
       return appointments.some((apt) => {
          const aptStart = new Date(apt.startTime)
          const aptEnd = new Date(apt.endTime)
          return (
            (slotStart < aptEnd && slotEnd > aptStart) ||
            (slotStart >= aptStart && slotStart < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd)
          )
       })
    }

    // Generate slots for all 24 hours (time labels are salon-local, stored/checked in UTC)
    const nowUtc = new Date()
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const hh = String(hour).padStart(2, '0')
        const mm = String(minute).padStart(2, '0')

        const slotStart = fromZonedTime(`${date}T${hh}:${mm}:00`, tz)
        const slotEnd = addMinutes(slotStart, totalDuration) // Use total duration

        // Check if slot is in the past (compare in UTC)
        if (slotStart < nowUtc) {
          if (includeDetails) {
            timeSlots.push({ time: `${hh}:${mm}`, available: false, reason: 'past' })
          }
          continue
        }

        // Check if slot is within schedule
        const slotStartMinutes = hour * 60 + minute
        const slotEndMinutes = slotStartMinutes + totalDuration

        if (slotStartMinutes < scheduleStart || slotEndMinutes > scheduleEnd) {
          continue // Outside working hours
        }

        // Check if slot overlaps with break time
        let isBreak = false
        if (breakStart !== null && breakEnd !== null) {
          if (
            (slotStartMinutes >= breakStart && slotStartMinutes < breakEnd) ||
            (slotEndMinutes > breakStart && slotEndMinutes <= breakEnd) ||
            (slotStartMinutes < breakStart && slotEndMinutes > breakEnd)
          ) {
            isBreak = true
          }
        }

        if (isBreak) {
          if (includeDetails) {
            timeSlots.push({ time: `${hh}:${mm}`, available: false, reason: 'break' })
          }
           continue
        }

        // Check if slot overlaps with existing appointments
        const hasOverlap = checkOverlap(slotStart, slotEnd)

        const label = formatInTimeZone(slotStart, tz, 'HH:mm')

        if (hasOverlap) {
          if (includeDetails) {
            timeSlots.push({ time: label, available: false, reason: 'booked' })
          }
        } else {
          if (includeDetails) {
            timeSlots.push({ time: label, available: true })
          } else {
            timeSlots.push(label)
          }
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
    console.error('Error in available-times:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

