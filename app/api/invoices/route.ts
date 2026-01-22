import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const invoiceSchema = z.object({
  customerId: z.string().optional(),
  salonId: z.string(),
  appointmentId: z.string().optional(),
  items: z.array(z.object({
    serviceId: z.string().optional(), // Optional for custom/extra services
    customName: z.string().optional(), // Name for custom services
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER']).optional(),
  notes: z.string().optional(),
})

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
    const customerId = searchParams.get('customerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (session.user.role === 'OWNER') {
      if (salonId) {
        where.salonId = salonId
      } else {
        // Get all salons owned by user
        const salons = await prisma.salon.findMany({
          where: { ownerId: session.user.id },
          select: { id: true },
        })
        where.salonId = { in: salons.map(s => s.id) }
      }
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        salon: true,
        appointment: {
          include: {
            service: true,
            staff: true,
          },
        },
        items: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
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
    const data = invoiceSchema.parse(body)

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id: data.salonId },
    })

    if (!salon || salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Calculate totals
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    )
    const finalAmount = totalAmount - data.discount

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        customerId: data.customerId,
        salonId: data.salonId,
        appointmentId: data.appointmentId,
        totalAmount,
        discount: data.discount,
        finalAmount,
        paymentMethod: data.paymentMethod,
        status: data.paymentMethod ? 'PAID' : 'PENDING',
        notes: data.notes,
        items: {
          create: data.items.map(item => ({
            serviceId: item.serviceId || null, // null for custom services
            customName: item.customName || null, // Name for custom services
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          })),
        },
      },
      include: {
        customer: true,
        salon: true,
        appointment: {
          include: {
            service: true,
            staff: true,
          },
        },
        items: {
          include: {
            service: true,
          },
        },
      },
    })

    // Invoice is already linked to appointment via appointmentId field
    // No need to update appointment as the relation is handled by Prisma

    return NextResponse.json({ invoice }, { status: 201 })
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

