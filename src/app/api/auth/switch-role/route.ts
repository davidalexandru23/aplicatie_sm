import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  parseSessionFromCookieHeader,
  signSessionToken,
  SESSION_COOKIE_NAME,
  UserRole,
} from '@/lib/auth';

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
    const { targetRole } = body as { targetRole: UserRole };

    if (!['ADMIN', 'SSM', 'HR', 'IGIENA'].includes(targetRole)) {
      return NextResponse.json(
        { error: 'Rol invalid.' },
        { status: 400 }
      );
    }

    // Găsim utilizatorul asociat rolului respectiv
    const targetUser =
      (await prisma.user.findFirst({
        where: { role: targetRole, isActive: true },
      })) ||
      (await prisma.user.findFirst({
        where: { isActive: true },
      }));

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Nu a fost găsit un cont activ pentru acest rol.' },
        { status: 404 }
      );
    }

    const token = signSessionToken({
      userId: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      name: targetUser.name,
      role: targetRole,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        name: targetUser.name,
        role: targetRole,
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
