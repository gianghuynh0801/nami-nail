import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string; staffId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const staff = await prisma.staff.findUnique({
      where: { id: params.staffId },
      include: {
        salon: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    // Check if user has access
    if (session.user.role !== 'OWNER' || staff.salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({ staff })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const staff = await prisma.staff.findUnique({
      where: { id: params.staffId },
      include: { salon: true },
    })

    if (!staff || staff.salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Staff not found or unauthorized' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const data = updateStaffSchema.parse(body)

    const updated = await prisma.staff.update({
      where: { id: params.staffId },
      data,
    })

    return NextResponse.json({ staff: updated })
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

    const staff = await prisma.staff.findUnique({
      where: { id: params.staffId },
      include: { salon: true },
    })

    if (!staff || staff.salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Staff not found or unauthorized' },
        { status: 404 }
      )
    }

    await prisma.staff.delete({
      where: { id: params.staffId },
    })

    return NextResponse.json({ message: 'Staff deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

