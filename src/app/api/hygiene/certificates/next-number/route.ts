import { NextRequest, NextResponse } from 'next/server';
import { getNextHygieneCertificateNumber } from '@/lib/hygiene-numbering';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const baseNumberParam = searchParams.get('baseNumber');

    const targetYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    const effectiveYear = isNaN(targetYear) ? new Date().getFullYear() : targetYear;

    const result = await getNextHygieneCertificateNumber(effectiveYear, baseNumberParam || undefined);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Error calculating next certificate number:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la calcularea numerotării adeverințelor.' },
      { status: 500 }
    );
  }
}

