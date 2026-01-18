import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const salonId = searchParams.get('salonId')

    if (!salonId) {
      return NextResponse.json(
        { error: 'salonId is required' },
        { status: 400 }
      )
    }

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
    })

    if (!salon || salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Auto-start appointments that have reached their start time
    const appointmentsToStart = await prisma.appointment.findMany({
      where: {
        salonId,
        status: 'CONFIRMED',
        startTime: { lte: now },
      },
    })

    // Auto-start appointments
    for (const apt of appointmentsToStart) {
      await prisma.appointment.update({
        where: { id: apt.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: now,
        },
      })
    }

    // Get all staff
    const staff = await prisma.staff.findMany({
      where: { salonId },
      include: {
        priority: true,
        appointments: {
          where: {
            startTime: { gte: todayStart },
            status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
          },
          include: {
            service: true,
            customer: true,
          },
          orderBy: { startTime: 'asc' },
        },
      },
    })

    // Get current in-progress appointments
    const inProgress = await prisma.appointment.findMany({
      where: {
        salonId,
        status: 'IN_PROGRESS',
      },
      include: {
        staff: true,
        service: true,
        customer: true,
      },
    })

    // Get pending appointments (waiting to be assigned)
    const pending = await prisma.appointment.findMany({
      where: {
        salonId,
        status: 'PENDING',
        startTime: { gte: todayStart },
      },
      include: {
        service: true,
        customer: true,
      },
      orderBy: { startTime: 'asc' },
    })

    // Calculate statistics for each staff
    const staffStats = await Promise.all(
      staff.map(async (s) => {
        // Count completed appointments today
        const completedToday = await prisma.appointment.count({
          where: {
            staffId: s.id,
            status: 'COMPLETED',
            completedAt: { gte: todayStart },
          },
        })

        // Calculate revenue from beginning of month
        const invoices = await prisma.invoice.findMany({
          where: {
            salonId,
            status: 'PAID',
            createdAt: { gte: monthStart },
            appointment: {
              staffId: s.id,
            },
          },
        })

        const revenue = invoices.reduce((sum, inv) => sum + inv.finalAmount, 0)

        // Calculate working time today (sum of completed appointments duration)
        const completedAppointments = await prisma.appointment.findMany({
          where: {
            staffId: s.id,
            status: 'COMPLETED',
            completedAt: { gte: todayStart },
          },
          select: {
            startedAt: true,
            completedAt: true,
          },
        })

        const workingMinutes = completedAppointments.reduce((sum, apt) => {
          if (apt.startedAt && apt.completedAt) {
            const duration = (apt.completedAt.getTime() - apt.startedAt.getTime()) / 60000
            return sum + duration
          }
          return sum
        }, 0)

        // Get current appointment
        const currentAppointment = inProgress.find((apt) => apt.staffId === s.id)

        return {
          staff: s,
          priority: s.priority,
          currentAppointment,
          upcomingAppointments: s.appointments.filter((apt) => apt.status === 'CONFIRMED'),
          stats: {
            completedToday,
            revenue,
            workingMinutes: Math.round(workingMinutes),
          },
        }
      })
    )

    // Sort staff:
    // 1. By Priority Order (ASC)
    // 2. By Revenue (ASC) - To equalize revenue (Lower revenue = Higher priority)
    staffStats.sort((a, b) => {
      // 1. Check priority availability (active/inactive) - Assuming all returned are active for now
      // 2. Priority Order
      const orderA = a.priority?.priorityOrder ?? 999
      const orderB = b.priority?.priorityOrder ?? 999
      
      if (orderA !== orderB) {
        return orderA - orderB
      }

      // 3. Revenue (ASC)
      // If priorityOrder is same (e.g. both 1 or both undefined/999), sort by Revenue
      return a.stats.revenue - b.stats.revenue
    })

    return NextResponse.json({
      staff: staffStats,
      pendingAppointments: pending,
      inProgressAppointments: inProgress,
    })
  } catch (error) {
    console.error('Error fetching shift status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

