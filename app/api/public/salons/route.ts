import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Public API: danh sách chi nhánh cho trang booking (không cần đăng nhập).
 * Luôn lấy từ DB tại thời điểm request để tránh cache/build cũ.
 */
export async function GET() {
  try {
    const salons = await prisma.salon.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        phone: true,
        timezone: true,
      },
    })
    return NextResponse.json({ salons })
  } catch (error) {
    console.error('[public/salons]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
