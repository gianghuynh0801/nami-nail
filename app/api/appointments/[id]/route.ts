import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED']).optional(),
  notes: z.string().optional().nullable(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().min(1).optional(),
  serviceId: z.string().optional(),
  staffId: z.string().optional(),
})

export async function PATCH(
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

    const body = await request.json()
    const data = updateAppointmentSchema.parse(body)

    // Get appointment to verify ownership
    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: { salon: true },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Verify permissions - OWNER, MANAGER, or users with UPDATE_APPOINTMENT permission
    const isOwner = session.user.role === 'OWNER' && appointment.salon.ownerId === session.user.id
    const isManager = session.user.role === 'MANAGER' && session.user.permissions?.includes('UPDATE_APPOINTMENT')
    const hasPermission = session.user.permissions?.includes('UPDATE_APPOINTMENT')
    
    if (!isOwner && !isManager && !hasPermission) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // If updating time or staff, check for overlaps
    if (data.startTime || data.endTime || data.staffId) {
      const newStart = data.startTime ? new Date(data.startTime) : appointment.startTime
      const newEnd = data.endTime ? new Date(data.endTime) : appointment.endTime
      const newStaffId = data.staffId || appointment.staffId

      // Check for overlapping appointments (excluding current appointment)
      const overlapping = await prisma.appointment.findFirst({
        where: {
          id: { not: params.id },
          staffId: newStaffId,
          salonId: appointment.salonId,
          status: { not: 'CANCELLED' },
          OR: [
            {
              AND: [
                { startTime: { lte: newStart } },
                { endTime: { gt: newStart } },
              ],
            },
            {
              AND: [
                { startTime: { lt: newEnd } },
                { endTime: { gte: newEnd } },
              ],
            },
            {
              AND: [
                { startTime: { gte: newStart } },
                { endTime: { lte: newEnd } },
              ],
            },
          ],
        },
      })

      if (overlapping) {
        return NextResponse.json(
          { error: 'Thời gian này đã được đặt. Vui lòng chọn thời gian khác.' },
          { status: 400 }
        )
      }
    }

    // Update appointment
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
        ...(data.customerName && { customerName: data.customerName }),
        ...(data.customerPhone && { customerPhone: data.customerPhone }),
        ...(data.serviceId && { serviceId: data.serviceId }),
        ...(data.staffId && { staffId: data.staffId }),
      },
      include: {
        service: true,
        staff: true,
        salon: true,
      },
    })

    return NextResponse.json({ appointment: updated })
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

export async function GET(
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

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: {
        service: true,
        staff: true,
        salon: true,
      },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Verify salon ownership
    if (session.user.role !== 'OWNER' || appointment.salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({ appointment })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

