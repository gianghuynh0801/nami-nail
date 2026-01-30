import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale/vi'
import AppointmentActions from '@/components/AppointmentActions'

export default async function AppointmentsPage({
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
  })

  if (!salon) {
    return <div>Salon không tồn tại</div>
  }

  // Check if user has access (only OWNER can access)
  if (session.user.role !== 'OWNER' || salon.ownerId !== session.user.id) {
    return <div>Bạn không có quyền truy cập salon này</div>
  }

  const appointments = await prisma.appointment.findMany({
    where: { salonId: params.id },
    include: {
      service: true,
      staff: true,
    },
    orderBy: {
      startTime: 'desc',
    },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/salon/${params.id}`}
          className="text-primary-400 hover:underline mb-2 inline-block"
        >
          ← Quay lại salon
        </Link>
        <h1 className="text-3xl font-bold text-primary-400 mb-2">
          Quản lý lịch hẹn
        </h1>
        <p className="text-gray-600">{salon.name}</p>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Chưa có lịch hẹn nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-pastel-pink">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Khách hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Dịch vụ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Thợ nail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.customerPhone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {appointment.service.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {appointment.service.price.toLocaleString('vi-VN')}đ
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.staff.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(appointment.startTime), 'dd/MM/yyyy HH:mm', {
                        locale: vi,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          appointment.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-800'
                            : appointment.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : appointment.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <AppointmentActions appointment={appointment} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

