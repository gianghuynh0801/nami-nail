import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import { getSalonTz } from '@/lib/timezone'

const customerInputSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal('')),
})

const bookingSchema = z.object({
  salonId: z.string(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().min(1).optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customers: z.array(customerInputSchema).optional(),
  serviceIds: z.array(z.string()).min(1),
  staffId: z.string(),
  startTime: z.string(),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = bookingSchema.parse(body)
    const { salonId, serviceIds, startTime, notes } = parsed

    const useMultiple = Array.isArray(parsed.customers) && parsed.customers.length > 1
    const customerList = useMultiple
      ? parsed.customers!
      : [{
          customerName: parsed.customerName ?? '',
          customerPhone: parsed.customerPhone ?? '',
          customerEmail: parsed.customerEmail ?? '',
        }]

    if (customerList.length === 0 || customerList.some((c) => !c.customerName?.trim() || !c.customerPhone?.trim())) {
      return NextResponse.json(
        { error: 'Vui lòng nhập tên và số điện thoại cho tất cả khách hàng.' },
        { status: 400 }
      )
    }

    const staffId = parsed.staffId

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

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    })
    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'Một số dịch vụ không tồn tại' },
        { status: 404 }
      )
    }

    const buildAppointmentItems = async (staffIdForDuration: string) => {
      let totalDuration = 0
      const items: any[] = []
      for (const service of services) {
        const staffService = await prisma.staffService.findUnique({
          where: {
            staffId_serviceId: { staffId: staffIdForDuration, serviceId: service.id },
          },
        })
        const duration = staffService?.duration ?? service.duration
        totalDuration += duration
        items.push({
          serviceId: service.id,
          serviceName: service.name,
          servicePrice: service.price,
          serviceDuration: duration,
        })
      }
      return { totalDuration, items }
    }

    const { totalDuration, items: appointmentItemsData } = await buildAppointmentItems(staffId)
    const end = new Date(start.getTime() + totalDuration * 60000)
    const mainServiceId = serviceIds[0]

    const salonRecord = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { timezone: true },
    })
    const tz = getSalonTz(salonRecord?.timezone)
    const dateStr = formatInTimeZone(start, tz, 'yyyy-MM-dd')
    const dayStartUtc = fromZonedTime(`${dateStr}T00:00:00`, tz)
    const dayOfWeek = toZonedTime(dayStartUtc, tz).getDay()

    const findAvailableStaff = async (excludeStaffIds: string[]) => {
      const all = await prisma.staff.findMany({
        where: { salonId, id: { notIn: excludeStaffIds } },
        include: {
          schedules: {
            where: {
              dayOfWeek,
              OR: [{ date: null }, { date: dayStartUtc }],
            },
          },
          appointments: {
            where: {
              status: { not: 'CANCELLED' },
              OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
            },
          },
        },
      })
      return all.filter((staff) => {
        if (staff.schedules.length === 0) return false
        const hasConflict = staff.appointments.some(
          (apt) =>
            (start >= new Date(apt.startTime) && start < new Date(apt.endTime)) ||
            (end > new Date(apt.startTime) && end <= new Date(apt.endTime)) ||
            (start <= new Date(apt.startTime) && end >= new Date(apt.endTime))
        )
        return !hasConflict
      })
    }

    const getOrCreateCustomer = async (
      customerName: string,
      customerPhone: string,
      customerEmail: string | undefined
    ) => {
      const normalizedEmail =
        customerEmail && customerEmail.trim() !== '' ? customerEmail.trim() : undefined
      let customer = await prisma.customer.findUnique({
        where: { phone: customerPhone },
      })
      if (!customer) {
        let user = await prisma.user.findUnique({
          where: { phone: customerPhone },
        })
        if (!user) {
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
        customer = await prisma.customer.create({
          data: {
            userId: user.id,
            name: customerName,
            phone: customerPhone,
            email: normalizedEmail,
          },
        })
      }
      return customer
    }

    const usedStaffIds: string[] = []
    const createdAppointments: any[] = []

    for (let i = 0; i < customerList.length; i++) {
      const { customerName, customerPhone, customerEmail } = customerList[i]
      const normalizedEmail =
        customerEmail && customerEmail.trim() !== '' ? customerEmail.trim() : undefined
      let currentStaffId: string

      if (i === 0) {
        currentStaffId = staffId
      } else {
        const available = await findAvailableStaff(usedStaffIds)
        if (available.length === 0) {
          return NextResponse.json(
            {
              error: `Không đủ thợ rảnh cùng giờ cho ${customerList.length} khách. Vui lòng chọn giờ khác hoặc giảm số lượng khách.`,
            },
            { status: 400 }
          )
        }
        currentStaffId = available[0].id
      }

      if (i === 0) {
        const overlapping = await prisma.appointment.findFirst({
          where: {
            staffId,
            salonId,
            status: { not: 'CANCELLED' },
            OR: [
              { AND: [{ startTime: { lte: start } }, { endTime: { gt: start } }] },
              { AND: [{ startTime: { lt: end } }, { endTime: { gte: end } }] },
              { AND: [{ startTime: { gte: start } }, { endTime: { lte: end } }] },
            ],
          },
        })
        if (overlapping) {
          return NextResponse.json(
            { error: 'Thời gian này đã được đặt. Vui lòng chọn thời gian khác.' },
            { status: 400 }
          )
        }
      }

      usedStaffIds.push(currentStaffId)
      const customer = await getOrCreateCustomer(customerName, customerPhone, normalizedEmail)

      const appointment = await prisma.appointment.create({
        data: {
          customerId: customer.id,
          salonId,
          customerName,
          customerPhone,
          serviceId: mainServiceId,
          staffId: currentStaffId,
          startTime: start,
          endTime: end,
          status: 'CONFIRMED',
          notes: notes || undefined,
          appointmentServiceItems: {
            create: appointmentItemsData,
          },
        } as any,
        include: {
          service: true,
          staff: true,
          salon: true,
          appointmentServiceItems: true,
        } as any,
      })
      createdAppointments.push(appointment)
    }

    if (createdAppointments.length === 1) {
      return NextResponse.json({ appointment: createdAppointments[0] }, { status: 201 })
    }
    return NextResponse.json({ appointments: createdAppointments }, { status: 201 })
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
