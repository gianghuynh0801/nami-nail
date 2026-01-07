import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseISO, addMinutes } from 'date-fns'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { appointmentId, newStaffId, newStartTime, salonId } = body

    if (!appointmentId || !newStaffId || !newStartTime || !salonId) {
      return NextResponse.json(
        { error: 'Missing required fields: appointmentId, newStaffId, newStartTime, salonId' },
        { status: 400 }
      )
    }

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
    })

    if (!salon || salon.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get the appointment with service duration
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    if (appointment.salonId !== salonId) {
      return NextResponse.json(
        { error: 'Appointment does not belong to this salon' },
        { status: 403 }
      )
    }

    // Verify new staff belongs to the salon
    const newStaff = await prisma.staff.findUnique({
      where: { id: newStaffId },
    })

    if (!newStaff || newStaff.salonId !== salonId) {
      return NextResponse.json(
        { error: 'Staff not found or does not belong to this salon' },
        { status: 404 }
      )
    }

    // Calculate new end time
    const startTime = parseISO(newStartTime)
    
    // Check if staff has custom duration for this service
    const staffService = await prisma.staffService.findUnique({
      where: {
        staffId_serviceId: {
          staffId: newStaffId,
          serviceId: appointment.serviceId,
        },
      },
    })

    const duration = staffService?.duration ?? appointment.service.duration
    const endTime = addMinutes(startTime, duration)

    // Check for conflicts with existing appointments
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        staffId: newStaffId,
        id: { not: appointmentId },
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        OR: [
          {
            // New appointment starts during existing appointment
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            // New appointment ends during existing appointment
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          {
            // New appointment completely contains existing appointment
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    })

    if (conflictingAppointment) {
      return NextResponse.json(
        { 
          error: 'Conflict with existing appointment',
          conflictWith: {
            id: conflictingAppointment.id,
            startTime: conflictingAppointment.startTime,
            endTime: conflictingAppointment.endTime,
          }
        },
        { status: 409 }
      )
    }

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        staffId: newStaffId,
        startTime,
        endTime,
        status: 'CONFIRMED', // Auto-confirm when assigned/moved
      },
      include: {
        service: true,
        staff: true,
      },
    })

    return NextResponse.json({
      success: true,
      appointment: {
        id: updatedAppointment.id,
        customerName: updatedAppointment.customerName,
        customerPhone: updatedAppointment.customerPhone,
        staffId: updatedAppointment.staffId,
        staffName: updatedAppointment.staff.name,
        serviceName: updatedAppointment.service.name,
        startTime: updatedAppointment.startTime.toISOString(),
        endTime: updatedAppointment.endTime.toISOString(),
        status: updatedAppointment.status,
      },
    })
  } catch (error) {
    console.error('Error moving appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
