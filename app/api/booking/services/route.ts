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

    // Fetch service groups with their variants (services) and category
    const serviceGroups = await prisma.serviceGroup.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
      include: {
        services: {
          orderBy: { price: 'asc' },
        },
        category: true,
      },
    })

    // Fetch all categories for this salon
    const categories = await prisma.serviceCategory.findMany({
      where: { salonId },
      orderBy: { order: 'asc' },
    })

    // Transform service groups to a flat list of selectable services (variants)
    // Each variant is a bookable service with its parent group info
    const services = serviceGroups.flatMap(group => 
      group.services.map(service => ({
        id: service.id,
        name: group.services.length === 1 
          ? group.name  // If only one variant, use group name
          : `${group.name} - ${service.name}`, // Combine group and variant name
        price: service.price,
        duration: service.duration,
        salonId: service.salonId,
        groupId: group.id,
        groupName: group.name,
        categoryId: group.categoryId,
        categoryName: group.category?.name || null,
      }))
    )

    // Also include any standalone services (without a group) for backward compatibility
    const standaloneServices = await prisma.service.findMany({
      where: { 
        salonId,
        serviceGroupId: null // Services without a group
      },
      orderBy: { createdAt: 'desc' },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    })

    const allServices = [
      ...services,
      ...standaloneServices.map(service => ({
        id: service.id,
        name: service.name,
        price: service.price,
        duration: service.duration,
        salonId: service.salonId,
        groupId: null,
        groupName: null,
        categoryId: service.categories[0]?.categoryId || null,
        categoryName: service.categories[0]?.category?.name || null,
      }))
    ]

    return NextResponse.json({
      services: allServices,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        order: cat.order,
        // Get service IDs that belong to this category
        serviceIds: allServices
          .filter(s => s.categoryId === cat.id)
          .map(s => s.id),
      })),
      // Also return service groups for grouped display
      serviceGroups: serviceGroups.map(group => ({
        id: group.id,
        name: group.name,
        categoryId: group.categoryId,
        categoryName: group.category?.name || null,
        services: group.services.map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration: s.duration,
        })),
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
