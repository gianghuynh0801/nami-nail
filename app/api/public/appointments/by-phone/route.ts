import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { startOfDay, endOfDay } from 'date-fns'

const phoneSchema = z.object({
  phone: z.string().min(10, 'Số điện thoại không hợp lệ'),
})

// Public API - không cần authentication
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone } = phoneSchema.parse(body)

    // Tìm appointments theo số điện thoại
    // Chỉ lấy các appointments chưa hoàn thành và chưa bị hủy
    const appointments = await prisma.appointment.findMany({
      where: {
        customerPhone: phone,
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
        // Chỉ lấy appointments từ hôm nay trở đi
        startTime: {
          gte: startOfDay(new Date()),
        },
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
        staff: {
          select: {
            id: true,
            name: true,
            phone: true,
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
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json({ appointments })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error fetching appointments by phone:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
