import { prisma } from '@/lib/prisma'
import BookingWizard from '@/components/booking/BookingWizard'

// Force dynamic: always fetch latest salons from DB (avoid static build showing old branch list on production)
export const dynamic = 'force-dynamic'

export default async function BookingPage() {
  const salons = await prisma.salon.findMany({
    orderBy: { name: 'asc' },
  })

  // Debug: log on server (pm2 logs) to verify DB returns correct count
  if (process.env.NODE_ENV === 'production') {
    console.log('[booking] salons from DB:', salons.length, salons.map((s) => s.name))
  }

  return <BookingWizard salons={salons} />
}
