import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import BookingWizard from '@/components/booking/BookingWizard'

export default async function BookingPage({
  params,
}: {
  params: { slug: string }
}) {
  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug },
    include: {
      services: {
        orderBy: { name: 'asc' },
      },
      staff: {
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!salon) {
    notFound()
  }

  return <BookingWizard salon={salon} services={salon.services} staff={salon.staff} />
}

