import { prisma } from '@/lib/prisma'
import BookingWizard from '@/components/booking/BookingWizard'

// Force dynamic: always fetch latest salons from DB (avoid static build showing old branch list on production)
export const dynamic = 'force-dynamic'

export default async function BookingPage() {
  const salons = await prisma.salon.findMany({
    orderBy: { name: 'asc' },
  })

  return <BookingWizard salons={salons} />
}
