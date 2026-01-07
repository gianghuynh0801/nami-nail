import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateScheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
  breakStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional().nullable(),
  breakEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional().nullable(),
  date: z.string().optional().nullable(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schedule = await prisma.staffSchedule.findUnique({
      where: { id: params.id },
      include: {
        staff: {
          include: { salon: true },
        },
      },
    })

    if (!schedule || schedule.staff.salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Schedule not found or unauthorized' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const data = updateScheduleSchema.parse(body)

    const updated = await prisma.staffSchedule.update({
      where: { id: params.id },
      data: {
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        breakStart: data.breakStart ?? undefined,
        breakEnd: data.breakEnd ?? undefined,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: {
        staff: true,
      },
    })

    return NextResponse.json({ schedule: updated })
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schedule = await prisma.staffSchedule.findUnique({
      where: { id: params.id },
      include: {
        staff: {
          include: { salon: true },
        },
      },
    })

    if (!schedule || schedule.staff.salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Schedule not found or unauthorized' },
        { status: 404 }
      )
    }

    await prisma.staffSchedule.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Schedule deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

