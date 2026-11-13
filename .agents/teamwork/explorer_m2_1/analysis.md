# Raport de Analiză Tehnică: Sănătate Ocupațională (Medicină a Muncii) și Filtrare Salariați PLECAT (Milestone 2)

**Autor**: Explorer 1 (Milestone 2 - Employee Lifecycle & Occupational Health)  
**Data**: 2026-11-11  
**Domeniu de Investigare**: Funcționalitățile F7, F8, F13, Prisma Schema, `compliance.ts`, API Routes & Validări Statutare  

---

## 1. Executive Summary

Prezenta analiză oferă specificațiile complete, exhaustive și deterministe pentru implementarea de către Worker a **Feature 7** (Înregistrare Examen Medical HG 355/2007), **Feature 8** (Actualizare `medicalLastExamDate` și Recalculare Conformitate) și **Feature 13** (Excluderea Salariaților cu status `PLECAT` din toate componentele de calcul al conformității, generări de documente și pachete batch).

Toate cele 416 teste existente din suita unificată (`npm test`) trec în prezent cu 100% succes. Modificările proiectate în cadrul Milestone 2 păstrează compatibilitatea 100% cu structurile existente, adăugând rutele API dedicate, modalele operative din UI și izolarea riguroasă a salariaților plecați.

---

## 2. Inspecție Detaliată a Schemei Prisma (`prisma/schema.prisma`)

### 2.1. Modelul `Employee` (Liniile 194–298)
Modelul `Employee` conține deja câmpurile scalare necesare pentru gestiunea medicinei muncii și ciclul de viață al salariatului:

| Câmp Scalar | Tip Prisma | Default | Descriere Statutară & Rol în F7/F8/F13 |
|---|---|---|---|
| `status` | `String` | `"ACTIV"` | Status HR: `"ACTIV"` vs. `"PLECAT"`. Punct central pentru F12 și F13. Indexat via `@@index([clientId, status])`. |
| `leaveDate` | `DateTime?` | `null` | Data încetării contractului de muncă (obligatorie pentru statusul `"PLECAT"`). |
| `hireDate` | `DateTime?` | `null` | Data angajării salariatului. |
| `medicalLastExamDate` | `DateTime?` | `null` | Data ultimului examen medical periodic sau de angajare (HG 355/2007). |
| `medicalIntervalMonths` | `Int` | `12` | Periodicitate în luni (12 luni TESA/standard, 6 luni riscuri specifice). |
| `medicalFitnessVerdict` | `String?` | `"APT"` | Aviz fișă de aptitudine: `"APT"`, `"APT_CONDITIONAT"`, `"INAPT_TEMPORAR"`, `"INAPT"`. |
| `medicalNotes` | `String?` | `null` | Restricții medicale (ex: "Fără lucru la înălțime", "Ochelari de corecție") și mențiuni clinică/medic. |

**Observație critică privind modelul `Employee`**:
Modelul `Employee` nu conține coloane separate pentru `clinicName` sau `doctorName`/`physicianName`. Pentru a persista denumirea clinicii și numele medicului examinator fără modificări de schemă, endpoint-ul de înregistrare a examenului medical va formata aceste metadate în `medicalNotes` (ex: `"[Clinica: MedLife SSM, Medic: Dr. Popa] Restricții: Fără efort fizic intens"`) și le va loga în evenimentul de audit (`AuditEvent.details`).

### 2.2. Modelul `AuditEvent` (Liniile 605–618)
Modelul `AuditEvent` permite înregistrarea oricărui eveniment operațional:
```prisma
model AuditEvent {
  id         String   @id @default(uuid())
  actorName  String
  actorEmail String?
  action     String   // Plain String, indexat
  entityType String   // ex: "Employee"
  entityId   String?  // ID-ul entității auditate
  details    String?  // JSON stringified (fără CNP sau date CI!)
  ipAddress  String?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

**Observație critică privind acțiunea de audit (F7/F8)**:
Suita de teste automată (`scripts/e2e-tier1-features.ts:686` și `740`) verifică în mod explicit valoarea acțiunii:
`where: { entityId: fixture.employee.id, action: 'MEDICAL_EXAM_RECORDED' }`.
Prin urmare, Worker-ul trebuie să asigure că la înregistrarea unui examen medical, acțiunea salvată în `AuditEvent` este **`'MEDICAL_EXAM_RECORDED'`** (sau să accepte ca alias `RECORD_MEDICAL_EXAM`). Pentru compatibilitate deplină cu suita E2E, stringul utilizat la inserare trebuie să fie strict:
`action: 'MEDICAL_EXAM_RECORDED'`.

---

## 3. Inspecție și Diagnoză în `src/lib/compliance.ts`

### 3.1. Cum funcționează `calculateEmployeeCompliance`
- Calculează conformitatea pe 4 dimensiuni normative:
  1. `occupationalMedicine` (HG 355/2007) – bazat pe `medicalLastExamDate` și `medicalIntervalMonths` (implicit 12).
  2. `ssmTraining` (Legea 319/2006, HG 1425/2006) – bazat pe `ssmLastTrainingDate` și `ssmIntervalMonths` (implicit 6).
  3. `psiTraining` (Legea 307/2006, OMAI 712/2005) – bazat pe `psiLastTrainingDate` și `psiIntervalMonths` (implicit 6).
  4. `hygieneCertificate` (Ordinul 2209/2022) – urmărit condiționat dacă `hygieneRequested === true` sau `hygieneLastExamDate !== null`.
- Fiecare element primește un status din: `'VALID'` (>30 zile), `'UPCOMING'` (0–30 zile), `'OVERDUE'` (<0 zile), `'MISSING'` (dată null).
- `overallStatus` se agregă după prioritatea: `OVERDUE > MISSING > UPCOMING > VALID`.

### 3.2. Deficiența identificată în `calculateCompanyMetrics` (Liniile 286–343)
Codul actual din `calculateCompanyMetrics`:
```typescript
export function calculateCompanyMetrics(
  employees: (EmployeeComplianceInput | Record<string, unknown>)[],
  referenceDate: Date = new Date()
): CompanyComplianceMetrics {
  const employeeList = Array.isArray(employees) ? employees : [];
  const totalEmployees = employeeList.length;
```
**Problema majoră**:
1. `calculateCompanyMetrics` nu verifică câmpul `status` al angajaților.
2. Dacă în `employeeList` se află salariați cu `status: 'PLECAT'`, aceștia sunt numărați în `totalEmployees`, cerințele lor (adesea expirate de la plecarea din firmă) sunt contabilizate în `totalItemsTracked` și `overdueCount`, iar scorul companiei (`complianceScorePercent`) este scăzut în mod eronat.
3. Exemplu matematic: O firmă are 3 angajați activi 100% conformi și 1 fost angajat plecat cu examen medical neînnoit din 2024. În loc de scor 100% și 0 alerte, compania apare cu 75% conformitate și alertă roșie ITM pentru o persoană care nu mai lucrează acolo.

### 3.3. Specificație Exactă de Modificare în `src/lib/compliance.ts`

Worker-ul trebuie să aplice următoarele adaptări:

1. **Extinderea interfeței `EmployeeComplianceInput`**:
   ```typescript
   export interface EmployeeComplianceInput {
     id?: string;
     firstName?: string | null;
     lastName?: string | null;
     fullName?: string | null;
     status?: string | null;          // <-- ADĂUGAT: "ACTIV" | "PLECAT"
     leaveDate?: Date | string | null; // <-- ADĂUGAT: Data plecării
     medicalLastExamDate?: Date | string | null;
     ...
   ```

2. **Extinderea interfeței `EmployeeComplianceSummary`**:
   ```typescript
   export interface EmployeeComplianceSummary {
     employeeId: string;
     employeeName: string;
     status?: string;        // <-- ADĂUGAT: statusul salariatului
     isTerminated?: boolean; // <-- ADĂUGAT: flag determinist (status === 'PLECAT')
     occupationalMedicine: ComplianceItemResult;
     ssmTraining: ComplianceItemResult;
     psiTraining: ComplianceItemResult;
     hygieneCertificate: ComplianceItemResult | null;
     overallStatus: ComplianceStatus;
   }
   ```

3. **În `calculateEmployeeCompliance`**:
   Propagarea `status` și `isTerminated`:
   ```typescript
   const rawStatus = typeof employee?.status === 'string' ? employee.status.trim().toUpperCase() : 'ACTIV';
   const isTerminated = rawStatus === 'PLECAT';
   
   return {
     employeeId,
     employeeName,
     status: rawStatus,
     isTerminated,
     occupationalMedicine,
     ...
   };
   ```

4. **În `calculateCompanyMetrics`**:
   Filtrare automată a salariaților `PLECAT` cu suport pentru opțiune de audit:
   ```typescript
   export function calculateCompanyMetrics(
     employees: (EmployeeComplianceInput | Record<string, unknown>)[],
     referenceDate: Date = new Date(),
     options?: { includeTerminated?: boolean }
   ): CompanyComplianceMetrics {
     const employeeList = Array.isArray(employees) ? employees : [];

     // Filtrare strictă a salariaților cu status 'PLECAT' (case-insensitive)
     const targetEmployees = options?.includeTerminated
       ? employeeList
       : employeeList.filter((emp) => {
           const st = typeof emp?.status === 'string' ? emp.status.trim().toUpperCase() : 'ACTIV';
           return st !== 'PLECAT';
         });

     const totalEmployees = targetEmployees.length;

     let totalItemsTracked = 0;
     let validCount = 0;
     let upcomingCount = 0;
     let overdueCount = 0;
     let missingCount = 0;

     for (const emp of targetEmployees) {
       const summary = calculateEmployeeCompliance(emp, referenceDate);
       const items: ComplianceItemResult[] = [
         summary.occupationalMedicine,
         summary.ssmTraining,
         summary.psiTraining,
       ];
       if (summary.hygieneCertificate !== null) {
         items.push(summary.hygieneCertificate);
       }

       for (const item of items) {
         totalItemsTracked++;
         switch (item.status) {
           case 'VALID':
             validCount++;
             break;
           case 'UPCOMING':
             upcomingCount++;
             break;
           case 'OVERDUE':
             overdueCount++;
             break;
           case 'MISSING':
             missingCount++;
             break;
         }
       }
     }

     const complianceScorePercent = totalItemsTracked === 0
       ? 100
       : Math.round((validCount / totalItemsTracked) * 10000) / 100;

     return {
       totalEmployees,
       totalItemsTracked,
       validCount,
       upcomingCount,
       overdueCount,
       missingCount,
       complianceScorePercent,
     };
   }
   ```

---

## 4. Harta Completă a Excluderii Statusului `PLECAT` (Feature 13)

Pentru a asigura că niciun salariat plecat nu poluează datele active sau documentele colective, Worker-ul trebuie să verifice și să alinieze următoarele 8 puncte cheie din arhitectură:

| # | Fișier / Componentă | Comportament Curent | Comportament Necesar (Specificație Worker) |
|---|---|---|---|
| **1** | `src/lib/compliance.ts` | Număra toți salariații orbește în `calculateCompanyMetrics`. | Filtrează `status !== 'PLECAT'` implicit. Returnează `totalEmployees: 0`, `complianceScorePercent: 100` dacă toți sunt plecați. |
| **2** | `src/app/api/clients/[id]/employees/route.ts` | Interoga `where: { clientId: id }` returnând și salariații plecați. | Filtrează implicit `where: { clientId: id, status: { not: 'PLECAT' } }`. Permite `?includeTerminated=true` sau `?status=all` pentru istorice. |
| **3** | `src/app/documents/generate/page.tsx` | Dropdown-ul includea toți salariații returnați de API. | Dropdown-ul afișează doar salariații activi. Dacă este selectat un template colectiv/batch, cei plecați nu apar în lista de bifare. |
| **4** | `src/app/api/documents/generate-batch/route.ts` | Prelua salariații din `employeeIds` fără validare pe status. | Verifică explicit: dacă vreun ID din listă are `status === 'PLECAT'`, respinge cererea cu status `400` și mesaj explicit cu numele salariatului plecat. |
| **5** | `src/lib/packages/bulk-packages.ts` | `generateStartupDossierPackage` interoga `employees` fără clauză `where` pe status. | Adaugă `where: { status: { not: 'PLECAT' } }` la interogarea salariaților din dosarul de pornire și dosarele anuale de firmă. `generateOnboardingPackage` respinge salariații plecați. |
| **6** | `src/lib/templates/resolver.ts` | În `loadResolverContext`, fallback-urile colective includeau salariați plecați. | La popularea `client.employees` și `dynamicParticipants`, filtrează salariații plecați: `clientEmployees.filter(e => e.status !== 'PLECAT')`. |
| **7** | `src/app/employees/page.tsx` | Transmitea `employeesRaw` (inclusiv plecați) în `calculateCompanyMetrics`. | Datorită filtrării automate din `calculateCompanyMetrics`, indicatorii KPI vor reflecta strict salariații activi. |
| **8** | `src/app/employees/employee-registry-client.tsx` | Tab-urile `ALL`, `VALID`, `UPCOMING`, `OVERDUE`, `MISSING` includeau salariați plecați. | Tab-urile de conformitate numără și filtrează strict salariații activi (`status !== 'PLECAT'`). Se adaugă tab dedicat `PLECAT` (Arhivă Plecați). |

---

## 5. Specificații de Implementare pentru Feature 7 & 8: Înregistrare Examen Medical

### 5.1. Fișier Nou: `src/app/api/employees/[id]/medical-exam/route.ts`
Worker-ul va crea această rută API respectând contractul din Next.js 16 (cu `params` ca `Promise`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateEmployeeCompliance } from '@/lib/compliance';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      examDate,
      intervalMonths = 12,
      verdict,
      fitnessVerdict,
      restrictions,
      notes,
      clinicName,
      physicianName,
      doctorName,
      operatorName = 'Operator SSM',
    } = body as {
      examDate: string | Date;
      intervalMonths?: number;
      verdict?: string;
      fitnessVerdict?: string;
      restrictions?: string;
      notes?: string;
      clinicName?: string;
      physicianName?: string;
      doctorName?: string;
      operatorName?: string;
    };

    // 1. Validare Salariat Existență
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Salariatul nu a fost găsit.' },
        { status: 404 }
      );
    }

    if (employee.status === 'PLECAT') {
      return NextResponse.json(
        { error: 'Nu se poate înregistra examen medical pentru un salariat cu contract de muncă încetat (status PLECAT).' },
        { status: 400 }
      );
    }

    // 2. Validare Verdict (HG 355/2007)
    const finalVerdict = (fitnessVerdict || verdict || '').trim().toUpperCase();
    const ALLOWED_VERDICTS = ['APT', 'APT_CONDITIONAT', 'INAPT_TEMPORAR', 'INAPT'];
    if (!ALLOWED_VERDICTS.includes(finalVerdict)) {
      return NextResponse.json(
        { error: 'Verdict de aptitudine invalid conform HG 355/2007' },
        { status: 400 }
      );
    }

    // 3. Validare Dată Examen
    if (!examDate) {
      return NextResponse.json(
        { error: 'Data examenului este obligatorie' },
        { status: 400 }
      );
    }
    const parsedExamDate = new Date(examDate);
    const isDatePattern = typeof examDate === 'string'
      ? (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(examDate) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(examDate))
      : true;
    if (isNaN(parsedExamDate.getTime()) || !isDatePattern) {
      return NextResponse.json(
        { error: 'Data examenului este invalidă' },
        { status: 400 }
      );
    }

    // Prevenire date în viitorul îndepărtat (> 1 an)
    const maxFuture = new Date();
    maxFuture.setFullYear(maxFuture.getFullYear() + 1);
    if (parsedExamDate > maxFuture) {
      return NextResponse.json(
        { error: 'Data examenului nu poate fi în viitorul îndepărtat' },
        { status: 400 }
      );
    }

    // 4. Validare Interval Luni
    const parsedInterval = Number(intervalMonths) || 12;
    if (parsedInterval <= 0) {
      return NextResponse.json(
        { error: 'Intervalul de examinare trebuie să fie pozitiv' },
        { status: 400 }
      );
    }

    // 5. Compunere Note Medicale (Clinică, Medic, Restricții)
    const finalNotes = restrictions || notes || '';
    const finalClinic = (clinicName || '').trim();
    const finalDoctor = (physicianName || doctorName || '').trim();

    const noteMetaParts: string[] = [];
    if (finalClinic) noteMetaParts.push(`Clinica: ${finalClinic}`);
    if (finalDoctor) noteMetaParts.push(`Medic: ${finalDoctor}`);

    let compositeNotes = finalNotes;
    if (noteMetaParts.length > 0) {
      compositeNotes = compositeNotes
        ? `[${noteMetaParts.join(', ')}] ${compositeNotes}`
        : `[${noteMetaParts.join(', ')}]`;
    }

    // 6. Actualizare Bază de Date Salariat
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        medicalLastExamDate: parsedExamDate,
        medicalIntervalMonths: parsedInterval,
        medicalFitnessVerdict: finalVerdict,
        medicalNotes: compositeNotes || null,
      },
      include: {
        client: true,
        currentJob: true,
        currentWorksite: true,
        identityDocument: true,
      },
    });

    // 7. Salvare Eveniment de Audit (acțiune testată direct în E2E)
    await prisma.auditEvent.create({
      data: {
        actorName: operatorName.trim() || 'Operator SSM',
        action: 'MEDICAL_EXAM_RECORDED',
        entityType: 'Employee',
        entityId: id,
        details: JSON.stringify({
          examDate: parsedExamDate.toISOString(),
          intervalMonths: parsedInterval,
          verdict: finalVerdict,
          restrictions: finalNotes || null,
          clinicName: finalClinic || null,
          physicianName: finalDoctor || null,
        }),
      },
    });

    // 8. Recalculare Conformitate în Timp Real
    const compliance = calculateEmployeeCompliance(updatedEmployee);

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
      compliance,
    });
  } catch (error: any) {
    console.error('Eroare la înregistrarea examenului medical:', error);
    return NextResponse.json(
      { error: 'Eroare internă de server la salvarea examenului medical.' },
      { status: 500 }
    );
  }
}
```

### 5.2. Componentă Nouă UI Modal: `src/components/employees/record-medical-exam-modal.tsx`
Worker-ul va crea această componentă client (`'use client'`) pentru a permite medicului/operatorului SSM să deschidă un dialog direct din `/employees` sau `/clients/[id]`:

**Elemente Formular Modal**:
1. **Header**: Titlu "Înregistrare Fișă de Aptitudine (Medicină a Muncii HG 355/2007)", subtitlu cu numele salariatului și CNP mascat.
2. **Dată Examen**: `<input type="date">` cu valoare implicită data de azi.
3. **Periodicitate**: `<select>` cu opțiunile: 12 luni (Standard / TESA), 6 luni (Riscuri specifice / Operativ), 3 luni (Control temporar), 24 luni.
4. **Verdict Aptitudine**: 4 radio buttons sau dropdown stilizat:
   - `APT` (verde, recomandat)
   - `APT_CONDITIONAT` (galben)
   - `INAPT_TEMPORAR` (portocaliu)
   - `INAPT` (roșu)
5. **Restricții / Recomandări**: `<textarea>` afișat prioritar dacă verdictul este `APT_CONDITIONAT` sau `INAPT_TEMPORAR` (ex: "Fără lucru de noapte", "Purtare ochelari la ecran").
6. **Date Clinica / Medic**:
   - `clinicName`: input text (ex: "Clinica MedLife SSM", "Regina Maria")
   - `physicianName`: input text (ex: "Dr. Mihai Popa - Medic specialist medicina muncii")
7. **Acțiuni**:
   - Buton "Renunță"
   - Buton "Salvează Examenul Medical" (cu spinner în timpul fetch-ului POST)
8. **Feedback**: Mesaj de succes verde, reîmprospătare pagină (`router.refresh()`) și apelare callback `onSuccess(updatedEmployee)`.

---

## 6. Deblocarea Generării Documentelor (Feature 9)

În `src/app/documents/generate/page.tsx`:
1. Funcția `getEmployeeExpiryInfo(templateCode, employee)` verifică dacă:
   `employee.compliance.occupationalMedicine.status === 'OVERDUE'`.
2. Imediat ce noul examen medical este înregistrat via `POST /api/employees/[id]/medical-exam`, `calculateEmployeeCompliance` returnează `status: 'VALID'`.
3. `getEmployeeExpiryInfo` va returna:
   - `isExpired: false`
   - `badgeText: 'Conform'`
4. În consecință:
   - Dropdown-ul salariatului nu mai are opțiunea marcată `disabled` sau cu prefixul `🚫 [EXPIRAT - BLOCAT]`.
   - Cardul de avertizare roșie dispare.
   - Butonul de generare se deblochează instantaneu pentru emiterea șabloanelor statutare (`med-fisa-solicitare-examen`, `med-fisa-identificare-riscuri`, fișe de instruire etc.).

---

## 7. Plan de Verificare și Testare pentru Worker

După implementarea codului specificat, Worker-ul va rula următoarele comenzi de verificare:

1. **Compilare și validare schemă**:
   ```bash
   npx prisma validate
   npm run build
   ```
2. **Suită teste unitare de conformitate**:
   ```bash
   npx tsx scripts/verify-compliance.ts
   ```
   (Se vor adăuga cazuri de test pentru `calculateCompanyMetrics` cu salariați `status: 'PLECAT'`, demonstrând excluderea lor).
3. **Suită completă E2E**:
   ```bash
   npx tsx scripts/e2e-suite.ts
   npm test
   ```
   (Confirmare 100% pass rate pe toate suitele).
