import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const playfair = Playfair_Display({ 
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({ 
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Nami Nail - Salon Management',
  description: 'Quản lý và đặt lịch online cho salon nail',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} ${playfair.variable} font-inter`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

