import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSalonSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
})

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

    const salon = await prisma.salon.findUnique({
      where: { id: params.id },
      include: {
        services: true,
        staff: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
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

    return NextResponse.json({ salon })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const data = updateSalonSchema.parse(body)

    // Check slug uniqueness if updating slug
    if (data.slug && data.slug !== salon.slug) {
      const existing = await prisma.salon.findUnique({
        where: { slug: data.slug },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.salon.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ salon: updated })
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

    const salon = await prisma.salon.findUnique({
      where: { id: params.id },
    })

    if (!salon || salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Salon not found or unauthorized' },
        { status: 404 }
      )
    }

    await prisma.salon.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Salon deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

