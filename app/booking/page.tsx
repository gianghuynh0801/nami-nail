import { prisma } from '@/lib/prisma'
import BookingWizard from '@/components/booking/BookingWizard'

export default async function BookingPage() {
  const salons = await prisma.salon.findMany({
    orderBy: { name: 'asc' },
  })

  return <BookingWizard salons={salons} />
}
