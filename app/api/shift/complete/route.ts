import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentStatus } from '@prisma/client'
import { z } from 'zod'

const completeSchema = z.object({
  appointmentId: z.string(),
  salonId: z.string(),
})

// Helper to parse extra services from appointment notes
interface ExtraService {
  name: string
  duration: number
  price: number
}

function parseExtraServices(notes: string | null): ExtraService[] {
  if (!notes) return []
  const match = notes.match(/\[EXTRA_SERVICES\]([\s\S]*?)\[\/EXTRA_SERVICES\]/)
  if (!match) return []
  try {
    const data = JSON.parse(match[1])
    return data.items || []
  } catch {
    return []
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
    const data = completeSchema.parse(body)

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

    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
    })

    if (!appointment || appointment.salonId !== data.salonId) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Appointment must be in progress before completing' },
        { status: 400 }
      )
    }

    const updated = await prisma.appointment.update({
      where: { id: data.appointmentId },
      data: {
        status: AppointmentStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        staff: true,
        service: true,
        customer: true,
      },
    })

    // Create Invoice for the completed appointment
    if (updated.service) {
      // Parse extra services from notes
      const extraServices = parseExtraServices(updated.notes)
      
      // Calculate totals
      const mainServicePrice = updated.service.price
      const extraServicesTotal = extraServices.reduce((sum, e) => sum + (e.price || 0), 0)
      const totalAmount = mainServicePrice + extraServicesTotal
      
      // Prepare invoice items
      const invoiceItems: { serviceId?: string; customName?: string; quantity: number; unitPrice: number; totalPrice: number }[] = []
      
      // Main service item
      invoiceItems.push({
        serviceId: updated.service.id,
        quantity: 1,
        unitPrice: mainServicePrice,
        totalPrice: mainServicePrice,
      })
      
      // Extra service items (custom names, no serviceId)
      extraServices.forEach(extra => {
        if (extra.name && extra.price > 0) {
          invoiceItems.push({
            customName: extra.name,
            quantity: 1,
            unitPrice: extra.price,
            totalPrice: extra.price,
          })
        }
      })

      await prisma.invoice.create({
        data: {
          salonId: data.salonId,
          appointmentId: data.appointmentId,
          customerId: updated.customerId,
          totalAmount,
          finalAmount: totalAmount,
          status: 'PAID',
          paymentMethod: 'CASH', // Default to CASH for auto-generated
          items: {
            create: invoiceItems,
          },
        },
      })
    }

    return NextResponse.json({ appointment: updated })
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

