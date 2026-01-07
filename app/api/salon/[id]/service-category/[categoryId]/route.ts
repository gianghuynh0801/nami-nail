import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
})

export async function PUT(
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
    const updateData = updateCategorySchema.parse(body)

    const updated = await prisma.serviceCategory.update({
      where: { id: params.categoryId },
      data: updateData,
    })

    return NextResponse.json({ category: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating service category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    await prisma.serviceCategory.delete({
      where: { id: params.categoryId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
