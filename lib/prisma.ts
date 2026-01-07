import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Log connection string for debugging (without password)
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')
  console.log('🔗 Prisma connecting with:', dbUrl)
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

