import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const prioritySchema = z.object({
  staffId: z.string(),
  salonId: z.string(),
  priorityOrder: z.number().int().min(1),
  sortByRevenue: z.enum(['ASC', 'DESC']).default('DESC'),
})

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

    // Get all staff with their priorities
    const staff = await prisma.staff.findMany({
      where: { salonId },
      include: {
        priority: true,
        appointments: {
          where: {
            status: { in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] },
            startTime: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Từ đầu tháng
            },
          },
          include: {
            invoice: true,
          },
        },
      },
    })

    // Calculate revenue for each staff (from beginning of month)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const invoices = await prisma.invoice.findMany({
      where: {
        salonId,
        status: 'PAID',
        createdAt: { gte: monthStart },
        appointment: {
          isNot: null,
        },
      },
      include: {
        appointment: {
          select: {
            staffId: true,
          },
        },
      },
    })

    const staffRevenue = invoices.reduce((acc: any, inv) => {
      const staffId = inv.appointment?.staffId
      if (staffId) {
        acc[staffId] = (acc[staffId] || 0) + inv.finalAmount
      }
      return acc
    }, {})

    // Get or create priorities and sort
    const priorities = await Promise.all(
      staff.map(async (s) => {
        let priority = s.priority
        if (!priority) {
          priority = await prisma.staffPriority.create({
            data: {
              staffId: s.id,
              salonId,
              priorityOrder: 999, // Default low priority
              sortByRevenue: 'DESC',
            },
          })
        }
        return {
          staff: s,
          priority,
          revenue: staffRevenue[s.id] || 0,
        }
      })
    )

    // Sort by priority order first, then by revenue if same priority
    priorities.sort((a, b) => {
      if (a.priority.priorityOrder !== b.priority.priorityOrder) {
        return a.priority.priorityOrder - b.priority.priorityOrder
      }
      // If same priority, sort by revenue
      if (a.priority.sortByRevenue === 'DESC') {
        return b.revenue - a.revenue
      } else {
        return a.revenue - b.revenue
      }
    })

    return NextResponse.json({ priorities })
  } catch (error) {
    console.error('Error fetching priorities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = prioritySchema.parse(body)

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id: data.salonId },
    })

    if (!salon || salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get existing priority
    const existing = await prisma.staffPriority.findUnique({
      where: { staffId: data.staffId },
    })

    let priority
    if (existing) {
      // Save to history before updating
      await prisma.shiftHistory.create({
        data: {
          staffPriorityId: existing.id,
          priorityOrder: existing.priorityOrder,
          sortByRevenue: existing.sortByRevenue,
          changedBy: session.user.id,
        },
      })

      priority = await prisma.staffPriority.update({
        where: { staffId: data.staffId },
        data: {
          priorityOrder: data.priorityOrder,
          sortByRevenue: data.sortByRevenue,
        },
      })
    } else {
      priority = await prisma.staffPriority.create({
        data: {
          staffId: data.staffId,
          salonId: data.salonId,
          priorityOrder: data.priorityOrder,
          sortByRevenue: data.sortByRevenue,
        },
      })
    }

    return NextResponse.json({ priority }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

