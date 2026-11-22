import { prisma } from '@/lib/prisma';

export interface NextNumberResult {
  year: number;
  nextNumber: number;
  formattedNextNumber: string;
  maxSequential: number;
  usedNumbers: string[];
  suggestedBisNumber: string;
}

/**
 * Returns the highest sequential certificate number for a given calendar year,
 * properly handling formatted numbers like "2026-0046", bare numbers like "46",
 * and BIS suffixes like "2026-0046BIS".
 */
export async function getNextHygieneCertificateNumber(
  targetYear?: number,
  baseNumberParam?: string
): Promise<NextNumberResult> {
  const effectiveYear = targetYear && !isNaN(targetYear) ? targetYear : new Date().getFullYear();
  const startOfYear = new Date(effectiveYear, 0, 1);
  const endOfYear = new Date(effectiveYear, 11, 31, 23, 59, 59, 999);

  // Find all participants with certificate numbers in that year
  const participants = await prisma.hygieneParticipant.findMany({
    where: {
      certificateNumber: { not: null },
      OR: [
        { certificateDate: { gte: startOfYear, lte: endOfYear } },
        { certificateDate: null, session: { examDate: { gte: startOfYear, lte: endOfYear } } },
        { certificateDate: null, session: { sessionDate: { gte: startOfYear, lte: endOfYear } } },
        { certificateNumber: { startsWith: `${effectiveYear}-` } },
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
    if (!trimmed) continue;
    usedNumbersSet.add(trimmed);

    // Remove any BIS suffix (e.g. "2026-0046BIS" -> "2026-0046")
    const cleanWithoutBis = trimmed.replace(/bis.*$/i, '').trim();

    // If it starts with a year different from effectiveYear, ignore unless it has no year prefix
    if (/^\d{4}-/.test(cleanWithoutBis)) {
      const yearPrefix = parseInt(cleanWithoutBis.slice(0, 4), 10);
      if (yearPrefix !== effectiveYear) {
        continue;
      }
    }

    // Match trailing sequence of digits:
    // "2026-0046" -> "0046" -> 46
    // "46" -> "46" -> 46
    // "1" -> "1" -> 1
    const match = cleanWithoutBis.match(/(?:^|\D)(\d+)$/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val > maxSequential) {
        maxSequential = val;
      }
    }
  }

  const nextNumber = maxSequential + 1;
  const formattedNextNumber = `${effectiveYear}-${String(nextNumber).padStart(4, '0')}`;

  const usedNumbers = Array.from(usedNumbersSet).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });

  // BIS suggestion
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

  return {
    year: effectiveYear,
    nextNumber,
    formattedNextNumber,
    maxSequential,
    usedNumbers,
    suggestedBisNumber: suggestedBisNumber || (usedNumbers.length > 0 ? `${usedNumbers[0]}BIS` : `${formattedNextNumber}BIS`),
  };
}

/**
 * Ensures all eligible (admitted, non-absent) participants in a session have:
 * - Sequential certificate numbers (format: YYYY-NNNN)
 * - Exam grade (defaults to 10 if null/undefined)
 * - Exam result = 'admis'
 * - Certificate date set to examDate
 * - Updates EmployeeHygieneModule and Employee records
 */
export async function allocateCertificateNumbersForSession(
  sessionId: string,
  options?: { forceReallocate?: boolean }
) {
  const session = await prisma.hygieneSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!session) {
    throw new Error(`Sesiunea ${sessionId} nu a fost găsită.`);
  }

  const sessionYear = session.examDate
    ? session.examDate.getFullYear()
    : session.sessionDate
    ? session.sessionDate.getFullYear()
    : new Date().getFullYear();

  // Find max sequential in year excluding this session's participants (if not forcing reallocate, keep existing valid numbers)
  const thisSessionParticipantIds = new Set(session.participants.map((p) => p.id));
  const otherParticipantsInYear = await prisma.hygieneParticipant.findMany({
    where: {
      id: { notIn: Array.from(thisSessionParticipantIds) },
      certificateNumber: { not: null },
      OR: [
        { certificateDate: { gte: new Date(sessionYear, 0, 1), lte: new Date(sessionYear, 11, 31, 23, 59, 59, 999) } },
        { certificateDate: null, session: { examDate: { gte: new Date(sessionYear, 0, 1), lte: new Date(sessionYear, 11, 31, 23, 59, 59, 999) } } },
        { certificateNumber: { startsWith: `${sessionYear}-` } },
      ],
    },
    select: { certificateNumber: true },
  });

  let maxNum = 0;
  for (const item of otherParticipantsInYear) {
    if (!item.certificateNumber) continue;
    const cleanWithoutBis = item.certificateNumber.replace(/bis.*$/i, '').trim();
    if (/^\d{4}-/.test(cleanWithoutBis)) {
      const yearPrefix = parseInt(cleanWithoutBis.slice(0, 4), 10);
      if (yearPrefix !== sessionYear) continue;
    }
    const match = cleanWithoutBis.match(/(?:^|\D)(\d+)$/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val > maxNum) maxNum = val;
    }
  }

  const updatedParticipants = [];

  for (const participant of session.participants) {
    const isAdmitted = participant.examResult?.toLowerCase() === 'admis' && participant.attendance !== 'absent';
    if (!isAdmitted) {
      // Ineligible participants shouldn't have certificates
      if (participant.certificateNumber) {
        await prisma.hygieneParticipant.update({
          where: { id: participant.id },
          data: {
            certificateNumber: null,
            certificateDate: null,
            examGrade: null,
          },
        });
      }
      continue;
    }

    let certNum = participant.certificateNumber;
    if (!certNum || options?.forceReallocate) {
      maxNum++;
      certNum = `${sessionYear}-${String(maxNum).padStart(4, '0')}`;
    } else {
      // If participant already had a valid formatted number, keep track of maxNum
      const cleanWithoutBis = certNum.replace(/bis.*$/i, '').trim();
      const match = cleanWithoutBis.match(/(?:^|\D)(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxNum) maxNum = val;
      }
    }

    const effGrade = participant.examGrade != null ? participant.examGrade : 10;
    const effDate = participant.certificateDate || session.examDate || session.sessionDate || new Date();

    const updatedP = await prisma.hygieneParticipant.update({
      where: { id: participant.id },
      data: {
        certificateNumber: certNum,
        certificateDate: effDate,
        examGrade: effGrade,
        examResult: 'admis',
        attendance: participant.attendance || 'prezent',
      },
    });
    updatedParticipants.push(updatedP);

    // Sync to Employee if employeeId is present
    if (participant.employeeId) {
      const moduleName = participant.hygieneModule || session.hygieneModule || 'Modulul 1 - Servicii de alimentație publică și colectivă';
      const examDate = session.examDate || effDate;

      await prisma.employeeHygieneModule.upsert({
        where: {
          employeeId_moduleName: {
            employeeId: participant.employeeId,
            moduleName: moduleName.trim(),
          },
        },
        update: {
          certificateNumber: certNum,
          examDate: examDate,
          issueDate: effDate,
          intervalMonths: 36,
        },
        create: {
          employeeId: participant.employeeId,
          moduleName: moduleName.trim(),
          certificateNumber: certNum,
          examDate: examDate,
          issueDate: effDate,
          intervalMonths: 36,
        },
      });

      await prisma.employee.update({
        where: { id: participant.employeeId },
        data: {
          hygieneLastExamDate: examDate,
          hygieneCertificateNumber: certNum,
          hygieneCertificateIssueDate: effDate,
          hygieneNotes: `Curs igienă finalizat ${examDate.toLocaleDateString('ro-RO')} — admis (Nota: ${effGrade})`,
        },
      });
    }
  }

  return updatedParticipants;
}

/**
 * Ensures a single participant has a certificate number, allocating one if missing.
 */
export async function allocateCertificateNumberForParticipant(participantId: string) {
  const participant = await prisma.hygieneParticipant.findUnique({
    where: { id: participantId },
    include: { session: true },
  });

  if (!participant) {
    throw new Error(`Participantul ${participantId} nu a fost găsit.`);
  }

  if (participant.certificateNumber) {
    return participant;
  }

  const sessionYear = participant.session.examDate
    ? participant.session.examDate.getFullYear()
    : participant.session.sessionDate
    ? participant.session.sessionDate.getFullYear()
    : new Date().getFullYear();

  const nextInfo = await getNextHygieneCertificateNumber(sessionYear);
  const certNum = nextInfo.formattedNextNumber;
  const effGrade = participant.examGrade != null ? participant.examGrade : 10;
  const effDate = participant.certificateDate || participant.session.examDate || participant.session.sessionDate || new Date();

  const updated = await prisma.hygieneParticipant.update({
    where: { id: participantId },
    data: {
      certificateNumber: certNum,
      certificateDate: effDate,
      examGrade: effGrade,
      examResult: 'admis',
      attendance: participant.attendance || 'prezent',
    },
    include: { session: true },
  });

  if (updated.employeeId) {
    const moduleName = updated.hygieneModule || updated.session.hygieneModule || 'Modulul 1 - Servicii de alimentație publică și colectivă';
    const examDate = updated.session.examDate || effDate;

    await prisma.employeeHygieneModule.upsert({
      where: {
        employeeId_moduleName: {
          employeeId: updated.employeeId,
          moduleName: moduleName.trim(),
        },
      },
      update: {
        certificateNumber: certNum,
        examDate: examDate,
        issueDate: effDate,
        intervalMonths: 36,
      },
      create: {
        employeeId: updated.employeeId,
        moduleName: moduleName.trim(),
        certificateNumber: certNum,
        examDate: examDate,
        issueDate: effDate,
        intervalMonths: 36,
      },
    });

    await prisma.employee.update({
      where: { id: updated.employeeId },
      data: {
        hygieneLastExamDate: examDate,
        hygieneCertificateNumber: certNum,
        hygieneCertificateIssueDate: effDate,
        hygieneNotes: `Curs igienă finalizat ${examDate.toLocaleDateString('ro-RO')} — admis (Nota: ${effGrade})`,
      },
    });
  }

  return updated;
}
