import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const salonId = searchParams.get('salonId')

    if (!salonId) {
      return NextResponse.json(
        { error: 'Missing salonId parameter' },
        { status: 400 }
      )
    }

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      include: {
        services: {
          orderBy: { name: 'asc' },
        },
        staff: {
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!salon) {
      return NextResponse.json(
        { error: 'Salon not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      salon: {
        id: salon.id,
        name: salon.name,
        slug: salon.slug,
        address: salon.address,
        phone: salon.phone,
      },
      services: salon.services,
      staff: salon.staff,
    })
  } catch (error) {
    console.error('Error fetching salon data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
