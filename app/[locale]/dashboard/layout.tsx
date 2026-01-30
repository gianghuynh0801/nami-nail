import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const locale = await getLocale()

  if (!session) {
    redirect({ href: '/auth/login', locale })
  }

  return <DashboardClient>{children}</DashboardClient>
}

