import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sessions = await prisma.hygieneSession.findMany({
    orderBy: { sessionDate: 'desc' },
    include: {
      participants: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          cnp: true,
          clientName: true,
          jobTitle: true,
          attendance: true,
          examGrade: true,
          examResult: true,
          certificateSeries: true,
          certificateNumber: true,
          employeeId: true,
          employee: {
            select: {
              clientId: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(sessions);
}

interface ParticipantPayload {
  clientName: string;
  lastName: string;
  firstName: string;
  cnp: string;
  birthDate?: string;
  birthPlace?: string;
  docType?: string;
  docSeries?: string;
  docNumber?: string;
  jobTitle?: string;
  attendance?: string;
  examGrade?: number;
  examResult?: string;
  certificateSeries?: string;
  certificateNumber?: string;
  employeeId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      providerName,
      msAuthorization,
      meAuthorization,
      sessionDate,
      examDate,
      location,
      commissionPresident,
      commissionMember1,
      commissionMember2,
      commissionSecretary,
      pvSeriesNumber,
      participants,
    } = body;

    // Validate required fields
    if (!sessionDate || !examDate || !location) {
      return NextResponse.json(
        { error: 'Data sesiunii, data examenului și locația sunt obligatorii.' },
        { status: 400 }
      );
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: 'Cel puțin un cursant este necesar.' },
        { status: 400 }
      );
    }

    // Validate each participant has minimal data
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i] as ParticipantPayload;
      if (!p.firstName || !p.lastName || !p.cnp || !p.clientName) {
        return NextResponse.json(
          { error: `Participantul ${i + 1} necesită: firstName, lastName, cnp, clientName.` },
          { status: 400 }
        );
      }
    }

    const session = await prisma.hygieneSession.create({
      data: {
        providerName: providerName || 'Firma Prestatoare SSM',
        msAuthorization: msAuthorization || null,
        meAuthorization: meAuthorization || null,
        sessionDate: new Date(sessionDate),
        examDate: new Date(examDate),
        location,
        commissionPresident: commissionPresident || null,
        commissionMember1: commissionMember1 || null,
        commissionMember2: commissionMember2 || null,
        commissionSecretary: commissionSecretary || null,
        pvSeriesNumber: pvSeriesNumber || null,
        status: 'programata',
        participants: {
          create: (participants as ParticipantPayload[]).map((p, idx) => ({
            clientName: p.clientName,
            lastName: p.lastName,
            firstName: p.firstName,
            cnp: p.cnp,
            birthDate: p.birthDate ? new Date(p.birthDate) : null,
            birthPlace: p.birthPlace || null,
            docType: p.docType || 'CI',
            docSeries: p.docSeries || null,
            docNumber: p.docNumber || null,
            jobTitle: p.jobTitle || null,
            attendance: p.attendance || 'prezent',
            examGrade: p.examGrade ?? null,
            examResult: p.examResult || 'admis',
            certificateSeries: p.certificateSeries || null,
            certificateNumber: p.certificateNumber || null,
            employeeId: p.employeeId || null,
          })),
        },
      },
      include: {
        participants: true,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (err: unknown) {
    console.error('Hygiene session creation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la crearea sesiunii.' },
      { status: 500 }
    );
  }
}
