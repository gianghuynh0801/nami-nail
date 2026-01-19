const { PrismaClient } = require('@prisma/client')
const { startOfDay, parseISO, isSameDay } = require('date-fns')

const prisma = new PrismaClient()

async function main() {
  const staffName = 'Test' // User mentioned "Test" staff
  const targetDateStr = '2026-01-20' // The specific date 

  console.log(`--- Debugging Schedule for ${staffName} on ${targetDateStr} ---`)

  // 1. Find Staff
  const staff = await prisma.staff.findFirst({
    where: { name: { contains: staffName } },
    include: {
      schedules: true
    }
  })

  if (!staff) {
    console.log('Staff not found!')
    return
  }

  console.log(`Staff Found: ${staff.name} (${staff.id})`)
  
  // 2. Check Stored Schedules
  console.log('\n--- All Schedules for Staff ---')
  staff.schedules.forEach(s => {
    console.log(`ID: ${s.id}`)
    console.log(`  DayOfWeek: ${s.dayOfWeek}`)
    console.log(`  Time: ${s.startTime} - ${s.endTime}`)
    console.log(`  Date (Raw): ${s.date}`)
    console.log(`  Date (ISO): ${s.date ? s.date.toISOString() : 'null'}`)
    
    if (s.date) {
        // Simulate Logic in route.ts
        const dayStart = startOfDay(parseISO(targetDateStr))
        const match = isSameDay(s.date, dayStart)
        console.log(`  Matches ${targetDateStr}? ${match}`)
        if (match) console.log('  *** THIS SHOULD BE SELECTED ***')
    }
  })

  // 3. Simulate Route Logic EXACTLY
  console.log('\n--- Simulating Route Logic ---')
  const date = parseISO(targetDateStr)
  const dayStart = startOfDay(date)
  console.log(`Search Date: ${targetDateStr}`)
  console.log(`dayStart: ${dayStart.toISOString()}`)
  
  const specific = staff.schedules.find(sch => sch.date && isSameDay(sch.date, dayStart))
  const recurring = staff.schedules.find(sch => !sch.date && sch.dayOfWeek === date.getDay())
  
  console.log(`Found Specific: ${specific ? 'YES' : 'NO'}`)
  console.log(`Found Recurring: ${recurring ? 'YES' : 'NO'}`)
  console.log(`Selected: ${specific ? 'Specific' : (recurring ? 'Recurring' : 'NONE')}`)

}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
