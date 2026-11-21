import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signSessionToken, SESSION_COOKIE_NAME, UserRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, role } = body;

    const identifier = String(username || email || '').trim();
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Utilizatorul și parola sunt obligatorii.' },
        { status: 400 }
      );
    }

    // Găsim utilizatorul după username/email și rol (dacă este specificat)
    let user = null;
    if (role) {
      user = await prisma.user.findFirst({
        where: {
          role: role as UserRole,
          OR: [
            { username: identifier },
            { email: identifier.toLowerCase() },
          ],
          isActive: true,
        },
      });
    }

    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: identifier },
            { email: identifier.toLowerCase() },
          ],
          isActive: true,
        },
        orderBy: { role: 'asc' },
      });
    }

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Utilizator sau parolă incorectă.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(String(password), user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Utilizatorul sau parola introdusă este incorectă.' },
        { status: 401 }
      );
    }

    // Actualizăm data ultimei logări
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // Setăm cookie-ul de sesiune
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
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
