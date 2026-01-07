import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get salons
    const salons = salonId
      ? await prisma.salon.findMany({
          where: { id: salonId, ownerId: session.user.id },
        })
      : await prisma.salon.findMany({
          where: { ownerId: session.user.id },
        })

    const salonIds = salons.map(s => s.id)

    const dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter.gte = new Date(startDate)
      dateFilter.lte = new Date(endDate)
    }

    // Revenue statistics
    const invoices = await prisma.invoice.findMany({
      where: {
        salonId: { in: salonIds },
        status: 'PAID',
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      include: {
        items: {
          include: {
            service: true,
          },
        },
      },
    })

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.finalAmount, 0)
    const totalInvoices = invoices.length

    // Revenue by salon
    const revenueBySalon = await prisma.invoice.groupBy({
      by: ['salonId'],
      where: {
        salonId: { in: salonIds },
        status: 'PAID',
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      _sum: {
        finalAmount: true,
      },
      _count: {
        id: true,
      },
    })

    // Top services
    const serviceStats = await prisma.invoiceItem.groupBy({
      by: ['serviceId'],
      where: {
        invoice: {
          salonId: { in: salonIds },
          status: 'PAID',
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
      },
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc',
        },
      },
      take: 10,
    })

    const topServices = await Promise.all(
      serviceStats.map(async (stat) => {
        const service = await prisma.service.findUnique({
          where: { id: stat.serviceId },
        })
        return {
          service,
          quantity: stat._sum.quantity || 0,
          revenue: stat._sum.totalPrice || 0,
          count: stat._count.id,
        }
      })
    )

    // Staff performance
    const appointments = await prisma.appointment.findMany({
      where: {
        salonId: { in: salonIds },
        status: 'COMPLETED',
        startTime: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      include: {
        staff: true,
        service: true,
        invoice: true,
      },
    })

    const staffPerformance = appointments.reduce((acc: any, apt) => {
      const staffId = apt.staffId
      if (!acc[staffId]) {
        acc[staffId] = {
          staff: apt.staff,
          appointments: 0,
          revenue: 0,
        }
      }
      acc[staffId].appointments++
      if (apt.invoice) {
        acc[staffId].revenue += apt.invoice.finalAmount
      }
      return acc
    }, {})

    const staffPerformanceArray = Object.values(staffPerformance).sort(
      (a: any, b: any) => b.revenue - a.revenue
    )

    // Revenue by date (for chart)
    const revenueByDate = await prisma.invoice.groupBy({
      by: ['createdAt'],
      where: {
        salonId: { in: salonIds },
        status: 'PAID',
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      _sum: {
        finalAmount: true,
      },
    })

    // Appointments statistics
    const appointmentStats = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        salonId: { in: salonIds },
        startTime: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      _count: {
        id: true,
      },
    })

    return NextResponse.json({
      totalRevenue,
      totalInvoices,
      revenueBySalon: revenueBySalon.map(r => ({
        salon: salons.find(s => s.id === r.salonId),
        revenue: r._sum.finalAmount || 0,
        count: r._count.id,
      })),
      topServices,
      staffPerformance: staffPerformanceArray,
      revenueByDate: revenueByDate.map(r => ({
        date: r.createdAt,
        revenue: r._sum.finalAmount || 0,
      })),
      appointmentStats: appointmentStats.reduce((acc: any, stat) => {
        acc[stat.status] = stat._count.id
        return acc
      }, {}),
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

