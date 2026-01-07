import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, parseISO } from 'date-fns'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const salonId = searchParams.get('salonId')
    const dateStr = searchParams.get('date')

    if (!salonId || !dateStr) {
      return NextResponse.json(
        { error: 'salonId and date are required' },
        { status: 400 }
      )
    }

    const date = parseISO(dateStr)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)
    const dayOfWeek = date.getDay()

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
    })

    if (!salon || salon.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all staff with their schedules and appointments
    const staffList = await prisma.staff.findMany({
      where: { salonId },
      include: {
        priority: true,
        schedules: {
          where: {
            OR: [
              { dayOfWeek, date: null },
              { date: dayStart },
            ],
          },
        },
        appointments: {
          where: {
            startTime: { gte: dayStart, lte: dayEnd },
            status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
          },
          include: {
            service: true,
          },
          orderBy: { startTime: 'asc' },
        },
      },
    })

    // Sort staff by priority order
    const sortedStaff = staffList.sort((a, b) => {
      const priorityA = a.priority?.priorityOrder ?? 999
      const priorityB = b.priority?.priorityOrder ?? 999
      return priorityA - priorityB
    })

    // Get waiting list (pending appointments that are not assigned to any staff)
    // First, get all pending appointments
    const allPendingAppointments = await prisma.appointment.findMany({
      where: {
        salonId,
        status: 'PENDING',
        startTime: { gte: dayStart, lte: dayEnd },
      },
      include: {
        service: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    
    // Filter out appointments that are already assigned to staff
    const assignedAppointmentIds = new Set(
      staffList.flatMap(s => s.appointments.map(a => a.id))
    )
    const waitingList = allPendingAppointments.filter(
      apt => !assignedAppointmentIds.has(apt.id)
    )

    // Staff avatar colors
    const STAFF_COLORS = [
      '#bca37f', '#9d8565', '#7d6a4f', '#d4c4a8',
      '#e8b4b8', '#c9a9a6', '#a67c52', '#8b7355',
    ]

    // Transform data
    const staff = sortedStaff.map((s, index) => {
      const schedule = s.schedules[0]
      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        avatarColor: STAFF_COLORS[index % STAFF_COLORS.length],
        priorityOrder: s.priority?.priorityOrder ?? 999,
        workingHours: schedule
          ? {
              start: schedule.startTime,
              end: schedule.endTime,
              breakStart: schedule.breakStart || undefined,
              breakEnd: schedule.breakEnd || undefined,
            }
          : null,
        appointments: s.appointments
          .map((apt) => ({
            id: apt.id,
            customerName: apt.customerName,
            customerPhone: apt.customerPhone,
            service: {
              id: apt.service.id,
              name: apt.service.name,
              duration: apt.service.duration,
            },
            staffId: apt.staffId,
            startTime: apt.startTime.toISOString(),
            endTime: apt.endTime.toISOString(),
            status: apt.status,
            notes: apt.notes || undefined,
            checkedInAt: apt.checkedInAt?.toISOString(),
            startedAt: apt.startedAt?.toISOString(),
            queueNumber: apt.queueNumber || undefined,
          })),
      }
    })

    return NextResponse.json({
      date: dateStr,
      staff,
      waitingList: waitingList.map((apt) => ({
        id: apt.id,
        customerName: apt.customerName,
        customerPhone: apt.customerPhone,
        service: {
          id: apt.service.id,
          name: apt.service.name,
          duration: apt.service.duration,
        },
        notes: apt.notes || undefined,
      })),
    })
  } catch (error) {
    console.error('Error fetching calendar data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
