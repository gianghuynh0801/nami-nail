import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF', 'CUSTOMER']).optional(),
  permissions: z.array(z.string()).optional(),
  staffId: z.string().optional().nullable(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        staff: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    // Only OWNER can update users
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = updateUserSchema.parse(body)

    // Check if email/phone being updated is already taken
    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: params.id }
        }
      })
      if (existing) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }
    }

    if (data.phone) {
      const existing = await prisma.user.findFirst({
        where: {
          phone: data.phone,
          NOT: { id: params.id }
        }
      })
      if (existing) {
        return NextResponse.json({ error: 'Phone already exists' }, { status: 400 })
      }
    }

    const updateData: any = {
      ...data,
    }

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10)
    }

    // Handle staff linking
    if (data.staffId !== undefined) {
      // Unlink current staff if any
      await prisma.staff.updateMany({
        where: { userId: params.id },
        data: { userId: null }
      })

      if (data.staffId) {
        // Check if new staff is available
        const staff = await prisma.staff.findUnique({
          where: { id: data.staffId },
          include: { user: true }
        })

        if (!staff) {
          return NextResponse.json({ error: 'Selected staff not found' }, { status: 400 })
        }

        if (staff.userId && staff.userId !== params.id) {
          return NextResponse.json({ error: 'Staff member already linked to another user' }, { status: 400 })
        }

        updateData.staff = {
          connect: { id: data.staffId }
        }
      }
      
      delete updateData.staffId
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
      }
    })

    return NextResponse.json({ user })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating user:', error)
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

    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
