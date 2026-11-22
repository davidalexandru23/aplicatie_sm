import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCNP } from '@/lib/importer';
import { calculateEmployeeCompliance } from '@/lib/compliance';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { sanitizeEmployeeForRole } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (clientId) {
      where.clientId = clientId;
    }
    if (search) {
      where.OR = [
        { lastName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { cnp: { contains: search } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        client: { select: { id: true, name: true, cui: true } },
        currentJob: { select: { id: true, title: true, corCode: true } },
        currentWorksite: { select: { id: true, name: true } },
        identityDocument: { select: { docType: true, series: true, number: true } },
      },
    });

    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    const role = session?.role || 'ADMIN';
    const sanitized = employees.map((emp) => sanitizeEmployeeForRole(emp, role));

    return NextResponse.json(sanitized);
  } catch (err: unknown) {
    console.error('GET /api/employees error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la preluarea angajaților.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      firstName,
      lastName,
      cnp,
      sex,
      birthDate,
      birthPlace,
      birthCounty,
      citizenship = 'Română',
      phone,
      email,
      hireDate,
      status = 'ACTIV',
      currentJobId,
      currentWorksiteId,
      cimNumber,
      cimDate,
      grossSalary,
      workNorm = 8,
      probationDays = 90,
      annualLeaveDays = 20,
      bankIban,
      bankName,
      bloodType,
      rhFactor,
      qualification,
      commuteTransport,
      commuteRoute,
      commuteDurationMinutes,
      shoeSize,
      clothingSize,
      gloveSize,
      adminNotes,
      isForeignWorker = false,
      operatorName = 'Operator HR',
      // Flattened ID doc
      idDocType = 'CI',
      idSeries,
      idNumber,
      idIssuedBy,
      idIssueDate,
      idExpiryDate,
      identityDocument,
      // Flattened Residence Address
      addressCounty,
      addressLocality,
      addressStreet,
      addressNumber,
      addressBuilding,
      addressEntrance,
      addressFloor,
      addressApartment,
      addressPostalCode,
      residenceAddress,
    } = body;

    // 1. Mandatory fields
    if (!clientId) {
      return NextResponse.json({ error: 'ID-ul companiei este obligatoriu.' }, { status: 400 });
    }
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'Numele și prenumele sunt obligatorii.' }, { status: 400 });
    }

    // CNP este opțional
    const cleanCnp = cnp && String(cnp).trim() ? String(cnp).trim() : null;

    // Verify client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: 'Compania specificată nu a fost găsită.' }, { status: 404 });
    }

    // 2. CNP Validation (dacă a fost completat)
    if (cleanCnp) {
      if (!isForeignWorker && !validateCNP(cleanCnp)) {
        return NextResponse.json({ error: 'CNP invalid conform algoritmului de control' }, { status: 400 });
      }

      // 3. Duplicate check within company
      const existing = await prisma.employee.findFirst({
        where: { clientId, cnp: cleanCnp },
      });
      if (existing) {
        return NextResponse.json({ error: 'Salariatul cu acest CNP există deja' }, { status: 409 });
      }
    }

    // 4. Age and Sex Extraction from CNP (dacă există)
    let derivedBirthDate: Date | null = null;
    let derivedSex: string | null = null;

    if (cleanCnp && /^[1-8]\d{12}$/.test(cleanCnp)) {
      const sDigit = Number(cleanCnp[0]);
      derivedSex = sDigit % 2 === 1 ? 'M' : 'F';

      let century = 1900;
      if (sDigit === 3 || sDigit === 4) century = 1800;
      else if (sDigit === 5 || sDigit === 6) century = 2000;

      const year = century + Number(cleanCnp.substring(1, 3));
      const month = Number(cleanCnp.substring(3, 5)) - 1;
      const day = Number(cleanCnp.substring(5, 7));
      derivedBirthDate = new Date(Date.UTC(year, month, day));

      // Minor age check (<15 years)
      const now = new Date();
      const age = now.getFullYear() - year;
      if (age < 15) {
        return NextResponse.json({ error: 'Angajarea minorilor sub 15 ani este interzisă' }, { status: 400 });
      }
    }

    const finalSex = (sex || derivedSex || null)?.toString().trim();
    const finalBirthDate = birthDate ? new Date(birthDate) : derivedBirthDate;
    const parsedHireDate = hireDate ? new Date(hireDate) : null;
    const parsedCimDate = cimDate ? new Date(cimDate) : null;

    // 5. Cross-entity references validation
    if (
      (grossSalary !== undefined && grossSalary !== null && Number(grossSalary) < 0) ||
      (workNorm !== undefined && workNorm !== null && Number(workNorm) < 0) ||
      (probationDays !== undefined && probationDays !== null && Number(probationDays) < 0) ||
      (annualLeaveDays !== undefined && annualLeaveDays !== null && Number(annualLeaveDays) < 0) ||
      (commuteDurationMinutes !== undefined && commuteDurationMinutes !== null && Number(commuteDurationMinutes) < 0)
    ) {
      return NextResponse.json(
        { error: 'Valorile numerice (salariu brut, normă de lucru, perioadă de probă, zile de concediu) nu pot fi negative.' },
        { status: 400 }
      );
    }

    if (currentJobId) {
      const job = await prisma.job.findFirst({ where: { id: currentJobId, clientId } });
      if (!job) {
        return NextResponse.json({ error: 'Funcția specificată nu aparține acestei companii.' }, { status: 400 });
      }
    }
    if (currentWorksiteId) {
      const worksite = await prisma.worksite.findFirst({ where: { id: currentWorksiteId, clientId } });
      if (!worksite) {
        return NextResponse.json({ error: 'Punctul de lucru specificat nu aparține acestei companii.' }, { status: 400 });
      }
    }

    // 6. Transactional creation
    const created = await prisma.$transaction(async (tx) => {
      const newEmp = await tx.employee.create({
        data: {
          clientId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          cnp: cleanCnp,
          sex: finalSex,
          birthDate: finalBirthDate,
          birthPlace: birthPlace?.trim() || null,
          birthCounty: birthCounty?.trim() || null,
          citizenship: citizenship?.trim() || 'Română',
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          hireDate: parsedHireDate,
          currentJobId: currentJobId || null,
          currentWorksiteId: currentWorksiteId || null,
          cimNumber: cimNumber?.trim() || null,
          cimDate: parsedCimDate,
          grossSalary: grossSalary !== undefined && grossSalary !== null ? Number(grossSalary) : null,
          workNorm: workNorm ? Number(workNorm) : 8,
          probationDays: probationDays ? Number(probationDays) : 90,
          annualLeaveDays: annualLeaveDays ? Number(annualLeaveDays) : 20,
          bankIban: bankIban?.trim() || null,
          bankName: bankName?.trim() || null,
          bloodType: bloodType?.trim() || null,
          rhFactor: rhFactor?.trim() || null,
          qualification: qualification?.trim() || null,
          commuteTransport: commuteTransport?.trim() || null,
          commuteRoute: commuteRoute?.trim() || null,
          commuteDurationMinutes: commuteDurationMinutes ? Number(commuteDurationMinutes) : null,
          shoeSize: shoeSize?.trim() || null,
          clothingSize: clothingSize?.trim() || null,
          gloveSize: gloveSize?.trim() || null,
          adminNotes: adminNotes?.trim() || null,
          status: status || 'ACTIV',
        },
      });

      // Identity document
      const docNum = (identityDocument?.number || idNumber)?.trim() || null;
      const docSeries = (identityDocument?.series || idSeries)?.trim() || null;
      if (docNum || docSeries || identityDocument?.issuedBy || idIssuedBy) {
        await tx.identityDocument.create({
          data: {
            employeeId: newEmp.id,
            docType: identityDocument?.docType || idDocType || 'CI',
            series: docSeries,
            number: docNum,
            issuedBy: identityDocument?.issuedBy || idIssuedBy || null,
            issueDate: (identityDocument?.issueDate || idIssueDate) ? new Date(identityDocument?.issueDate || idIssueDate) : null,
            expiryDate: (identityDocument?.expiryDate || idExpiryDate) ? new Date(identityDocument?.expiryDate || idExpiryDate) : null,
          },
        });
      }

      // Residence address
      const addrCounty = residenceAddress?.county || addressCounty;
      const addrLocality = residenceAddress?.locality || addressLocality;
      const addrStreet = residenceAddress?.street || addressStreet;
      const addrNumber = residenceAddress?.number || addressNumber;
      if (addrCounty && addrLocality) {
        await tx.residenceAddress.create({
          data: {
            employeeId: newEmp.id,
            county: addrCounty.trim(),
            locality: addrLocality.trim(),
            street: (addrStreet || '').trim(),
            number: (addrNumber || '').trim(),
            building: residenceAddress?.building || addressBuilding || null,
            entrance: residenceAddress?.entrance || addressEntrance || null,
            floor: residenceAddress?.floor || addressFloor || null,
            apartment: residenceAddress?.apartment || addressApartment || null,
            postalCode: residenceAddress?.postalCode || addressPostalCode || null,
          },
        });
      }

      // Employment history initial entry
      if (currentJobId || currentWorksiteId) {
        await tx.employmentHistory.create({
          data: {
            employeeId: newEmp.id,
            jobId: currentJobId || null,
            worksiteId: currentWorksiteId || null,
            validFrom: parsedHireDate || new Date(),
          },
        });
      }

      return newEmp;
    });

    // 7. Fetch complete enriched employee
    const fullEmployee = await prisma.employee.findUnique({
      where: { id: created.id },
      include: {
        client: true,
        currentJob: true,
        currentWorksite: true,
        identityDocument: true,
        residenceAddress: true,
        employmentHistory: true,
      },
    });

    // 8. Audit event
    await prisma.auditEvent.create({
      data: {
        actorName: (operatorName || 'Operator HR').trim(),
        action: 'create',
        entityType: 'Employee',
        entityId: created.id,
        details: JSON.stringify({
          clientId,
          employeeName: `${lastName} ${firstName}`,
          currentJobId: currentJobId || null,
          currentWorksiteId: currentWorksiteId || null,
          hireDate: parsedHireDate ? parsedHireDate.toISOString() : null,
        }),
      },
    });

    const compliance = calculateEmployeeCompliance(fullEmployee || created);

    return NextResponse.json(
      {
        success: true,
        employee: fullEmployee,
        data: fullEmployee,
        compliance,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Eroare la crearea salariatului:', error);
    return NextResponse.json(
      { error: 'Eroare internă de server la crearea salariatului.' },
      { status: 500 }
    );
  }
}
