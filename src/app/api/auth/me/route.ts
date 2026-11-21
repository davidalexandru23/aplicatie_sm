import { NextRequest, NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { ROLE_CONFIG } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  const session = parseSessionFromCookieHeader(cookieHeader);

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      roleMeta: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: session,
    roleMeta: ROLE_CONFIG[session.role],
  });
}
