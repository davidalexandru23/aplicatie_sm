import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from './lib/auth-constants';
import { verifySessionToken } from './lib/auth';
import { isRouteAllowedForRole, getDefaultRouteForRole } from './lib/rbac';

function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const hostHeader = forwardedHost || request.headers.get('host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto = forwardedProto || request.nextUrl.protocol.replace(':', '') || 'http';

  if (hostHeader) {
    return `${proto}://${hostHeader}`;
  }
  return request.nextUrl.origin;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Căi publice permanente
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/health' ||
    pathname === '/favicon.ico' ||
    (!pathname.startsWith('/api/') && pathname.includes('.'))
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? verifySessionToken(sessionCookie) : null;

  // Dacă utilizatorul nu este autentificat și vrea să acceseze o rută protejată
  if (!session) {
    if (pathname === '/login') {
      return NextResponse.next();
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Neautorizat. Vă rugăm să vă autentificați.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', getPublicOrigin(request));
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Dacă utilizatorul este deja autentificat și accesează /login
  if (pathname === '/login') {
    return NextResponse.redirect(
      new URL(getDefaultRouteForRole(session.role), getPublicOrigin(request))
    );
  }

  // Verificare permisiuni rol pentru ruta accesată
  const allowed = isRouteAllowedForRole(pathname, session.role);

  if (!allowed) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Acces interzis. Rolul curent nu are permisiuni pentru această acțiune.' },
        { status: 403 }
      );
    }

    const targetUrl = new URL(getDefaultRouteForRole(session.role), getPublicOrigin(request));
    targetUrl.searchParams.set('unauthorized', '1');
    return NextResponse.redirect(targetUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
