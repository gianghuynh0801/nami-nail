import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions: OWNER, STAFF can check-in
    if (session.user.role !== 'OWNER' && session.user.role !== 'STAFF') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { staffId } = body // Optional: can assign staff during check-in

    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: { salon: true, staff: true },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Verify salon access
    if (session.user.role === 'OWNER' && appointment.salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Can only check-in from CONFIRMED status
    if (appointment.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: `Cannot check-in. Current status: ${appointment.status}` },
        { status: 400 }
      )
    }

    // Get the next queue number for today
    const todayStart = startOfDay(appointment.startTime)
    const todayEnd = endOfDay(appointment.startTime)

    const lastCheckedIn = await prisma.appointment.findFirst({
      where: {
        salonId: appointment.salonId,
        checkedInAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        queueNumber: { not: null },
      },
      orderBy: {
        queueNumber: 'desc',
      },
    })

    const nextQueueNumber = lastCheckedIn?.queueNumber 
      ? lastCheckedIn.queueNumber + 1 
      : 1

    // Update appointment
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
        queueNumber: nextQueueNumber,
        ...(staffId && staffId !== appointment.staffId && { staffId }),
      },
      include: {
        service: true,
        staff: true,
        salon: true,
      },
    })

    return NextResponse.json({ appointment: updated })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
