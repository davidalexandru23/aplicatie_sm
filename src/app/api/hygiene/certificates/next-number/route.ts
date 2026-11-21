import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const baseNumberParam = searchParams.get('baseNumber');

    const targetYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    const effectiveYear = isNaN(targetYear) ? new Date().getFullYear() : targetYear;

    const startOfYear = new Date(effectiveYear, 0, 1);
    const endOfYear = new Date(effectiveYear, 11, 31, 23, 59, 59, 999);

    // Găsim toți participanții care au primit număr de adeverință în acel an
    const participants = await prisma.hygieneParticipant.findMany({
      where: {
        certificateNumber: { not: null },
        OR: [
          {
            certificateDate: {
              gte: startOfYear,
              lte: endOfYear,
            },
          },
          {
            certificateDate: null,
            session: {
              examDate: {
                gte: startOfYear,
                lte: endOfYear,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        certificateNumber: true,
        certificateDate: true,
        session: {
          select: {
            examDate: true,
          },
        },
      },
    });

    const usedNumbersSet = new Set<string>();
    let maxSequential = 0;

    for (const p of participants) {
      if (!p.certificateNumber) continue;
      const trimmed = p.certificateNumber.trim();
      usedNumbersSet.add(trimmed);

      // Verificăm dacă este număr întreg secvențial (ex: 1, 2, 15)
      if (/^\d+$/.test(trimmed)) {
        const val = parseInt(trimmed, 10);
        if (val > maxSequential) {
          maxSequential = val;
        }
      }
    }

    const nextNumber = maxSequential + 1;
    const usedNumbers = Array.from(usedNumbersSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });

    // Propunere număr BIS pentru remediere controale
    let suggestedBisNumber = '';
    if (baseNumberParam) {
      const cleanBase = baseNumberParam.trim().replace(/bis.*$/i, '');
      let candidate = `${cleanBase}BIS`;
      let counter = 2;
      while (usedNumbersSet.has(candidate)) {
        candidate = `${cleanBase}BIS${counter}`;
        counter++;
      }
      suggestedBisNumber = candidate;
    }

    return NextResponse.json({
      year: effectiveYear,
      nextNumber,
      maxSequential,
      usedNumbers,
      suggestedBisNumber: suggestedBisNumber || (usedNumbers.length > 0 ? `${usedNumbers[0]}BIS` : '1BIS'),
    });
  } catch (err: unknown) {
    console.error('Error calculating next certificate number:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la calcularea numerotării adeverințelor.' },
      { status: 500 }
    );
  }
}
