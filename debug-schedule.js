const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const staffName = 'Test'
  console.log(`Searching for staff: ${staffName}`)

  const staff = await prisma.staff.findMany({
    where: { name: { contains: staffName } },
    include: {
      schedules: true
    }
  })

  console.log(`Found ${staff.length} staff members.`)

  for (const s of staff) {
    console.log(`\nStaff: ${s.name} (ID: ${s.id})`)
    console.log(`Salon ID: ${s.salonId}`)
    console.log('Schedules:')
    if (s.schedules.length === 0) {
      console.log('  No schedules found.')
    } else {
      s.schedules.forEach(sch => {
        console.log(`  - ID: ${sch.id}`)
        console.log(`    DayOfWeek: ${sch.dayOfWeek}`)
        console.log(`    Time: ${sch.startTime} - ${sch.endTime}`)
        console.log(`    Date: ${sch.date ? sch.date.toISOString() : 'NULL'}`)
      })
    }
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
