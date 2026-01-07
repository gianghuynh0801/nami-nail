import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentStatus } from '@prisma/client'
import { z } from 'zod'

const startSchema = z.object({
  appointmentId: z.string(),
  salonId: z.string(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = startSchema.parse(body)

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

    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: { staff: true, salon: true },
    })

    if (!appointment || appointment.salonId !== data.salonId) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Verify access
    if (session.user.role === 'OWNER') {
      if (appointment.salon.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    } else if (session.user.role === 'STAFF') {
      // Staff can only start their own appointments
      // Check if staff phone matches (assuming staff phone is stored in user)
      // Or we need to add staff.userId relation
      // For now, allow if staff is assigned
    } else {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Can start from CONFIRMED or CHECKED_IN
    if (appointment.status !== AppointmentStatus.CONFIRMED && appointment.status !== AppointmentStatus.CHECKED_IN) {
      return NextResponse.json(
        { error: `Cannot start. Current status: ${appointment.status}` },
        { status: 400 }
      )
    }

    const updated = await prisma.appointment.update({
      where: { id: data.appointmentId },
      data: {
        status: AppointmentStatus.IN_PROGRESS,
        startedAt: new Date(),
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

