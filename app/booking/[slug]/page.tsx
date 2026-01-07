import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import BookingForm from '@/components/BookingForm'
import SalonInfo from '@/components/SalonInfo'

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-beige-light via-white to-beige-light relative overflow-hidden">
      <div className="container mx-auto px-4 py-8 md:py-12 relative z-10">
        <div className="max-w-2xl mx-auto">
          <SalonInfo name={salon.name} address={salon.address} phone={salon.phone} />

          <div className="card-modern rounded-2xl p-6 md:p-8 animate-fade-in">
            <h2 className="text-3xl font-bold gradient-text mb-6 text-center">
              Book Appointment
            </h2>
            <BookingForm salon={salon} services={salon.services} staff={salon.staff} />
          </div>
        </div>
      </div>
    </div>
  )
}

