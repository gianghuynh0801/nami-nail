import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const staffSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    const salon = await prisma.salon.findUnique({
      where: { id: params.id },
    })

    if (!salon) {
      return NextResponse.json(
        { error: 'Salon not found' },
        { status: 404 }
      )
    }

    const staff = await prisma.staff.findMany({
      where: { salonId: params.id },
      orderBy: { createdAt: 'desc' },
    })

    // Check if user is owner to decide what data to return
    const isOwner = session?.user?.role === 'OWNER' && salon.ownerId === session.user.id

    if (isOwner) {
      return NextResponse.json({ staff })
    }

    // For public/non-owner, return sanitized staff data
    const sanitizedStaff = staff.map(s => ({
      id: s.id,
      name: s.name,
      salonId: s.salonId,
      // Exclude phone and other potentially sensitive info
    }))

    return NextResponse.json({ staff: sanitizedStaff })
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
    const { name, phone } = staffSchema.parse(body)

    const staff = await prisma.staff.create({
      data: {
        name,
        phone: phone || '', // Default to empty string if not provided
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

