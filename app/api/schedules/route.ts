import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const scheduleSchema = z.object({
  staffId: z.string().min(1),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  breakStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional().nullable(),
  breakEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional().nullable(),
  date: z.string().optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')
    const salonId = searchParams.get('salonId')

    if (!staffId && !salonId) {
      return NextResponse.json(
        { error: 'staffId or salonId is required' },
        { status: 400 }
      )
    }

    const where: any = {}

    if (staffId) {
      where.staffId = staffId
    }

    if (salonId) {
      // Verify salon ownership
      const salon = await prisma.salon.findUnique({
        where: { id: salonId },
      })

      if (!salon) {
        return NextResponse.json(
          { error: 'Salon not found' },
          { status: 404 }
        )
      }

      if (session.user.role !== 'OWNER' || salon.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }

      where.staff = {
        salonId,
      }
    }

    const schedules = await prisma.staffSchedule.findMany({
      where,
      include: {
        staff: {
          include: {
            salon: true,
          },
        },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    })

    return NextResponse.json({ schedules })
  } catch (error) {
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
    const data = scheduleSchema.parse(body)

    // Verify staff belongs to owner's salon
    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
      include: { salon: true },
    })

    if (!staff || staff.salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Staff not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check if schedule already exists for this day
    const existing = await prisma.staffSchedule.findFirst({
      where: {
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
        date: data.date ? new Date(data.date) : null,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Schedule already exists for this day' },
        { status: 400 }
      )
    }

    const schedule = await prisma.staffSchedule.create({
      data: {
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        breakStart: data.breakStart || null,
        breakEnd: data.breakEnd || null,
        date: data.date ? new Date(data.date) : null,
      },
      include: {
        staff: true,
      },
    })

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

