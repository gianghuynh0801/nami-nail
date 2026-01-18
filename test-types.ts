import { PrismaClient } from '@prisma/client'

async function checkTypes() {
  const prisma = new PrismaClient()
  const user = await prisma.user.findFirst({
    select: {
      id: true,
      permissions: true // This should pass if types are correct
    }
  })
}
