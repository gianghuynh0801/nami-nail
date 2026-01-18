import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const bookingSchema = z.object({
  salonId: z.string(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal('')),
  serviceIds: z.array(z.string()).min(1),
  staffId: z.string(),
  startTime: z.string(),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { salonId, customerName, customerPhone, customerEmail, serviceIds, staffId, startTime, notes } =
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

    // Fetch all services
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } }
    })

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'Một số dịch vụ không tồn tại' },
        { status: 404 }
      )
    }

    // Calculate total duration considering staff overrides
    let totalDuration = 0
    // Use any[] to avoid build errors if Prisma types are not fully synchronized yet
    const appointmentItemsData: any[] = []

    for (const service of services) {
      // Lấy duration riêng của thợ cho dịch vụ này (nếu có)
      const staffService = await prisma.staffService.findUnique({
        where: {
          staffId_serviceId: {
            staffId,
            serviceId: service.id,
          },
        },
      })

      const duration = staffService?.duration ?? service.duration
      totalDuration += duration

      appointmentItemsData.push({
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price, // Snapshot price
        serviceDuration: duration,   // Snapshot duration
        // Không cần appointmentId - Prisma tự điền khi dùng nested write
      })
    }

    const end = new Date(start.getTime() + totalDuration * 60000)

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

    // Transaction to create appointment and items
    // Since we are using Prisma's nested writes, we can do it in one go (mostly)
    // But appointmentServiceItems relation needs to be created.
    
    // Use the first serviceId for the main record (backward compatibility or main service)
    const mainServiceId = serviceIds[0]

    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.id,
        salonId,
        customerName,
        customerPhone,
        serviceId: mainServiceId,
        staffId,
        startTime: start,
        endTime: end,
        status: 'CONFIRMED',
        notes: notes || undefined,
        appointmentServiceItems: {
          create: appointmentItemsData
        }
      } as any, // Cast to any to bypass stale types
      include: {
        service: true,
        staff: true,
        salon: true,
        appointmentServiceItems: true,
      } as any,
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
