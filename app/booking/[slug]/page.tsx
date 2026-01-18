import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import BookingWizardEmbed from '@/components/booking-wizard/BookingWizardEmbed'

export default async function BookingPage({
  params,
}: {
  params: { slug: string }
}) {
  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug },
  })

  if (!salon) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Đặt lịch hẹn</h1>
          <p className="text-gray-600">tại {salon.name}</p>
        </div>
        
        <BookingWizardEmbed initialSalonId={salon.id} />
      </div>
    </div>
  )
}

