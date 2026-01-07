import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const appointmentSchema = z.object({
  salonId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(10),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  startTime: z.string(),
  endTime: z.string().optional(), // Optional, will be calculated if not provided
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
    const { salonId, customerName, customerPhone, serviceId, staffId, startTime, endTime } =
      appointmentSchema.parse(body)

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

    const start = new Date(startTime)
    
    // Tính endTime dựa trên duration của thợ nếu không được cung cấp
    let end: Date
    if (endTime) {
      end = new Date(endTime)
    } else {
      // Lấy duration riêng của thợ cho dịch vụ
      const staffService = await prisma.staffService.findUnique({
        where: {
          staffId_serviceId: {
            staffId,
            serviceId,
          },
        },
      })

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      })

      if (!service) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        )
      }

      const duration = staffService?.duration ?? service.duration
      end = new Date(start.getTime() + duration * 60000)
    }

    // Check for overlapping appointments
    const overlapping = await prisma.appointment.findFirst({
      where: {
        staffId,
        salonId,
        status: {
          not: 'CANCELLED',
        },
        OR: [
          {
            AND: [
              { startTime: { lte: start } },
              { endTime: { gt: start } },
            ],
          },
          {
            AND: [
              { startTime: { lt: end } },
              { endTime: { gte: end } },
            ],
          },
          {
            AND: [
              { startTime: { gte: start } },
              { endTime: { lte: end } },
            ],
          },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: 'This time slot is already booked. Please select a different time.' },
        { status: 400 }
      )
    }

    const appointment = await prisma.appointment.create({
      data: {
        salonId,
        customerName,
        customerPhone,
        serviceId,
        staffId,
        startTime: start,
        endTime: end,
        status: 'PENDING',
      },
      include: {
        service: true,
        staff: true,
        salon: true,
      },
    })

    return NextResponse.json({ appointment }, { status: 201 })
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
    const salonId = searchParams.get('salonId')
    const staffId = searchParams.get('staffId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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

    const where: any = { salonId }
    if (staffId) {
      where.staffId = staffId
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: true,
        staff: true,
        salon: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json({ appointments })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

