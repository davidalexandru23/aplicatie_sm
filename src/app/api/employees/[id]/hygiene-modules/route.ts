import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMonthsSafe } from '@/lib/compliance';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const modules = await prisma.employeeHygieneModule.findMany({
      where: { employeeId: id },
      orderBy: { examDate: 'desc' },
    });

    return NextResponse.json(modules);
  } catch (error) {
    console.error('Error fetching employee hygiene modules:', error);
    return NextResponse.json(
      { error: 'Eroare la încărcarea modulelor de igienă.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;
    const body = await request.json();

    const {
      moduleName,
      certificateNumber,
      examDate,
      issueDate,
      intervalMonths = 36,
      notes,
    } = body;

    if (!moduleName || !examDate) {
      return NextResponse.json(
        { error: 'Numele modulului și data examenului sunt obligatorii.' },
        { status: 400 }
      );
    }

    const parsedExamDate = new Date(examDate);
    if (isNaN(parsedExamDate.getTime())) {
      return NextResponse.json(
        { error: 'Data examenului este invalidă.' },
        { status: 400 }
      );
    }

    const parsedIssueDate = issueDate ? new Date(issueDate) : parsedExamDate;
    const safeInterval = typeof intervalMonths === 'number' && intervalMonths > 0 ? intervalMonths : 36;

    const record = await prisma.employeeHygieneModule.upsert({
      where: {
        employeeId_moduleName: {
          employeeId,
          moduleName: moduleName.trim(),
        },
      },
      update: {
        certificateNumber: certificateNumber ? String(certificateNumber).trim() : null,
        examDate: parsedExamDate,
        issueDate: parsedIssueDate,
        intervalMonths: safeInterval,
        notes: notes ? String(notes).trim() : null,
      },
      create: {
        employeeId,
        moduleName: moduleName.trim(),
        certificateNumber: certificateNumber ? String(certificateNumber).trim() : null,
        examDate: parsedExamDate,
        issueDate: parsedIssueDate,
        intervalMonths: safeInterval,
        notes: notes ? String(notes).trim() : null,
      },
    });

    // Also update employee summary fields if this exam date is newer than current hygieneLastExamDate
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { hygieneLastExamDate: true },
    });

    if (!employee?.hygieneLastExamDate || parsedExamDate >= employee.hygieneLastExamDate) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: {
          hygieneLastExamDate: parsedExamDate,
          hygieneCertificateNumber: record.certificateNumber,
          hygieneCertificateIssueDate: record.issueDate,
          hygieneIntervalMonths: safeInterval,
        },
      });
    }

    return NextResponse.json({ success: true, module: record }, { status: 201 });
  } catch (error) {
    console.error('Error saving employee hygiene module:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Eroare la salvarea modulului de igienă.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');

    if (!moduleId) {
      return NextResponse.json({ error: 'ID-ul modulului este obligatoriu.' }, { status: 400 });
    }

    await prisma.employeeHygieneModule.deleteMany({
      where: {
        id: moduleId,
        employeeId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee hygiene module:', error);
    return NextResponse.json(
      { error: 'Eroare la ștergerea modulului de igienă.' },
      { status: 500 }
    );
  }
}
