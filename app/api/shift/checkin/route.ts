import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const checkinSchema = z.object({
  appointmentId: z.string(),
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
    const data = checkinSchema.parse(body)

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

    // Get appointment
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

    // Only allow check-in for CONFIRMED or PENDING appointments
    if (!['CONFIRMED', 'PENDING'].includes(appointment.status)) {
      return NextResponse.json(
        { error: `Cannot check-in appointment with status: ${appointment.status}` },
        { status: 400 }
      )
    }

    // Get the next queue number for today
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    
    const lastQueueNumber = await prisma.appointment.findFirst({
      where: {
        salonId: data.salonId,
        checkedInAt: { gte: todayStart },
        queueNumber: { not: null },
      },
      orderBy: { queueNumber: 'desc' },
      select: { queueNumber: true },
    })

    const nextQueueNumber = (lastQueueNumber?.queueNumber || 0) + 1

    // Update appointment
    const updated = await prisma.appointment.update({
      where: { id: data.appointmentId },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: now,
        queueNumber: nextQueueNumber,
      },
      include: {
        staff: true,
        service: true,
        customer: true,
      },
    })

    return NextResponse.json({ 
      appointment: updated,
      queueNumber: nextQueueNumber,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
