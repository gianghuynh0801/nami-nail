
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Get or Create Salon
  const salon = await prisma.salon.findFirst()
  if (!salon) {
    console.error('No salon found. Please create a salon first.')
    return
  }
  const salonId = salon.id

  // Get Services
  const services = await prisma.service.findMany({ where: { salonId } })
  if (services.length === 0) {
    console.error('No services found. Please create services first.')
    return
  }
  const service = services[0]

  // Create/Get Staff
  const staffNames = ['Alice', 'Bob', 'Charlie', 'David']
  const StaffObjects = []

  for (const name of staffNames) {
    let s = await prisma.staff.findFirst({ where: { name, salonId } })
    if (!s) {
      s = await prisma.staff.create({
        data: {
          name,
          phone: `090000000${staffNames.indexOf(name)}`,
          salonId,
        }
      })
    }
    StaffObjects.push(s)
  }

  // Create Past Appointments & Invoices (To set initial Revenue)
  // Alice: $0 Revenue
  // Bob: $50 Revenue
  // Charlie: $100 Revenue
  // David: $150 Revenue

  const revenues = [0, 50, 100, 150]
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  for (let i = 0; i < StaffObjects.length; i++) {
    const s = StaffObjects[i]
    const revenue = revenues[i]

    if (revenue > 0) {
      // Create completed appointment
      const apt = await prisma.appointment.create({
        data: {
          customerName: 'Dummy Customer',
          customerPhone: '0912345678',
          serviceId: service.id,
          staffId: s.id,
          salonId,
          startTime: startOfMonth,
          endTime: new Date(startOfMonth.getTime() + 60 * 60 * 1000),
          status: 'COMPLETED',
          completedAt: new Date(startOfMonth.getTime() + 60 * 60 * 1000),
        }
      })

      // Create Invoice
      await prisma.invoice.create({
        data: {
          salonId,
          appointmentId: apt.id,
          totalAmount: revenue,
          finalAmount: revenue,
          status: 'PAID',
          paymentMethod: 'CASH',
          createdAt: startOfMonth, // In this month
        }
      })
    }
    
    // Create/Reset Priority
    // All set to same priority order to test Revenue Sorting
    const priority = await prisma.staffPriority.findUnique({ where: { staffId: s.id } })
    if (priority) {
      await prisma.staffPriority.update({
        where: { id: priority.id },
        data: { priorityOrder: 1, sortByRevenue: 'DESC' }
      })
    } else {
      await prisma.staffPriority.create({
        data: {
          staffId: s.id,
          salonId,
          priorityOrder: 1,
          sortByRevenue: 'DESC'
        }
      })
    }
  }

  console.log('Seed completed!')
  console.log('Expected Order (Lowest Revenue First): Alice ($0) -> Bob ($50) -> Charlie ($100) -> David ($150)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
