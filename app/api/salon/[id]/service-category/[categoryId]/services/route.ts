import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const assignServicesSchema = z.object({
  serviceIds: z.array(z.string()),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string; categoryId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const salon = await prisma.salon.findUnique({
      where: { id: params.id },
    })

    if (!salon || (session.user.role !== 'OWNER' || salon.ownerId !== session.user.id)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const category = await prisma.serviceCategory.findUnique({
      where: { id: params.categoryId },
    })

    if (!category || category.salonId !== params.id) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { serviceIds } = assignServicesSchema.parse(body)

    // Verify all services belong to this salon
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        salonId: params.id,
      },
    })

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'Some services not found or do not belong to this salon' },
        { status: 400 }
      )
    }

    // Remove existing assignments for this category
    await prisma.serviceCategoryService.deleteMany({
      where: { categoryId: params.categoryId },
    })

    // Create new assignments
    if (serviceIds.length > 0) {
      await prisma.serviceCategoryService.createMany({
        data: serviceIds.map(serviceId => ({
          categoryId: params.categoryId,
          serviceId,
        })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error assigning services to category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
