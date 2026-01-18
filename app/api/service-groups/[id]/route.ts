import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const group = await prisma.serviceGroup.findUnique({
      where: { id: params.id },
      include: {
        services: {
          orderBy: { price: 'asc' },
          include: {
             staffServices: true
          }
        },
        category: true
      }
    })

    if (!group) {
        return NextResponse.json({ error: 'Service Group not found' }, { status: 404 })
    }

    return NextResponse.json(group)
  } catch (error) {
    console.error('Error fetching service group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, categoryId, cleanupTime, services } = body // Extract categoryId and cleanupTime

    // Start transaction to update group and handle variants
    const updatedGroup = await prisma.$transaction(async (tx) => {
      // 1. Update Group Info
      const group = await tx.serviceGroup.update({
        where: { id: params.id },
        data: {
          name,
          description,
          categoryId: categoryId || null,
          cleanupTime: cleanupTime || 0,
        },
        include: { services: true }
      })

      // 2. Handle Services (Variants)
      let currentServices = group.services
      if (services && Array.isArray(services)) {
        const currentServiceIds = services
          .filter((s: any) => s.id)
          .map((s: any) => s.id)

        // Delete removed services
        await tx.service.deleteMany({
          where: {
            serviceGroupId: params.id,
            id: { notIn: currentServiceIds },
          }
        })

        // Upsert variants
        for (const service of services) {
          if (service.id) {
            await tx.service.update({
              where: { id: service.id },
              data: {
                name: service.name,
                price: parseFloat(service.price),
                duration: parseInt(service.duration),
              }
            })
          } else {
            await tx.service.create({
              data: {
                name: service.name,
                price: parseFloat(service.price),
                duration: parseInt(service.duration),
                salonId: group.salonId,
                serviceGroupId: group.id
              }
            })
          }
        }
        
        // Refresh services list for staff assignment
        const refreshedGroup = await tx.serviceGroup.findUnique({
          where: { id: params.id },
          include: { services: { orderBy: { price: 'asc' } } }
        })
        if (refreshedGroup) currentServices = refreshedGroup.services
      }

      // 3. Handle Staff Assignments and Durations
      // If staffIds is present, we sync the StaffService records
      if (body.staffIds && Array.isArray(body.staffIds)) {
        const staffIds = body.staffIds as string[]
        const staffDurations = body.staffDurations || {} // { staffId: { variantIndex: duration } }
        
        // Get all valid service IDs belonging to this group
        const validServiceIds = currentServices.map(s => s.id)

        // Delete StaffService for staff NOT in the new list (for these services)
        await tx.staffService.deleteMany({
          where: {
            serviceId: { in: validServiceIds },
            staffId: { notIn: staffIds }
          }
        })

        // Upsert StaffService for provided staff
        for (const staffId of staffIds) {
           const specificSettings = staffDurations[staffId] || {}
           
           // We need to map Input Services -> Created/Updated Services to find the intended duration
           // This is tricky because `services` array in body might have mixed IDs and new items.
           // `currentServices` (from DB) is ordered by price ASC (see findUnique above).
           // The simple index mapping from frontend `staffDurations` relies on the order presented in Frontend.
           // CRITICAL: Frontend must send `staffDurations` keyed by `serviceId` if possible, OR we rely on order. 
           // If new service, frontend doesn't have ID. 
           // Recommendation: map by index of the `services` Payload.
           // Current logic in POST assumed index match. 
           // Here, `services` payload usually drives the UI order.
           // BUT `currentServices` from DB might be reordered by price.
           // To match correctly:
           // Iterate `services` payload (which dictates the "Index" used in staffDurations).
           // Find corresponding DB service (by ID if exists, or match parameters/recently created).
           // This matching is hard for "newly created inside transaction" without returned IDs inline.
           // ALTERNATIVE: Just update defaults for now, and rely on `service.duration`.
           // REAL FIX: Frontend should probably send `staffDurations` as { staffId: { "TEMPID_0": 15, "EXISTING_ID": 30 } }?
           // Complex.
           // SIMPLIFICATION:
           // If we assume the services list is small (variants), we can try to match.
           // Or, update `StaffService` independent of this loop?
           // Let's iterate `currentServices` and try to find matching input service to get index/duration?
           // If names are unique-ish? 
           // Let's assume input order == saved order is NOT guaranteed with `orderBy: price`.
           
           // Better strategy: iterate the INPUT `services` array.
           // For each input `s`, find the `realService` in `currentServices` (match by ID or Name+Price+Duration).
           // Then use that `realService.id` and `staffDurations[staffId][inputIndex]`.
           
           for (let i = 0; i < services.length; i++) {
              const inputService = services[i]
              
              // Find matching real service
              let realService = null
              if (inputService.id) {
                 realService = currentServices.find(cs => cs.id === inputService.id)
              } else {
                 // Try to match new service by props (weak) or assume it's one of the new ones.
                 // This is weak. 
                 // If we trust that we just created/updated them, maybe we can just use `currentServices`?
                 // If the user didn't reorder, `services` input should roughly match.
                 // Let's fallback to `currentServices` iteration if we can't map.
                 // Actually, if we use `currentServices`:
                 // We don't know which "index" in `staffDurations` corresponds to it if we sort by price.
                 
                 // LETS PIVOT:
                 // Update frontend to send `serviceId` in keys? No, for new services we don't have IDs.
                 // Update frontend to send specific structure: `services` array includes `staffDurations` inside it? 
                 // e.g. services: [{ name: "A", staffDurations: { "staffA": 30 } }]
                 // THIS IS MUCH BETTER. Encapsulate duration settings IN the service object.
                 // Backend: POST and PUT can then read `s.staffDurations`.
                 
                 // BUT, the plan was separate `staffDurations`. 
                 // I will stick to separate for `POST` (since all new, easy).
                 // For `PUT`, I will try to support `staffDurations` keyed by ServiceID if exists, OR index of valid services?
                 
                 // Let's look at `inputService`. 
                 // If `inputService.id` exists, use `staffDurations[staffId][inputService.id]`.
                 // If not, maybe use `staffDurations[staffId][index]`?
                 // This requires frontend to be smart.
                 
                 // Let's implement the matching logic:
                 // Iterate `currentServices`.
                 // Find which entry in `body.services` it corresponds to.
                 // Use that entry's index or ID to look up duration.
                 
                  realService = currentServices.find(cs => 
                    (inputService.id && cs.id === inputService.id) || 
                    (!inputService.id && cs.name === inputService.name && cs.price === parseFloat(inputService.price))
                  )
              }
              
              if (realService) {
                 // Check specific duration in nested map
                 let customDuration = undefined
                 const staffSettings = staffDurations[staffId]
                 if (staffSettings) {
                    // Try key by ID first
                    if (realService.id && staffSettings[realService.id] !== undefined) {
                        customDuration = parseInt(staffSettings[realService.id])
                    } 
                    // Fallback to index if available and NO ID key found? 
                    // Actually, if frontend sends index, it's safer to use index of `services` array loop `i`.
                     else if (staffSettings[i] !== undefined) {
                        customDuration = parseInt(staffSettings[i])
                    }
                 }
                 
                 if (customDuration === undefined) customDuration = realService.duration
                 
                 // Up sert
                 const existing = await tx.staffService.findUnique({
                    where: { staffId_serviceId: { staffId: staffId, serviceId: realService.id } }
                 })
                 
                 if (existing) {
                    if (existing.duration !== customDuration) {
                       await tx.staffService.update({
                          where: { id: existing.id },
                          data: { duration: customDuration }
                       })
                    }
                 } else {
                    await tx.staffService.create({
                       data: {
                          staffId: staffId,
                          serviceId: realService.id,
                          duration: customDuration
                       }
                    })
                 }
              }
           }
        }
      }

      return await tx.serviceGroup.findUnique({
        where: { id: params.id },
        include: { services: { orderBy: { price: 'asc' } } }
      })
    })

    return NextResponse.json(updatedGroup)
  } catch (error) {
    console.error('Error updating service group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if group exists
    const group = await prisma.serviceGroup.findUnique({
      where: { id: params.id },
      include: { services: true }
    })

    if (!group) {
        return NextResponse.json({ error: 'Service Group not found' }, { status: 404 })
    }

    // Logic for deleting:
    // Option 1: Delete group only, unlink services (SetNull - Default behavior in schema)
    // Option 2: Delete group AND its services (Cascade)
    // User probably implies "Delete this whole entry".
    // Since Service model has `group ServiceGroup? @relation(..., onDelete: SetNull)`,
    // deleting the group will just unlink the services.
    // If we want to delete services too (variants), we must do it manually or change schema.
    // Given the UI shows variants as *part* of a group, deleting the group usually means deleting the variants too.
    
    // Let's DELETE the variants too to keep it clean, unless they have appointments?
    // Appointments link to Service. If unique service is deleted, Cascade Appointment? 
    // Schema: Appointment -> Service (Cascade) => Deleting Service deletes Appointments! DANGEROUS.
    
    // SAFE APPROACH: 
    // Only delete the GROUP record. The Services become "orphan" (no group).
    // Or, we prevent delete if there are active bookings.
    // Let's stick to Schema behavior: SetNull. Services remain but areungrouped.
    // User can manually delete services if they want.
    
    await prisma.serviceGroup.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Service group deleted' })
  } catch (error) {
    console.error('Error deleting service group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
