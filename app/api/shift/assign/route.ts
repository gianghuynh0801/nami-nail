import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const assignSchema = z.object({
  appointmentId: z.string(),
  staffId: z.string(),
  salonId: z.string(),
})

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
    const data = assignSchema.parse(body)

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

    // Check if appointment exists and is not already assigned to another staff
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    if (appointment.salonId !== data.salonId) {
      return NextResponse.json(
        { error: 'Appointment does not belong to this salon' },
        { status: 403 }
      )
    }

    // Check for overlapping appointments
    const overlapping = await prisma.appointment.findFirst({
      where: {
        staffId: data.staffId,
        salonId: data.salonId,
        id: { not: data.appointmentId },
        status: {
          not: 'CANCELLED',
        },
        OR: [
          {
            AND: [
              { startTime: { lte: appointment.startTime } },
              { endTime: { gt: appointment.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: appointment.endTime } },
              { endTime: { gte: appointment.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: appointment.startTime } },
              { endTime: { lte: appointment.endTime } },
            ],
          },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: 'Staff already has an appointment at this time' },
        { status: 400 }
      )
    }

    // Update appointment
    const updated = await prisma.appointment.update({
      where: { id: data.appointmentId },
      data: {
        staffId: data.staffId,
        status: 'CONFIRMED',
      },
      include: {
        staff: true,
        service: true,
        customer: true,
      },
    })

    return NextResponse.json({ appointment: updated })
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

