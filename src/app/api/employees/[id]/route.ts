import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCNP } from '@/lib/importer';
import { calculateEmployeeCompliance } from '@/lib/compliance';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { sanitizeEmployeeForRole } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cui: true,
            regCom: true,
            address: true,
            caenCode: true,
            caenActivity: true,
          },
        },
        currentJob: true,
        currentWorksite: true,
        identityDocument: true,
        residenceAddress: true,
        employmentHistory: {
          include: {
            job: { select: { id: true, title: true, corCode: true } },
            worksite: { select: { id: true, name: true, address: true } },
          },
          orderBy: { validFrom: 'desc' },
        },
        eipAssignments: {
          include: { eipItem: true },
          orderBy: { assignedDate: 'desc' },
        },
        trainingParticipants: {
          include: {
            event: {
              select: {
                id: true,
                type: true,
                eventDate: true,
                durationHours: true,
                materialOrTopic: true,
                instructorName: true,
              },
            },
          },
          orderBy: { event: { eventDate: 'desc' } },
          take: 10,
        },
        hygieneParticipants: {
          include: { session: true },
          orderBy: { session: { sessionDate: 'desc' } },
          take: 5,
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Salariatul cu ID-ul specificat nu a fost găsit.' },
        { status: 404 }
      );
    }

    const compliance = calculateEmployeeCompliance(employee);

    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    const role = session?.role || 'ADMIN';
    const sanitized = sanitizeEmployeeForRole({ ...employee, compliance }, role);

    return NextResponse.json({
      success: true,
      employee: sanitized,
    });
  } catch (error) {
    console.error('Eroare la citirea profilului salariatului:', error);
    return NextResponse.json(
      { error: 'Eroare internă de server la citirea salariatului.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.employee.findUnique({
      where: { id },
      include: {
        identityDocument: true,
        residenceAddress: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Salariatul nu a fost găsit.' },
        { status: 404 }
      );
    }

    const {
      firstName,
      lastName,
      cnp,
      status,
      leaveDate,
      sex,
      birthDate,
      birthPlace,
      birthCounty,
      citizenship,
      phone,
      email,
      hireDate,
      currentJobId,
      currentWorksiteId,
      cimNumber,
      cimDate,
      grossSalary,
      workNorm,
      probationDays,
      annualLeaveDays,
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
      operatorName = 'Operator HR',
      // Flattened ID doc
      idDocType,
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

    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    const role = session?.role || 'ADMIN';
    const isSsm = role === 'SSM';

    // CNP Mutation Guard (SSM cannot mutate or access CNP)
    let finalCnp = existing.cnp;
    if (!isSsm && cnp !== undefined) {
      const cleanCnp = cnp ? cnp.trim() : null;
      if (cleanCnp && cleanCnp !== existing.cnp) {
        if (!validateCNP(cleanCnp)) {
          return NextResponse.json(
            { error: 'CNP invalid conform algoritmului de control.' },
            { status: 400 }
          );
        }
        const duplicate = await prisma.employee.findFirst({
          where: {
            clientId: existing.clientId,
            cnp: cleanCnp,
            NOT: { id },
          },
        });
        if (duplicate) {
          return NextResponse.json(
            { error: 'Un alt salariat din această companie folosește deja acest CNP.' },
            { status: 409 }
          );
        }
      }
      finalCnp = cleanCnp;
    }

    // Verify job and worksite if changed
    if (currentJobId && currentJobId !== existing.currentJobId) {
      const job = await prisma.job.findFirst({
        where: { id: currentJobId, clientId: existing.clientId },
      });
      if (!job) {
        return NextResponse.json(
          { error: 'Funcția specificată nu aparține acestei companii.' },
          { status: 400 }
        );
      }
    }
    if (currentWorksiteId && currentWorksiteId !== existing.currentWorksiteId) {
      const worksite = await prisma.worksite.findFirst({
        where: { id: currentWorksiteId, clientId: existing.clientId },
      });
      if (!worksite) {
        return NextResponse.json(
          { error: 'Punctul de lucru specificat nu aparține acestei companii.' },
          { status: 400 }
        );
      }
    }

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

    const jobChanged = currentJobId !== undefined && currentJobId !== existing.currentJobId;
    const worksiteChanged = currentWorksiteId !== undefined && currentWorksiteId !== existing.currentWorksiteId;

    const updatedEmployee = await prisma.$transaction(async (tx) => {
      // 1. Update Employee
      const emp = await tx.employee.update({
        where: { id },
        data: {
          firstName: firstName !== undefined ? firstName.trim() : undefined,
          lastName: lastName !== undefined ? lastName.trim() : undefined,
          status: status !== undefined ? status : undefined,
          leaveDate: leaveDate !== undefined ? (leaveDate ? new Date(leaveDate) : null) : undefined,
          cnp: finalCnp,
          sex: sex !== undefined ? sex : undefined,
          birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined,
          birthPlace: birthPlace !== undefined ? birthPlace : undefined,
          birthCounty: birthCounty !== undefined ? birthCounty : undefined,
          citizenship: citizenship !== undefined ? citizenship : undefined,
          phone: phone !== undefined ? phone : undefined,
          email: email !== undefined ? email : undefined,
          hireDate: hireDate !== undefined ? (hireDate ? new Date(hireDate) : null) : undefined,
          currentJobId: currentJobId !== undefined ? currentJobId || null : undefined,
          currentWorksiteId: currentWorksiteId !== undefined ? currentWorksiteId || null : undefined,
          cimNumber: !isSsm && cimNumber !== undefined ? cimNumber : undefined,
          cimDate: !isSsm && cimDate !== undefined ? (cimDate ? new Date(cimDate) : null) : undefined,
          grossSalary: !isSsm && grossSalary !== undefined ? (grossSalary !== null ? Number(grossSalary) : null) : undefined,
          workNorm: workNorm !== undefined ? Number(workNorm) : undefined,
          probationDays: probationDays !== undefined ? Number(probationDays) : undefined,
          annualLeaveDays: annualLeaveDays !== undefined ? Number(annualLeaveDays) : undefined,
          bankIban: !isSsm && bankIban !== undefined ? bankIban : undefined,
          bankName: !isSsm && bankName !== undefined ? bankName : undefined,
          bloodType: bloodType !== undefined ? bloodType : undefined,
          rhFactor: rhFactor !== undefined ? rhFactor : undefined,
          qualification: qualification !== undefined ? qualification : undefined,
          commuteTransport: commuteTransport !== undefined ? commuteTransport : undefined,
          commuteRoute: commuteRoute !== undefined ? commuteRoute : undefined,
          commuteDurationMinutes: commuteDurationMinutes !== undefined ? (commuteDurationMinutes !== null ? Number(commuteDurationMinutes) : null) : undefined,
          shoeSize: shoeSize !== undefined ? shoeSize : undefined,
          clothingSize: clothingSize !== undefined ? clothingSize : undefined,
          gloveSize: gloveSize !== undefined ? gloveSize : undefined,
          adminNotes: adminNotes !== undefined ? adminNotes : undefined,
        },
      });

      // 2. Track Employment History transition if job or worksite changed
      if (jobChanged || worksiteChanged) {
        await tx.employmentHistory.updateMany({
          where: { employeeId: id, validTo: null },
          data: { validTo: new Date() },
        });

        const targetJobId = currentJobId !== undefined ? currentJobId || null : existing.currentJobId;
        const targetWorksiteId = currentWorksiteId !== undefined ? currentWorksiteId || null : existing.currentWorksiteId;

        if (targetJobId || targetWorksiteId) {
          await tx.employmentHistory.create({
            data: {
              employeeId: id,
              jobId: targetJobId,
              worksiteId: targetWorksiteId,
              validFrom: new Date(),
            },
          });
        }
      }

      // 3. Upsert Identity Document
      const hasIdDocInput = identityDocument !== undefined || idNumber !== undefined || idSeries !== undefined || idDocType !== undefined;
      if (hasIdDocInput) {
        const docNum = (identityDocument?.number !== undefined ? identityDocument.number : idNumber)?.trim() || null;
        if (existing.identityDocument) {
          await tx.identityDocument.update({
            where: { employeeId: id },
            data: {
              docType: identityDocument?.docType || idDocType || existing.identityDocument.docType,
              series: identityDocument?.series !== undefined ? (identityDocument.series?.trim() || null) : (idSeries !== undefined ? (idSeries?.trim() || null) : existing.identityDocument.series),
              number: docNum,
              issuedBy: identityDocument?.issuedBy !== undefined ? identityDocument.issuedBy : (idIssuedBy !== undefined ? idIssuedBy : existing.identityDocument.issuedBy),
              issueDate: (identityDocument?.issueDate || idIssueDate) ? new Date(identityDocument?.issueDate || idIssueDate) : undefined,
              expiryDate: (identityDocument?.expiryDate || idExpiryDate) ? new Date(identityDocument?.expiryDate || idExpiryDate) : undefined,
            },
          });
        } else if (docNum || identityDocument?.series || idSeries) {
          await tx.identityDocument.create({
            data: {
              employeeId: id,
              docType: identityDocument?.docType || idDocType || 'CI',
              series: identityDocument?.series || idSeries || null,
              number: docNum,
              issuedBy: identityDocument?.issuedBy || idIssuedBy || null,
              issueDate: (identityDocument?.issueDate || idIssueDate) ? new Date(identityDocument?.issueDate || idIssueDate) : null,
              expiryDate: (identityDocument?.expiryDate || idExpiryDate) ? new Date(identityDocument?.expiryDate || idExpiryDate) : null,
            },
          });
        }
      }

      // 4. Upsert Residence Address
      const addrCounty = residenceAddress?.county || addressCounty;
      const addrLocality = residenceAddress?.locality || addressLocality;
      const addrStreet = residenceAddress?.street || addressStreet;
      const addrNumber = residenceAddress?.number || addressNumber;

      if (addrCounty !== undefined || addrLocality !== undefined || addrStreet !== undefined || addrNumber !== undefined) {
        if (existing.residenceAddress) {
          await tx.residenceAddress.update({
            where: { employeeId: id },
            data: {
              county: addrCounty !== undefined ? addrCounty.trim() : undefined,
              locality: addrLocality !== undefined ? addrLocality.trim() : undefined,
              street: addrStreet !== undefined ? addrStreet.trim() : undefined,
              number: addrNumber !== undefined ? addrNumber.trim() : undefined,
              building: residenceAddress?.building !== undefined ? residenceAddress.building : (addressBuilding !== undefined ? addressBuilding : undefined),
              entrance: residenceAddress?.entrance !== undefined ? residenceAddress.entrance : (addressEntrance !== undefined ? addressEntrance : undefined),
              floor: residenceAddress?.floor !== undefined ? residenceAddress.floor : (addressFloor !== undefined ? addressFloor : undefined),
              apartment: residenceAddress?.apartment !== undefined ? residenceAddress.apartment : (addressApartment !== undefined ? addressApartment : undefined),
              postalCode: residenceAddress?.postalCode !== undefined ? residenceAddress.postalCode : (addressPostalCode !== undefined ? addressPostalCode : undefined),
            },
          });
        } else if (addrCounty && addrLocality) {
          await tx.residenceAddress.create({
            data: {
              employeeId: id,
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
      }

      return emp;
    });

    // 5. Fetch full updated employee
    const fullEmployee = await prisma.employee.findUnique({
      where: { id },
      include: {
        client: true,
        currentJob: true,
        currentWorksite: true,
        identityDocument: true,
        residenceAddress: true,
        employmentHistory: {
          orderBy: { validFrom: 'desc' },
        },
      },
    });

    // 6. Audit Event
    await prisma.auditEvent.create({
      data: {
        actorName: (operatorName || 'Operator HR').trim(),
        action: 'update',
        entityType: 'Employee',
        entityId: id,
        details: JSON.stringify({
          employeeName: `${fullEmployee?.lastName || existing.lastName} ${fullEmployee?.firstName || existing.firstName}`,
          updatedFields: Object.keys(body).filter((k) => !['cnp', 'idNumber', 'idSeries', 'identityDocument'].includes(k)),
        }),
      },
    });

    const compliance = calculateEmployeeCompliance(fullEmployee || updatedEmployee);
    const sanitizedEmployee = sanitizeEmployeeForRole(fullEmployee || updatedEmployee, role);

    return NextResponse.json({
      success: true,
      employee: sanitizedEmployee,
      data: sanitizedEmployee,
      compliance,
    });
  } catch (error) {
    console.error('Eroare la actualizarea salariatului:', error);
    return NextResponse.json(
      { error: 'Eroare internă de server la actualizarea salariatului.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}
