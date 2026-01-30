import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLocale } from 'next-intl/server'
import { Link, redirect } from '@/i18n/navigation'
import { Plus, Scissors, Users, Calendar, MapPin } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const locale = await getLocale()

  if (!session) {
    redirect({ href: '/auth/login', locale })
  }

  const s = session as NonNullable<typeof session>
  let user = null
  let salons: any[] = []

  try {
    user = await prisma.user.findUnique({
      where: { id: s.user.id },
      include: {
        ownedSalons: {
          include: {
            _count: {
              select: {
                appointments: true,
                services: true,
                staff: true,
              },
            },
          },
        },
      },
    })

    salons = user?.ownedSalons || []
  } catch (error: any) {
    console.error('Database error:', error)
    // If database connection fails, show error message
    if (error.message?.includes('Can\'t reach database server')) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome, <span className="font-semibold text-gray-900">{s.user?.name}</span>! 👋
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">⚠️ Database Connection Error</h2>
            <p className="text-red-700 mb-4">
              Cannot connect to PostgreSQL. Please start PostgreSQL first.
            </p>
            <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-gray-900">How to start PostgreSQL:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li><strong>If using Laragon:</strong> Open Laragon → Click &quot;Start All&quot; or Start PostgreSQL</li>
                <li><strong>If installed directly:</strong> Press Win+R → Type `services.msc` → Find PostgreSQL → Start</li>
                <li><strong>Or use CMD (Admin):</strong> `net start postgresql-x64-16`</li>
              </ol>
            </div>
          </div>
        </div>
      )
    }
    // Re-throw other errors
    throw error
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome, <span className="font-semibold text-gray-900">{s.user?.name}</span>! 👋
        </p>
      </div>

      {s.user.role === 'OWNER' && (
        <div>
          <Link
            href="/dashboard/salon/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-all hover:shadow-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            New Salon
          </Link>
        </div>
      )}

      {salons.length === 0 ? (
        <div className="card-modern p-12 text-center rounded-2xl">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-10 h-10 text-primary-400" />
          </div>
          <p className="text-gray-600 mb-6 text-lg">
            {s.user.role === 'OWNER' 
              ? 'You don\'t have any salons yet. Create your first salon!'
              : 'You need to login with an OWNER account to manage salons.'}
          </p>
          {s.user.role === 'OWNER' && (
            <Link
              href="/dashboard/salon/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-400 text-white rounded-full hover:bg-primary-500 transition-all hover:shadow-xl font-semibold"
            >
              <Plus className="w-5 h-5" />
              New Salon
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salons.map((salon) => (
            <Link
              key={salon.id}
              href={`/dashboard/salon/${salon.id}`}
              className="card-modern p-6 rounded-2xl group"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-primary-400 transition-colors">
                  {salon.name}
                </h2>
                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <MapPin className="w-4 h-4" />
                <p className="text-sm">{salon.address}</p>
              </div>
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-medium text-gray-700">{salon._count.services}</span>
                  <span className="text-sm text-gray-500">services</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-medium text-gray-700">{salon._count.staff}</span>
                  <span className="text-sm text-gray-500">staff</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-medium text-gray-700">{salon._count.appointments}</span>
                  <span className="text-sm text-gray-500">appointments</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
