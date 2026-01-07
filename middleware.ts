import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    
    // Chỉ OWNER và STAFF mới được truy cập dashboard
    if (token?.role !== 'OWNER' && token?.role !== 'STAFF') {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*'],
}

