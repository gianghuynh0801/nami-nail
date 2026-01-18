
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const fs = require('fs')

async function main() {
  console.log('Checking AppointmentServiceItem...')
  let output = ''
  if (prisma.appointmentServiceItem) {
    console.log('✅ prisma.appointmentServiceItem exists')
    output = 'EXISTS'
  } else {
    console.log('❌ prisma.appointmentServiceItem DOES NOT EXIST')
    const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'))
    console.log('Available models:', models)
    output = 'MISSING: ' + models.join(', ')
  }
  fs.writeFileSync('check-result.txt', output)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
