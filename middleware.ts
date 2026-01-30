import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const intlResponse = intlMiddleware(req);

  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const pathname = req.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] === 'vi' ? 'vi' : 'en';
  const isDashboard =
    (locale === 'en' && (pathname === '/en/dashboard' || pathname.startsWith('/en/dashboard/'))) ||
    (locale === 'vi' && (pathname === '/vi/dashboard' || pathname.startsWith('/vi/dashboard/')));

  if (isDashboard) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      const loginPath = `/${locale}/auth/login`;
      return NextResponse.redirect(new URL(loginPath, req.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
