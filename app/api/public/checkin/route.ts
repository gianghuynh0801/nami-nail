import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const checkinSchema = z.object({
  appointmentId: z.string(),
  phone: z.string().min(10, 'Số điện thoại không hợp lệ'),
})

// Public API - không cần authentication
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { appointmentId, phone } = checkinSchema.parse(body)

    // Get appointment và verify số điện thoại
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        salon: true,
      },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Không tìm thấy lịch hẹn' },
        { status: 404 }
      )
    }

    // Verify số điện thoại khớp
    if (appointment.customerPhone !== phone) {
      return NextResponse.json(
        { error: 'Số điện thoại không khớp với lịch hẹn' },
        { status: 403 }
      )
    }

    // Chỉ cho phép check-in với status CONFIRMED hoặc PENDING
    if (!['CONFIRMED', 'PENDING'].includes(appointment.status)) {
      return NextResponse.json(
        { error: `Không thể check-in. Trạng thái hiện tại: ${appointment.status === 'CHECKED_IN' ? 'Đã check-in' : appointment.status === 'IN_PROGRESS' ? 'Đang thực hiện' : appointment.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã hủy'}` },
        { status: 400 }
      )
    }

    // Get the next queue number for today
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    
    const lastQueueNumber = await prisma.appointment.findFirst({
      where: {
        salonId: appointment.salonId,
        checkedInAt: { gte: todayStart },
        queueNumber: { not: null },
      },
      orderBy: { queueNumber: 'desc' },
      select: { queueNumber: true },
    })

    const nextQueueNumber = (lastQueueNumber?.queueNumber || 0) + 1

    // Update appointment
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: now,
        queueNumber: nextQueueNumber,
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
        salon: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json({ 
      appointment: updated,
      queueNumber: nextQueueNumber,
      message: 'Check-in thành công!',
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
