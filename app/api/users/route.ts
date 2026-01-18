import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF', 'CUSTOMER']),
  permissions: z.array(z.string()).default([]),
  staffId: z.string().optional(), // If linking to existing staff
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    // Only OWNER or MANAGER can view users
    if (!session || !['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    const where: any = {}
    if (role) {
      where.role = role
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        createdAt: true,
        staff: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    // Only OWNER can create users (or Manager with specific permission - simplifying to Owner for now)
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = createUserSchema.parse(body)

    // Check existing email/phone
    if (data.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: data.email } })
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }
    }

    if (data.phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone: data.phone } })
      if (existingPhone) {
        return NextResponse.json({ error: 'Phone already exists' }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    // If staffId provided, verify it exists and is not already linked
    if (data.staffId) {
      const staff = await prisma.staff.findUnique({ 
        where: { id: data.staffId },
        include: { user: true }
      })
      
      if (!staff) {
        return NextResponse.json({ error: 'Selected staff not found' }, { status: 400 })
      }
      
      if (staff.userId) {
        return NextResponse.json({ error: 'This staff member is already linked to a user account' }, { status: 400 })
      }
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        password: hashedPassword,
        role: data.role,
        permissions: data.permissions,
        staff: data.staffId ? {
          connect: { id: data.staffId }
        } : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
      }
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
