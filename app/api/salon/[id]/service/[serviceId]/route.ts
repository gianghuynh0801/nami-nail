import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  duration: z.number().min(1).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string; serviceId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const service = await prisma.service.findUnique({
      where: { id: params.serviceId },
      include: { salon: true },
    })

    if (!service || service.salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Service not found or unauthorized' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const data = updateServiceSchema.parse(body)

    const updated = await prisma.service.update({
      where: { id: params.serviceId },
      data,
    })

    return NextResponse.json({ service: updated })
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
  { params }: { params: { id: string; serviceId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const service = await prisma.service.findUnique({
      where: { id: params.serviceId },
      include: { salon: true },
    })

    if (!service || service.salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Service not found or unauthorized' },
        { status: 404 }
      )
    }

    await prisma.service.delete({
      where: { id: params.serviceId },
    })

    return NextResponse.json({ message: 'Service deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

