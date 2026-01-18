
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

async function main() {
  const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'))
  const hasModel = models.includes('appointmentServiceItem')
  
  console.log('Available models:', models)
  console.log('Has AppointmentServiceItem:', hasModel)
  
  fs.writeFileSync('verify-output.txt', JSON.stringify({
    models,
    hasModel,
    env: process.env.NODE_ENV
  }, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
