import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from './lib/auth-constants';
import { isRouteAllowedForRole, getDefaultRouteForRole } from './lib/rbac';

function parseJwtPayload(token: string): { role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = atob(base64);
    const parsed = JSON.parse(json);
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp && parsed.exp < now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Căi publice permanente
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? parseJwtPayload(sessionCookie) : null;
  const role = (session?.role || 'ADMIN') as any;

  // Dacă utilizatorul nu este autentificat și vrea să acceseze o rută protejată
  if (!session) {
    if (pathname === '/login') {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Dacă utilizatorul este deja autentificat și accesează /login
  if (pathname === '/login') {
    return NextResponse.redirect(new URL(getDefaultRouteForRole(role), request.url));
  }

  // Verificare permisiuni rol pentru ruta accesată
  const allowed = isRouteAllowedForRole(pathname, role);

  if (!allowed) {
    // Dacă este apel API -> 403 Forbidden
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Acces interzis. Rolul curent nu are permisiuni pentru această acțiune.' },
        { status: 403 }
      );
    }

    // Dacă este pagină -> redirecționare către panoul permis
    const targetUrl = new URL(getDefaultRouteForRole(role), request.url);
    targetUrl.searchParams.set('unauthorized', '1');
    return NextResponse.redirect(targetUrl);
  }

  // Permis
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
