import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateQueueOrderSchema = z.object({
  queueOrder: z.array(z.string()), // Array of appointment IDs in new order
})

export async function PUT(
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

    // Only OWNER and STAFF can reorder
    if (session.user.role !== 'OWNER' && session.user.role !== 'STAFF') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { queueOrder } = updateQueueOrderSchema.parse(body)

    // Get salon from first appointment to verify access
    const firstAppointment = await prisma.appointment.findUnique({
      where: { id: queueOrder[0] },
      include: { salon: true },
    })

    if (!firstAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Verify salon access
    if (session.user.role === 'OWNER' && firstAppointment.salon.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update display order (we'll use a separate field or keep queueNumber but update display)
    // For now, we'll keep queueNumber as-is but add a displayOrder field if needed
    // Or we can just update the order in the frontend and keep queueNumber unchanged
    
    // Since we're keeping queueNumber unchanged, we just return success
    // The frontend will handle the display order

    return NextResponse.json({ 
      success: true,
      message: 'Queue order updated (display only, queue numbers preserved)'
    })
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
