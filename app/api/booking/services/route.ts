import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const salonId = searchParams.get('salonId')

    if (!salonId) {
      return NextResponse.json(
        { error: 'salonId is required' },
        { status: 400 }
      )
    }

    // Fetch services with their categories
    const services = await prisma.service.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    })

    // Fetch all categories for this salon
    const categories = await prisma.serviceCategory.findMany({
      where: { salonId },
      orderBy: { order: 'asc' },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    })

    // Transform services to include categoryIds
    const servicesWithCategories = services.map(service => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      salonId: service.salonId,
      categoryIds: service.categories.map(sc => sc.categoryId),
    }))

    return NextResponse.json({
      services: servicesWithCategories,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        order: cat.order,
        serviceIds: cat.services.map(sc => sc.serviceId),
      })),
    })
  } catch (error) {
    console.error('Error fetching services for booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
