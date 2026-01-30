import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import { getSalonTz } from '@/lib/timezone'

const duplicateSchema = z.object({
  appointmentId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal('')),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { appointmentId, customerName, customerPhone, customerEmail } = duplicateSchema.parse(body)
    const normalizedEmail = customerEmail && customerEmail.trim() !== '' ? customerEmail.trim() : undefined

    const original = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        salon: true,
        appointmentServiceItems: true,
      },
    })

    if (!original) {
      return NextResponse.json({ error: 'Không tìm thấy lịch hẹn' }, { status: 404 })
    }

    const isOwner = session.user.role === 'OWNER' && original.salon.ownerId === session.user.id
    const hasCreate = session.user.permissions?.includes('CREATE_APPOINTMENT') || session.user.permissions?.includes('UPDATE_APPOINTMENT')
    if (!isOwner && !hasCreate) {
      return NextResponse.json({ error: 'Bạn không có quyền thao tác' }, { status: 403 })
    }

    const salonId = original.salonId
    const start = new Date(original.startTime)
    const end = new Date(original.endTime)
    const originalStaffId = original.staffId
    const serviceIds = original.appointmentServiceItems.map((i) => i.serviceId)

    if (serviceIds.length === 0) {
      return NextResponse.json({ error: 'Lịch gốc không có dịch vụ' }, { status: 400 })
    }

    const tz = getSalonTz(original.salon?.timezone)
    const dateStr = formatInTimeZone(start, tz, 'yyyy-MM-dd')
    const dayStartUtc = fromZonedTime(`${dateStr}T00:00:00`, tz)
    const dayOfWeek = toZonedTime(dayStartUtc, tz).getDay()

    const allStaff = await prisma.staff.findMany({
      where: {
        salonId,
        id: { not: originalStaffId },
      },
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
            OR: [
              { startTime: { lt: end }, endTime: { gt: start } },
            ],
          },
        },
        staffServices: {
          where: { serviceId: { in: serviceIds } },
        },
      },
    })

    const availableStaff = allStaff.filter((staff) => {
      if (staff.schedules.length === 0) return false
      const hasConflict = staff.appointments.some(
        (apt) =>
          (start >= new Date(apt.startTime) && start < new Date(apt.endTime)) ||
          (end > new Date(apt.startTime) && end <= new Date(apt.endTime)) ||
          (start <= new Date(apt.startTime) && end >= new Date(apt.endTime))
      )
      return !hasConflict
    })

    if (availableStaff.length === 0) {
      return NextResponse.json(
        { error: 'Không có thợ nào rảnh cùng giờ. Vui lòng chọn giờ khác hoặc thợ khác.' },
        { status: 400 }
      )
    }

    const chosenStaff = availableStaff[0]
    const staffId = chosenStaff.id

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

    const appointmentItemsData = original.appointmentServiceItems.map((item) => ({
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      servicePrice: item.servicePrice,
      serviceDuration: item.serviceDuration,
    }))

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
        notes: original.notes || undefined,
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

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[appointments/duplicate]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lỗi máy chủ' },
      { status: 500 }
    )
  }
}
