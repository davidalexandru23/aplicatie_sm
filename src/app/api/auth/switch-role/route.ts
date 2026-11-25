import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  parseSessionFromCookieHeader,
  verifyPassword,
  signSessionToken,
  SESSION_COOKIE_NAME,
  UserRole,
} from '@/lib/auth';

const VALID_ROLES: UserRole[] = ['ADMIN', 'SSM', 'HR', 'IGIENA'];

export async function POST(request: NextRequest) {
  try {
    const session = parseSessionFromCookieHeader(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json(
        { error: 'Autentificare necesară pentru comutarea rolului.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { targetRole, password } = body as { targetRole: UserRole; password?: string };

    if (!VALID_ROLES.includes(targetRole)) {
      return NextResponse.json(
        { error: 'Rol invalid.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { role: targetRole },
    });

    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json(
        { error: 'Nu a fost găsit un cont activ pentru acest rol.' },
        { status: 404 }
      );
    }

    // ADMIN poate comuta direct; celelalte roluri necesită parola rolului țintă
    if (session.role !== 'ADMIN') {
      if (!password || !verifyPassword(String(password), targetUser.passwordHash)) {
        return NextResponse.json(
          {
            error: 'Parola pentru rolul selectat este incorectă.',
            requiresPassword: true,
          },
          { status: 401 }
        );
      }
    }

    const token = signSessionToken({
      userId: targetUser.id,
      name: targetUser.name,
      role: targetUser.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        role: targetUser.role,
      },
    });

    const isHttps =
      request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https' ||
      request.nextUrl.protocol === 'https:';

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Switch role error:', error);
    return NextResponse.json(
      { error: 'Eroare la comutarea rolului.' },
      { status: 500 }
    );
  }
}
