import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const staffServiceSchema = z.object({
  serviceId: z.string(),
  duration: z.number().int().positive(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string; staffId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const salon = await prisma.salon.findUnique({
      where: { id: params.id },
    })

    if (!salon || salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Salon not found or unauthorized' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { serviceId, duration } = staffServiceSchema.parse(body)

    // Verify staff belongs to salon
    const staff = await prisma.staff.findUnique({
      where: { id: params.staffId },
    })

    if (!staff || staff.salonId !== params.id) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    // Verify service belongs to salon
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    })

    if (!service || service.salonId !== params.id) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Create or update staff service
    const staffService = await prisma.staffService.upsert({
      where: {
        staffId_serviceId: {
          staffId: params.staffId,
          serviceId,
        },
      },
      update: {
        duration,
      },
      create: {
        staffId: params.staffId,
        serviceId,
        duration,
      },
      include: {
        service: true,
        staff: true,
      },
    })

    return NextResponse.json({ staffService }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating/updating staff service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; staffId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const salon = await prisma.salon.findUnique({
      where: { id: params.id },
    })

    if (!salon || salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Salon not found or unauthorized' },
        { status: 404 }
      )
    }

    // Verify staff belongs to salon
    const staff = await prisma.staff.findUnique({
      where: { id: params.staffId },
    })

    if (!staff || staff.salonId !== params.id) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    // Get all staff services for this staff
    const staffServices = await prisma.staffService.findMany({
      where: {
        staffId: params.staffId,
        service: {
          salonId: params.id,
        },
      },
      include: {
        service: true,
      },
    })

    return NextResponse.json({ staffServices })
  } catch (error) {
    console.error('Error fetching staff services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const salon = await prisma.salon.findUnique({
      where: { id: params.id },
    })

    if (!salon || salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Salon not found or unauthorized' },
        { status: 404 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const serviceId = searchParams.get('serviceId')

    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      )
    }

    // Verify staff belongs to salon
    const staff = await prisma.staff.findUnique({
      where: { id: params.staffId },
    })

    if (!staff || staff.salonId !== params.id) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    // Delete staff service
    await prisma.staffService.delete({
      where: {
        staffId_serviceId: {
          staffId: params.staffId,
          serviceId,
        },
      },
    })

    return NextResponse.json({ message: 'Staff service deleted successfully' })
  } catch (error) {
    console.error('Error deleting staff service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

