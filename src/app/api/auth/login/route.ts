import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signSessionToken, SESSION_COOKIE_NAME, UserRole } from '@/lib/auth';

const VALID_ROLES: UserRole[] = ['ADMIN', 'SSM', 'HR', 'IGIENA'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, password } = body as { role?: string; password?: string };

    if (!role || !VALID_ROLES.includes(role as UserRole) || !password) {
      return NextResponse.json(
        { error: 'Rolul și parola sunt obligatorii.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { role: role as UserRole },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Rolul selectat nu este configurat sau este inactiv.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(String(password), user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Parola introdusă este incorectă.' },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signSessionToken({
      userId: user.id,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
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
      maxAge: 60 * 60 * 24 * 7, // 7 zile
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'A apărut o eroare la autentificare.' },
      { status: 500 }
    );
  }
}
