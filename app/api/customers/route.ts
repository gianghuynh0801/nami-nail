import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const salonId = searchParams.get('salonId')
    const search = searchParams.get('search')

    const where: any = {}
    
    if (salonId) {
      // Lấy customers có appointment ở salon này
      where.appointments = {
        some: {
          salonId,
        },
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            appointments: true,
            invoices: true,
          },
        },
        appointments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            service: true,
            salon: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = customerSchema.parse(body)

    // Check if customer already exists
    const existing = await prisma.customer.findUnique({
      where: { phone: data.phone },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Customer with this phone already exists' },
        { status: 400 }
      )
    }

    // Create user for customer
    const defaultPassword = await bcrypt.hash(data.phone.slice(-6), 10)
    
    const user = await prisma.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        password: defaultPassword,
        role: 'CUSTOMER',
      },
    })

    const customer = await prisma.customer.create({
      data: {
        userId: user.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address,
        notes: data.notes,
      },
      include: {
        _count: {
          select: {
            appointments: true,
            invoices: true,
          },
        },
      },
    })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

