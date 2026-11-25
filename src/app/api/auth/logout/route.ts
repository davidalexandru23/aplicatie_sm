import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const isHttps =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https' ||
    request.nextUrl.protocol === 'https:';

  const response = NextResponse.json({ success: true, message: 'Deconectat cu succes.' });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: '/',
    maxAge: 0,
  });
  return response;
}
