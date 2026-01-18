import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const staffSchema = z.object({
  name: z.string().min(1),
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
    })

    if (!salon || (session.user.role !== 'OWNER' || salon.ownerId !== session.user.id)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const staff = await prisma.staff.findMany({
      where: { salonId: params.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ staff })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const { name } = staffSchema.parse(body)

    const staff = await prisma.staff.create({
      data: {
        name,
        phone: '', // Default to empty string as it is not used in UI but required in DB
        salonId: params.id,
      },
    })

    return NextResponse.json({ staff }, { status: 201 })
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

