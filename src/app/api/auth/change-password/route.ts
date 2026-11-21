import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, parseSessionFromCookieHeader } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);

    if (!session) {
      return NextResponse.json(
        { error: 'Sesiune expirată sau neautorizată. Vă rugăm să vă autentificați din nou.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Toate câmpurile (parolă curentă, parolă nouă, confirmare) sunt obligatorii.' },
        { status: 400 }
      );
    }

    if (String(newPassword) !== String(confirmPassword)) {
      return NextResponse.json(
        { error: 'Noua parolă și confirmarea parolei nu coincid.' },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 4) {
      return NextResponse.json(
        { error: 'Noua parolă trebuie să conțină cel puțin 4 caractere.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilizatorul nu a fost găsit în sistem.' },
        { status: 404 }
      );
    }

    const isCurrentValid = verifyPassword(String(currentPassword), user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: 'Parola curentă introdusă este incorectă.' },
        { status: 400 }
      );
    }

    const newHash = hashPassword(String(newPassword));
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Înregistrare eveniment de audit
    await prisma.auditEvent.create({
      data: {
        actorName: user.name,
        action: 'password_change',
        entityType: 'User',
        entityId: user.id,
        details: JSON.stringify({
          role: user.role,
          username: user.username,
          email: user.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Parola a fost modificată cu succes.',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'A apărut o eroare la schimbarea parolei.' },
      { status: 500 }
    );
  }
}
