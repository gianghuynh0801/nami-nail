import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { getSalonTz } from '@/lib/timezone'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const salonId = searchParams.get('salonId')
    const date = searchParams.get('date')
    const time = searchParams.get('time')
    const serviceId = searchParams.get('serviceId')
    const serviceIdsParam = searchParams.get('serviceIds')

    if (!salonId || !date || !time || (!serviceId && !serviceIdsParam)) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      )
    }

    // Determine service IDs (support multi-service)
    const serviceIds = serviceIdsParam ? serviceIdsParam.split(',') : (serviceId ? [serviceId] : [])
    if (serviceIds.length === 0) {
      return NextResponse.json({ error: 'No services selected' }, { status: 400 })
    }

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    })
    if (services.length !== serviceIds.length) {
      return NextResponse.json({ error: 'Some services not found' }, { status: 404 })
    }

    // Salon timezone
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { timezone: true },
    })
    const tz = getSalonTz(salon?.timezone)

    // Selected datetime (salon-local) converted to UTC for DB comparisons
    const selectedDateTimeUtc = fromZonedTime(`${date}T${time}:00`, tz)
    const dayStartUtc = fromZonedTime(`${date}T00:00:00`, tz)
    const selectedDayOfWeek = toZonedTime(dayStartUtc, tz).getDay()
    const selectedTimeStr = time // "HH:mm" in salon local

    // Get all staff for the salon
    const allStaff = await prisma.staff.findMany({
      where: { salonId },
      include: {
        schedules: {
          where: {
            dayOfWeek: selectedDayOfWeek,
            OR: [
              { date: null }, // Weekly schedule
              { date: dayStartUtc }, // Specific date schedule (midnight in salon timezone, converted to UTC)
            ],
          },
        },
        appointments: {
          where: {
            startTime: {
              gte: dayStartUtc,
              lt: fromZonedTime(`${date}T23:59:59.999`, tz),
            },
            status: {
              not: 'CANCELLED',
            },
          },
        },
        staffServices: {
          where: {
            serviceId: { in: serviceIds },
          },
        },
      },
    })

    // Filter staff based on schedule
    const availableStaff = allStaff.filter((staff) => {
      // Total duration for selected services (use staff-specific duration when available)
      const duration = services.reduce((sum, svc) => {
        const ss = staff.staffServices.find((x) => x.serviceId === svc.id)
        return sum + (ss?.duration ?? svc.duration)
      }, 0)

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
        const selectedEndUtc = addMinutes(selectedDateTimeUtc, duration)
        return (
          (selectedDateTimeUtc >= aptStart && selectedDateTimeUtc < aptEnd) ||
          (selectedEndUtc > aptStart && selectedEndUtc <= aptEnd) ||
          (selectedDateTimeUtc <= aptStart && selectedEndUtc >= aptEnd)
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

