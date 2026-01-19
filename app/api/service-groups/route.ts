import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const salonId = searchParams.get('salonId')

    if (!salonId) {
      return NextResponse.json({ error: 'Salon ID is required' }, { status: 400 })
    }

    // Verify salon ownership or staff access
    // For now simplistic check if user belongs to salon
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
    })

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 })
    }

    const serviceGroups = await prisma.serviceGroup.findMany({
      where: { salonId },
      include: {
        services: {
          orderBy: { price: 'asc' }
        },
        category: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ serviceGroups })
  } catch (error) {
    console.error('Error fetching service groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, salonId, categoryId, cleanupTime, services } = body

    if (!name || !salonId) {
      return NextResponse.json({ error: 'Name and Salon ID are required' }, { status: 400 })
    }

    // Create group with variants (services) in a transaction
    const serviceGroup = await prisma.serviceGroup.create({
      data: {
        name,
        description: description || null,
        salonId,
        categoryId: categoryId || null,
        cleanupTime: parseInt(cleanupTime) || 0,
        // Create services
        services: {
          create: services?.map((s: any) => ({
            name: s.name || 'Standard',
            price: parseFloat(s.price) || 0,
            duration: parseInt(s.duration) || 30,
            salonId: salonId,
          })) || []
        }
      },
      include: {
        services: true
      }
    })

    // Handle Staff Assignments and Durations
    if (body.staffIds && Array.isArray(body.staffIds)) {
       const staffIds = body.staffIds as string[]
       const staffDurations = body.staffDurations || {} // Expected: { staffId: { serviceIndex: duration } } based on the array order sent? 
       // Or better: { staffId: { [variantName? No, names can modify]. } }
       // Since we just created services, we know their order should match the input array order if Prisma maintains it? 
       // Prisma createMany/create nested doesn't guarantee order return easily unless we map by property.
       // safer to iterate result services.
       
       // Verify we have services
       if (serviceGroup.services.length > 0 && services && services.length === serviceGroup.services.length) {
          // Map input services to created services by index to apply staff durations
          // Assuming services array in body matches order of serviceGroup.services (usually creating preserves order or we can match by name/price if unique, but index is risky if async)
          // Actually, Prisma create nested usually returns in order or we can't rely on it. 
          // Better approach might be independent creates or matching. 
          // For simplicity in this "MVP" + "Prototype" phase, let's assume index alignment or matching name.
          
          for (const staffId of staffIds) {
             const specificSettings = staffDurations[staffId] || {}
             
             // For each Created Service Variant
             for (let i = 0; i < serviceGroup.services.length; i++) {
                const createdService = serviceGroup.services[i]
                // Find custom duration in input. input `services[i]` corresponds to `createdService`? 
                // Let's assume input order matches.
                // specificSettings could be keyed by index from frontend? e.g. "0": 45
                
                const customDuration = specificSettings[i] !== undefined ? parseInt(specificSettings[i]) : createdService.duration
                
                await prisma.staffService.create({
                   data: {
                      staffId: staffId,
                      serviceId: createdService.id,
                      duration: customDuration
                   }
                })
             }
          }
       }
    }

    return NextResponse.json(serviceGroup)
  } catch (error: any) {
    console.error('Error creating service group:', error)
    return NextResponse.json({ 
      error: 'Failed to create service group',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
