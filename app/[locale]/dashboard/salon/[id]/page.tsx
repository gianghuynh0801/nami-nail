import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale/vi'
import BookingLinkCard from '@/components/dashboard/BookingLinkCard'

export default async function SalonDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  const salon = await prisma.salon.findUnique({
    where: { id: params.id },
    include: {
      services: true,
      staff: true,
      appointments: {
        include: {
          service: true,
          staff: true,
        },
        orderBy: {
          startTime: 'desc',
        },
        take: 10,
      },
      _count: {
        select: {
          appointments: true,
        },
      },
    },
  })

  if (!salon) {
    return <div>Salon không tồn tại</div>
  }

  // Check if user has access (only OWNER can access)
  if (session.user.role !== 'OWNER' || salon.ownerId !== session.user.id) {
    return <div>Bạn không có quyền truy cập salon này</div>
  }

  const isOwner = session.user.role === 'OWNER' && salon.ownerId === session.user.id

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-primary-400 hover:underline mb-2 inline-block"
        >
          ← Quay lại dashboard
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-primary-400 mb-2">
              {salon.name}
            </h1>
            <p className="text-gray-600">{salon.address}</p>
            <p className="text-gray-600">ĐT: {salon.phone}</p>
            <div className="mt-3">
              <BookingLinkCard slug={salon.slug} />
            </div>
          </div>
          <Link
            href={`/dashboard/salon/${salon.id}/manage`}
            className="px-6 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors"
          >
            Quản lý salon
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Services */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary-400">Dịch vụ</h2>
              {isOwner && (
                <Link
                  href={`/dashboard/salon/${salon.id}/service/create`}
                  className="px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm"
                >
                  + Thêm dịch vụ
                </Link>
              )}
            </div>
            {salon.services.length === 0 ? (
              <p className="text-gray-500">Chưa có dịch vụ nào</p>
            ) : (
              <div className="space-y-2">
                {salon.services.map((service) => (
                  <div
                    key={service.id}
                    className="flex justify-between items-center p-3 bg-pastel-pink-light rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-gray-600">
                        {service.duration} phút - {service.price.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staff */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary-400">Thợ nail</h2>
              {isOwner && (
                <Link
                  href={`/dashboard/salon/${salon.id}/staff/create`}
                  className="px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm"
                >
                  + Thêm thợ
                </Link>
              )}
            </div>
            {salon.staff.length === 0 ? (
              <p className="text-gray-500">Chưa có thợ nào</p>
            ) : (
              <div className="space-y-2">
                {salon.staff.map((staff) => (
                  <Link
                    key={staff.id}
                    href={`/dashboard/salon/${salon.id}/staff/${staff.id}`}
                    className="flex justify-between items-center p-3 bg-pastel-yellow rounded-lg hover:bg-pastel-yellow/80 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-medium">{staff.name}</p>
                      <p className="text-sm text-gray-600">{staff.phone}</p>
                    </div>
                    <span className="text-sm text-primary-400 hover:text-primary-500">
                      Xem chi tiết →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary-400">Lịch hẹn</h2>
            <Link
              href={`/dashboard/salon/${salon.id}/appointments`}
              className="text-sm text-primary-400 hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Tổng: {salon._count.appointments} lịch hẹn
          </p>
          {salon.appointments.length === 0 ? (
            <p className="text-gray-500">Chưa có lịch hẹn nào</p>
          ) : (
            <div className="space-y-3">
              {salon.appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-3 bg-gray-50 rounded-lg border-l-4 border-primary-400"
                >
                  <p className="font-medium text-sm">{appointment.customerName}</p>
                  <p className="text-xs text-gray-600">{appointment.service.name}</p>
                  <p className="text-xs text-gray-600">
                    {format(new Date(appointment.startTime), 'dd/MM/yyyy HH:mm', {
                      locale: vi,
                    })}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                      appointment.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-700'
                        : appointment.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-700'
                        : appointment.status === 'COMPLETED'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {appointment.status === 'PENDING'
                      ? 'Chờ xác nhận'
                      : appointment.status === 'CONFIRMED'
                      ? 'Đã xác nhận'
                      : appointment.status === 'CANCELLED'
                      ? 'Đã hủy'
                      : 'Hoàn thành'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

