import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const bookingSchema = z.object({
  salonId: z.string(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal('')),
  serviceId: z.string(),
  staffId: z.string(),
  startTime: z.string(),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { salonId, customerName, customerPhone, customerEmail, serviceId, staffId, startTime, notes } =
      bookingSchema.parse(body)
    
    // Normalize email - convert empty string to undefined
    const normalizedEmail = customerEmail && customerEmail.trim() !== '' ? customerEmail.trim() : undefined

    // Validate and parse startTime
    const start = new Date(startTime)
    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: 'Thời gian không hợp lệ' },
        { status: 400 }
      )
    }
    
    // Check if start time is in the past
    if (start < new Date()) {
      return NextResponse.json(
        { error: 'Không thể đặt lịch trong quá khứ' },
        { status: 400 }
      )
    }

    // Tìm hoặc tạo Customer
    let customer = await prisma.customer.findUnique({
      where: { phone: customerPhone },
    })

    if (!customer) {
      // Tạo User cho customer (nếu chưa có)
      let user = await prisma.user.findUnique({
        where: { phone: customerPhone },
      })

      if (!user) {
        // Tạo password mặc định (có thể gửi SMS sau)
        const defaultPassword = await bcrypt.hash(customerPhone.slice(-6), 10)
        user = await prisma.user.create({
          data: {
            name: customerName,
            phone: customerPhone,
            email: normalizedEmail,
            password: defaultPassword,
            role: 'CUSTOMER',
          },
        })
      }

      // Tạo Customer
      customer = await prisma.customer.create({
        data: {
          userId: user.id,
          name: customerName,
          phone: customerPhone,
          email: normalizedEmail,
        },
      })
    }

    // Lấy duration riêng của thợ cho dịch vụ
    const staffService = await prisma.staffService.findUnique({
      where: {
        staffId_serviceId: {
          staffId,
          serviceId,
        },
      },
    })

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    const duration = staffService?.duration ?? service.duration
    const end = new Date(start.getTime() + duration * 60000)

    // Check for overlapping appointments
    const overlapping = await prisma.appointment.findFirst({
      where: {
        staffId,
        salonId,
        status: {
          not: 'CANCELLED',
        },
        OR: [
          {
            AND: [
              { startTime: { lte: start } },
              { endTime: { gt: start } },
            ],
          },
          {
            AND: [
              { startTime: { lt: end } },
              { endTime: { gte: end } },
            ],
          },
          {
            AND: [
              { startTime: { gte: start } },
              { endTime: { lte: end } },
            ],
          },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: 'Thời gian này đã được đặt. Vui lòng chọn thời gian khác.' },
        { status: 400 }
      )
    }

    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.id,
        salonId,
        customerName,
        customerPhone,
        serviceId,
        staffId,
        startTime: start,
        endTime: end,
        status: 'PENDING',
        notes: notes || undefined,
      },
      include: {
        service: true,
        staff: true,
        salon: true,
      },
    })

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    console.error('Booking API Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any
      
      // Unique constraint violation
      if (prismaError.code === 'P2002') {
        const field = prismaError.meta?.target?.[0] || 'field'
        return NextResponse.json(
          { error: `${field === 'phone' ? 'Số điện thoại' : field === 'email' ? 'Email' : 'Thông tin'} đã tồn tại trong hệ thống` },
          { status: 400 }
        )
      }
      
      // Record not found
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: 'Không tìm thấy dữ liệu yêu cầu' },
          { status: 404 }
        )
      }
      
      // Foreign key constraint
      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.' },
          { status: 400 }
        )
      }
    }
    
    // Return error message if available
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

