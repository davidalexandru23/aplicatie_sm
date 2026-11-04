# Raport de Analiză Tehnică: Arhitectura Motorului de Calcul al Conformității (`src/lib/compliance.ts`)

**Autor:** Explorer 2 — Milestone 1 (Compliance Calculation Engine Architecture)  
**Data:** 1 Noiembrie 2026  
**Fișier Țintă Implementare:** `src/lib/compliance.ts`  
**Referințe Legislative:** HG 355/2007, Legea 319/2006, HG 1425/2006, Legea 307/2006, OMAI 712/2005, Ordinul 2209/4469/2022.

---

## 1. Sinteză Executivă

Acest document definește specificația completă, tipurile TypeScript, algoritmii matematici și logica de business pentru modulul `src/lib/compliance.ts`. Modulul acționează ca un motor pur, determinist și izolat de calcul al scadențelor legale și indicatorilor de conformitate pentru:
1. **Medicină a Muncii** (supravegherea stării de sănătate conform HG 355/2007, interval standard 12 luni, opțional 6 luni pentru riscuri specifice).
2. **Instruire Periodică SSM** (securitate și sănătate în muncă conform Legii 319/2006 și HG 1425/2006, interval standard 6 luni operativ, 12 luni TESA).
3. **Instructaj Periodic PSI / Situații de Urgență** (apărarea împotriva incendiilor conform Legii 307/2006 și OMAI 712/2005, interval standard 6 luni administrativ, 1–3 luni tehnic).
4. **Cursuri de Igienă** (noțiuni fundamentale de igienă conform Ordinului MS/ME 2209/4469/2022, valabilitate strictă 36 luni / 3 ani de la data promovării examenului, activat condiționat pe baza cerințelor postului).

Toate contractele de interfață exportate respectă cu strictețe specificațiile din `PROJECT.md` (linii 100–137), garantând interoperabilitatea directă cu baza de date Prisma (Milestone 1 Explorer 1), suita de testare unitară (Milestone 1 Explorer 3) și componentele de UI (Milestone 2).

---

## 2. Tipuri de Date și Contracte de Interfață TypeScript

Pentru a satisface contractul oficial stabilit în `PROJECT.md`, `src/lib/compliance.ts` trebuie să expună următoarele tipuri și interfețe:

```typescript
// ==========================================
// 1. STATUSURI ȘI REZULTATE DE CONFORMITATE
// ==========================================

export type ComplianceStatus = 'VALID' | 'UPCOMING' | 'OVERDUE' | 'MISSING';

export interface ComplianceItemResult {
  lastDate: Date | null;
  intervalMonths: number;
  dueDate: Date | null;
  daysRemaining: number | null;
  status: ComplianceStatus;
  label: string;
}

export interface EmployeeComplianceSummary {
  employeeId: string;
  employeeName: string;
  occupationalMedicine: ComplianceItemResult;
  ssmTraining: ComplianceItemResult;
  psiTraining: ComplianceItemResult;
  hygieneCertificate: ComplianceItemResult | null; // null dacă postul nu necesită curs de igienă
  overallStatus: ComplianceStatus;
}

export interface CompanyComplianceMetrics {
  totalEmployees: number;
  totalItemsTracked: number;
  validCount: number;
  upcomingCount: number;
  overdueCount: number;
  missingCount: number;
  complianceScorePercent: number; // (validCount / totalItemsTracked) * 100
}

// ==========================================
// 2. HELPERE PENTRU INTERFAȚA VIZUALĂ (UI)
// ==========================================

export interface ComplianceBadgeInfo {
  status: ComplianceStatus;
  text: string;
  className: string;
  daysRemaining: number | null;
}
```

### Constante Legislative Globale

Pentru a evita utilizarea numerelor magice în cod:

```typescript
export const COMPLIANCE_CONSTANTS = {
  // Intervale implicite (în luni)
  DEFAULT_MEDICAL_INTERVAL: 12, // HG 355/2007 (TESA & general)
  DEFAULT_SSM_INTERVAL: 6,      // HG 1425/2006 (operativ)
  DEFAULT_PSI_INTERVAL: 6,      // OMAI 712/2005 (administrativ / birou)
  DEFAULT_HYGIENE_INTERVAL: 36, // Ordinul MS/ME 2209/4469/2022 (valabilitate 3 ani)
  
  // Prag alertă scadență iminentă (în zile)
  UPCOMING_THRESHOLD_DAYS: 30,  // Scadent în 0..30 zile
} as const;
```

---

## 3. Algoritmul Matematic de Calcul al Scadențelor

### 3.1. Adunarea Sigură a Lunilor Calendaristice (`addMonthsSafe`)

O greșeală comună în calculul scadențelor este adăugarea de milisecunde fixe ($30 \times 86400 \times 1000$) sau utilizarea directă a `Date.setMonth(targetMonth)`. În JavaScript, adăugarea unei luni la data de 31 ianuarie duce la depășirea în luna martie (ex. 31 ianuarie + 1 lună devine 3 martie într-un an nebisect sau 2 martie într-un an bisect).

Conform dreptului civil și legislației muncii din România:
- Un termen de 1 lună calculat de la 31 ianuarie expiră în **ultima zi a lunii februarie** (28 februarie, respectiv 29 februarie în an bisect).
- Un termen de 12 luni calculat de la 29 februarie (an bisect) expiră în **28 februarie** a anului următor.
- Un termen de 1 lună calculat de la 31 august expiră în **30 septembrie**.

#### Algoritmul Matematic Exact

```typescript
export function addMonthsSafe(baseDate: Date | string, monthsToAdd: number): Date {
  const d = baseDate instanceof Date ? new Date(baseDate.getTime()) : new Date(baseDate);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided to addMonthsSafe: ${baseDate}`);
  }

  const originalDay = d.getDate();
  const currentYear = d.getFullYear();
  const currentMonth = d.getMonth(); // 0-11

  const targetMonthIndex = currentMonth + monthsToAdd;
  const targetYear = currentYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  // Numărul exact de zile din luna țintă (ziua 0 a lunii următoare returnează ultima zi din targetMonth)
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(originalDay, daysInTargetMonth);

  const result = new Date(d.getTime());
  result.setFullYear(targetYear, targetMonth, clampedDay);
  return result;
}
```

#### Demonstrația Funcționării pe Cazuri Limită

| Data Inițială | Luni Adăugate | `targetMonthIndex` | `targetYear` | `targetMonth` | `daysInTargetMonth` | `clampedDay` | Rezultat Final |
|---|---|---|---|---|---|---|---|
| `2024-02-29` (bisect) | 12 | 13 | 2025 | 1 (Feb) | 28 | $\min(29, 28) = 28$ | `2025-02-28` |
| `2024-02-29` (bisect) | 48 | 49 | 2028 | 1 (Feb) | 29 (bisect) | $\min(29, 29) = 29$ | `2028-02-29` |
| `2023-01-31` | 1 | 1 | 2023 | 1 (Feb) | 28 | $\min(31, 28) = 28$ | `2023-02-28` |
| `2024-01-31` | 1 | 1 | 2024 | 1 (Feb) | 29 | $\min(31, 29) = 29$ | `2024-02-29` |
| `2023-08-31` | 1 | 8 | 2023 | 8 (Sep) | 30 | $\min(31, 30) = 30$ | `2023-09-30` |
| `2023-04-15` | 36 (Igienă) | 39 | 2026 | 3 (Apr) | 30 | $\min(15, 30) = 15$ | `2026-04-15` |

---

### 3.2. Calculul Diferenței de Zile (`daysRemaining`) și Imunitatea la Fusul Orar / Ora de Vară

Diferența de zile calendaristice dintre `dueDate` și `referenceDate` trebuie să fie imună la variațiile de fus orar (EET UTC+2 vs EEST UTC+3) și la ora exactă a zilei (08:30 vs 23:59).

Normalizăm ambele date la miezul nopții UTC (`Date.UTC(year, month, day)`):

```typescript
function getDaysRemaining(dueDate: Date, referenceDate: Date): number {
  const dueUtc = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const refUtc = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((dueUtc - refUtc) / msPerDay);
}
```

Deoarece ambele valori sunt exprimate în UTC midnight, diferența `dueUtc - refUtc` este întotdeauna un multiplu întreg exact de $86.400.000\text{ ms}$, eliminând erorile de trunchiere cauzate de DST (+23 ore sau +25 ore la schimbarea orei).

---

## 4. Reguli de Clasificare a Statusului (`ComplianceStatus`)

Fiecare element individual primește un status pe baza următoarei grile stricte:

| Status | Condiție Matematică | Semnificație Operațională | Gravitate Legală |
|---|---|---|---|
| `MISSING` | `lastDate === null` sau `undefined` | Lipsă completă a documentului sau datei în dosar | **Critică**: Angajatul lucrează fără aviz medical sau instruire (nulitate CIM, risc amendă 4.000–8.000 lei) |
| `OVERDUE` | `daysRemaining < 0` | Valabilitatea a expirat anterior datei de referință | **Critică**: Depășire termen legal de instruire / control (amendă ITM 5.000–10.000 lei) |
| `UPCOMING` | `0 <= daysRemaining <= 30` | Scadență în următoarele 30 de zile calendaristice (inclusiv data curentă) | **Avertisment**: Valabil astăzi, necesită programare imediată la medic / sesiune instruire |
| `VALID` | `daysRemaining > 30` | În termen normal de valabilitate (> 30 zile) | **Conform**: Situație legală acoperită |

### Cazuri Limită Cheie

- Dacă `daysRemaining === 0` (expiră chiar astăzi) $\rightarrow$ `UPCOMING` (încă valabil pe parcursul zilei curente).
- Dacă `daysRemaining === 30` (exact 30 zile) $\rightarrow$ `UPCOMING` (intră în fereastra de alertă de 30 de zile).
- Dacă `daysRemaining === 31` (31 zile) $\rightarrow$ `VALID`.
- Dacă `daysRemaining === -1` (a expirat ieri) $\rightarrow$ `OVERDUE`.

---

## 5. Logica de Evaluare Individuală (`calculateItemCompliance`)

Funcția `calculateItemCompliance` realizează evaluarea unui pilon individual:

```typescript
export function calculateItemCompliance(
  lastDate: Date | string | null | undefined,
  intervalMonths: number,
  label: string,
  referenceDate: Date = new Date()
): ComplianceItemResult {
  // Interval de siguranță (minim 1 lună dacă e invalid/negativ)
  const safeInterval = intervalMonths > 0 ? intervalMonths : 12;

  if (!lastDate) {
    return {
      lastDate: null,
      intervalMonths: safeInterval,
      dueDate: null,
      daysRemaining: null,
      status: 'MISSING',
      label,
    };
  }

  const parsedDate = lastDate instanceof Date ? lastDate : new Date(lastDate);
  if (isNaN(parsedDate.getTime())) {
    return {
      lastDate: null,
      intervalMonths: safeInterval,
      dueDate: null,
      daysRemaining: null,
      status: 'MISSING',
      label,
    };
  }

  const dueDate = addMonthsSafe(parsedDate, safeInterval);
  const daysRemaining = getDaysRemaining(dueDate, referenceDate);

  let status: ComplianceStatus;
  if (daysRemaining < 0) {
    status = 'OVERDUE';
  } else if (daysRemaining <= COMPLIANCE_CONSTANTS.UPCOMING_THRESHOLD_DAYS) {
    status = 'UPCOMING';
  } else {
    status = 'VALID';
  }

  return {
    lastDate: parsedDate,
    intervalMonths: safeInterval,
    dueDate,
    daysRemaining,
    status,
    label,
  };
}
```

---

## 6. Evaluarea Completă a Angajatului (`calculateEmployeeCompliance`)

Fiecare salariat activ are 3 piloni obligatorii și 1 pilon condiționat:
1. `occupationalMedicine` (Medicină a Muncii) — implicit 12 luni.
2. `ssmTraining` (Instruire Periodică SSM) — implicit 6 luni.
3. `psiTraining` (Instruire Periodică PSI/SU) — implicit 6 luni.
4. `hygieneCertificate` (Cursuri de Igienă) — implicit 36 luni.
   - **Condiție de aplicabilitate**: Este activat dacă și numai dacă `employee.hygieneRequested === true` sau `employee.hygieneLastExamDate != null`.
   - Dacă angajatul nu necesită curs de igienă, câmpul este setat pe `null` și **nu influențează în niciun fel** statusul general (`overallStatus`).

### 6.1. Logica de Centralizare a Statusului General (`overallStatus Rollup`)

Centralizarea statusului general al unui salariat se bazează pe agregarea elementelor active:

$$\text{activeItems} = [\text{occupationalMedicine}, \text{ssmTraining}, \text{psiTraining}] \cup (\text{hygieneCertificate} \ne \text{null} ? [\text{hygieneCertificate}] : [])$$

Ierarhia de prioritate a severității este determinată strict astfel:
1. **`OVERDUE`** (Prioritate 1): Dacă **oricare** element activ are statusul `'OVERDUE'`, salariatul este `'OVERDUE'`. Risc legal imediat.
2. **`MISSING`** (Prioritate 2): Dacă niciun element nu este `'OVERDUE'`, dar **oricare** element activ are statusul `'MISSING'`, salariatul este `'MISSING'`. Salariatul are dosar incomplet.
3. **`UPCOMING`** (Prioritate 3): Dacă nu există elemente `'OVERDUE'` sau `'MISSING'`, dar **oricare** element activ are statusul `'UPCOMING'`, salariatul este `'UPCOMING'`. Necesită programare în următoarele 30 de zile.
4. **`VALID`** (Prioritate 4): Dacă și numai dacă **toate** elementele active au statusul `'VALID'`, salariatul este `'VALID'`.

### 6.2. Codul Complet `calculateEmployeeCompliance`

```typescript
export function calculateEmployeeCompliance(
  employee: any,
  referenceDate: Date = new Date()
): EmployeeComplianceSummary {
  const employeeId = String(employee?.id || '');
  
  // Formatare nume complet robustă
  const employeeName = employee?.fullName || (
    employee?.lastName && employee?.firstName
      ? `${employee.lastName} ${employee.firstName}`
      : employee?.lastName || employee?.firstName || 'Angajat'
  );

  // 1. Medicină a Muncii
  const occupationalMedicine = calculateItemCompliance(
    employee?.medicalLastExamDate,
    employee?.medicalIntervalMonths ?? COMPLIANCE_CONSTANTS.DEFAULT_MEDICAL_INTERVAL,
    'Medicină a Muncii',
    referenceDate
  );

  // 2. Instruire SSM
  const ssmTraining = calculateItemCompliance(
    employee?.ssmLastTrainingDate,
    employee?.ssmIntervalMonths ?? COMPLIANCE_CONSTANTS.DEFAULT_SSM_INTERVAL,
    'Instruire SSM',
    referenceDate
  );

  // 3. Instruire PSI/SU
  const psiTraining = calculateItemCompliance(
    employee?.psiLastTrainingDate,
    employee?.psiIntervalMonths ?? COMPLIANCE_CONSTANTS.DEFAULT_PSI_INTERVAL,
    'Instruire PSI/SU',
    referenceDate
  );

  // 4. Curs Igienă (doar dacă e solicitat sau există examen consemnat)
  const isHygieneApplicable = Boolean(
    employee?.hygieneRequested || employee?.hygieneLastExamDate
  );

  const hygieneCertificate = isHygieneApplicable
    ? calculateItemCompliance(
        employee?.hygieneLastExamDate,
        employee?.hygieneIntervalMonths ?? COMPLIANCE_CONSTANTS.DEFAULT_HYGIENE_INTERVAL,
        'Cursuri de Igienă',
        referenceDate
      )
    : null;

  // Agregare elemente active
  const activeItems: ComplianceItemResult[] = [
    occupationalMedicine,
    ssmTraining,
    psiTraining,
  ];
  if (hygieneCertificate !== null) {
    activeItems.push(hygieneCertificate);
  }

  // Rollup logică de prioritate
  let overallStatus: ComplianceStatus;
  if (activeItems.some((i) => i.status === 'OVERDUE')) {
    overallStatus = 'OVERDUE';
  } else if (activeItems.some((i) => i.status === 'MISSING')) {
    overallStatus = 'MISSING';
  } else if (activeItems.some((i) => i.status === 'UPCOMING')) {
    overallStatus = 'UPCOMING';
  } else {
    overallStatus = 'VALID';
  }

  return {
    employeeId,
    employeeName,
    occupationalMedicine,
    ssmTraining,
    psiTraining,
    hygieneCertificate,
    overallStatus,
  };
}
```

---

## 7. Metrici Agregate la Nivel de Companie (`calculateCompanyMetrics`)

Funcția `calculateCompanyMetrics` sintetizează conformitatea întregii colectivități de salariați:

```typescript
export function calculateCompanyMetrics(
  employees: any[],
  referenceDate: Date = new Date()
): CompanyComplianceMetrics {
  const employeeList = Array.isArray(employees) ? employees : [];
  const totalEmployees = employeeList.length;

  let totalItemsTracked = 0;
  let validCount = 0;
  let upcomingCount = 0;
  let overdueCount = 0;
  let missingCount = 0;

  for (const emp of employeeList) {
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

  // Scorul de conformitate ca procent rotunjit (0 dacă nu există elemente)
  const complianceScorePercent = totalItemsTracked === 0
    ? 0
    : Math.round((validCount / totalItemsTracked) * 100);

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

## 8. Utilitare UI și Formatare Dată Românească

Pentru a deservi componentele Next.js (`src/components/compliance-badge.tsx`, `src/app/employees/page.tsx`, `src/app/clients/[id]/page.tsx`), modulul exportă helperi de stilizare și formatare SSR-safe:

```typescript
// Helper formatare dată ZZ.LL.AAAA imun la desincronizări SSR / timezone
export function formatRoDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// Helper stilizare badge individual
export function getStatusBadgeInfo(
  status: ComplianceStatus,
  daysRemaining?: number | null
): ComplianceBadgeInfo {
  switch (status) {
    case 'VALID':
      return {
        status,
        text: daysRemaining !== null && daysRemaining !== undefined 
          ? `VALID (${daysRemaining}z)` 
          : 'VALID',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        daysRemaining: daysRemaining ?? null,
      };
    case 'UPCOMING':
      return {
        status,
        text: daysRemaining === 0 
          ? 'SCADENT AZI' 
          : daysRemaining !== null && daysRemaining !== undefined 
            ? `SCADENT (${daysRemaining}z)` 
            : 'SCADENT',
        className: 'bg-amber-50 text-amber-700 border border-amber-200 font-medium',
        daysRemaining: daysRemaining ?? null,
      };
    case 'OVERDUE':
      return {
        status,
        text: daysRemaining !== null && daysRemaining !== undefined 
          ? `EXPIRAT (${Math.abs(daysRemaining)}z)` 
          : 'EXPIRAT',
        className: 'bg-red-50 text-red-700 border border-red-200 font-semibold',
        daysRemaining: daysRemaining ?? null,
      };
    case 'MISSING':
    default:
      return {
        status: 'MISSING',
        text: 'NEÎNREGISTRAT',
        className: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
        daysRemaining: null,
      };
  }
}

// Helper stilizare badge overall per salariat
export function getOverallStatusBadgeInfo(status: ComplianceStatus): {
  text: string;
  className: string;
} {
  switch (status) {
    case 'VALID':
      return {
        text: 'CONFORM',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    case 'UPCOMING':
      return {
        text: 'SCADENȚĂ IMINENTĂ',
        className: 'bg-amber-50 text-amber-700 border border-amber-200 font-medium',
      };
    case 'OVERDUE':
      return {
        text: 'EXPIRAT / NECONFORM',
        className: 'bg-red-50 text-red-700 border border-red-200 font-bold',
      };
    case 'MISSING':
    default:
      return {
        text: 'DATE LIPSĂ',
        className: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      };
  }
}
```

---

## 9. Codul Sursă Propus Complet pentru `src/lib/compliance.ts`

Mai jos este redat fișierul complet, unificat și gata de implementare directă în `src/lib/compliance.ts`:

```typescript
/**
 * Romanian SSM, PSI/SU, Occupational Medicine & Hygiene Compliance Calculation Engine
 * 
 * Normative Framework:
 * - Occupational Medicine: HG nr. 355/2007 (12-month standard, 6-month specific risks)
 * - Periodic SSM Training: Legea nr. 319/2006, HG nr. 1425/2006 (6-month operational, 12-month TESA)
 * - Periodic PSI/SU Training: Legea nr. 307/2006, OMAI nr. 712/2005 (6-month admin, 1-3 month operational)
 * - Hygiene Courses: Ordinul comun MS/ME nr. 2209/4469/2022 (36-month / 3-year validity)
 */

export type ComplianceStatus = 'VALID' | 'UPCOMING' | 'OVERDUE' | 'MISSING';

export interface ComplianceItemResult {
  lastDate: Date | null;
  intervalMonths: number;
  dueDate: Date | null;
  daysRemaining: number | null;
  status: ComplianceStatus;
  label: string;
}

export interface EmployeeComplianceSummary {
  employeeId: string;
  employeeName: string;
  occupationalMedicine: ComplianceItemResult;
  ssmTraining: ComplianceItemResult;
  psiTraining: ComplianceItemResult;
  hygieneCertificate: ComplianceItemResult | null; // null if hygiene not required
  overallStatus: ComplianceStatus;
}

export interface CompanyComplianceMetrics {
  totalEmployees: number;
  totalItemsTracked: number;
  validCount: number;
  upcomingCount: number;
  overdueCount: number;
  missingCount: number;
  complianceScorePercent: number; // (validCount / totalItemsTracked) * 100
}

export interface ComplianceBadgeInfo {
  status: ComplianceStatus;
  text: string;
  className: string;
  daysRemaining: number | null;
}

export const COMPLIANCE_CONSTANTS = {
  DEFAULT_MEDICAL_INTERVAL: 12,
  DEFAULT_SSM_INTERVAL: 6,
  DEFAULT_PSI_INTERVAL: 6,
  DEFAULT_HYGIENE_INTERVAL: 36,
  UPCOMING_THRESHOLD_DAYS: 30,
} as const;

/**
 * Adds months to a date with calendar month clamping (e.g., Jan 31 + 1 month -> Feb 28/29).
 */
export function addMonthsSafe(baseDate: Date | string, monthsToAdd: number): Date {
  const d = baseDate instanceof Date ? new Date(baseDate.getTime()) : new Date(baseDate);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided to addMonthsSafe: ${baseDate}`);
  }

  const originalDay = d.getDate();
  const currentYear = d.getFullYear();
  const currentMonth = d.getMonth();

  const targetMonthIndex = currentMonth + monthsToAdd;
  const targetYear = currentYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  // Day 0 of the next month returns the exact last day of targetMonth
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(originalDay, daysInTargetMonth);

  const result = new Date(d.getTime());
  result.setFullYear(targetYear, targetMonth, clampedDay);
  return result;
}

/**
 * Calculates calendar days remaining between dueDate and referenceDate normalized to UTC midnight.
 */
function getDaysRemaining(dueDate: Date, referenceDate: Date): number {
  const dueUtc = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const refUtc = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((dueUtc - refUtc) / msPerDay);
}

/**
 * Calculates compliance status for a single requirement item.
 */
export function calculateItemCompliance(
  lastDate: Date | string | null | undefined,
  intervalMonths: number,
  label: string,
  referenceDate: Date = new Date()
): ComplianceItemResult {
  const safeInterval = intervalMonths > 0 ? intervalMonths : 12;

  if (!lastDate) {
    return {
      lastDate: null,
      intervalMonths: safeInterval,
      dueDate: null,
      daysRemaining: null,
      status: 'MISSING',
      label,
    };
  }

  const parsedDate = lastDate instanceof Date ? lastDate : new Date(lastDate);
  if (isNaN(parsedDate.getTime())) {
    return {
      lastDate: null,
      intervalMonths: safeInterval,
      dueDate: null,
      daysRemaining: null,
      status: 'MISSING',
      label,
    };
  }

  const dueDate = addMonthsSafe(parsedDate, safeInterval);
  const daysRemaining = getDaysRemaining(dueDate, referenceDate);

  let status: ComplianceStatus;
  if (daysRemaining < 0) {
    status = 'OVERDUE';
  } else if (daysRemaining <= COMPLIANCE_CONSTANTS.UPCOMING_THRESHOLD_DAYS) {
    status = 'UPCOMING';
  } else {
    status = 'VALID';
  }

  return {
    lastDate: parsedDate,
    intervalMonths: safeInterval,
    dueDate,
    daysRemaining,
    status,
    label,
  };
}

/**
 * Evaluates full compliance for an employee across all 4 legal dimensions.
 */
export function calculateEmployeeCompliance(
  employee: any,
  referenceDate: Date = new Date()
): EmployeeComplianceSummary {
  const employeeId = String(employee?.id || '');
  const employeeName = employee?.fullName || (
    employee?.lastName && employee?.firstName
      ? `${employee.lastName} ${employee.firstName}`
      : employee?.lastName || employee?.firstName || 'Angajat'
  );

  // 1. Occupational Medicine (HG 355/2007)
  const occupationalMedicine = calculateItemCompliance(
    employee?.medicalLastExamDate,
    employee?.medicalIntervalMonths ?? COMPLIANCE_CONSTANTS.DEFAULT_MEDICAL_INTERVAL,
    'Medicină a Muncii',
    referenceDate
  );

  // 2. Periodic SSM Training (Legea 319/2006, HG 1425/2006)
  const ssmTraining = calculateItemCompliance(
    employee?.ssmLastTrainingDate,
    employee?.ssmIntervalMonths ?? COMPLIANCE_CONSTANTS.DEFAULT_SSM_INTERVAL,
    'Instruire SSM',
    referenceDate
  );

  // 3. Periodic PSI/SU Training (Legea 307/2006, OMAI 712/2005)
  const psiTraining = calculateItemCompliance(
    employee?.psiLastTrainingDate,
    employee?.psiIntervalMonths ?? COMPLIANCE_CONSTANTS.DEFAULT_PSI_INTERVAL,
    'Instruire PSI/SU',
    referenceDate
  );

  // 4. Hygiene Course (Ordinul 2209/4469/2022) - conditionally tracked
  const isHygieneApplicable = Boolean(
    employee?.hygieneRequested || employee?.hygieneLastExamDate
  );

  const hygieneCertificate = isHygieneApplicable
    ? calculateItemCompliance(
        employee?.hygieneLastExamDate,
        employee?.hygieneIntervalMonths ?? COMPLIANCE_CONSTANTS.DEFAULT_HYGIENE_INTERVAL,
        'Cursuri de Igienă',
        referenceDate
      )
    : null;

  // Active items to consider for rollup
  const activeItems: ComplianceItemResult[] = [
    occupationalMedicine,
    ssmTraining,
    psiTraining,
  ];
  if (hygieneCertificate !== null) {
    activeItems.push(hygieneCertificate);
  }

  // Rollup priority: OVERDUE > MISSING > UPCOMING > VALID
  let overallStatus: ComplianceStatus;
  if (activeItems.some((i) => i.status === 'OVERDUE')) {
    overallStatus = 'OVERDUE';
  } else if (activeItems.some((i) => i.status === 'MISSING')) {
    overallStatus = 'MISSING';
  } else if (activeItems.some((i) => i.status === 'UPCOMING')) {
    overallStatus = 'UPCOMING';
  } else {
    overallStatus = 'VALID';
  }

  return {
    employeeId,
    employeeName,
    occupationalMedicine,
    ssmTraining,
    psiTraining,
    hygieneCertificate,
    overallStatus,
  };
}

/**
 * Calculates aggregated compliance metrics for a group of employees (e.g. at company level).
 */
export function calculateCompanyMetrics(
  employees: any[],
  referenceDate: Date = new Date()
): CompanyComplianceMetrics {
  const employeeList = Array.isArray(employees) ? employees : [];
  const totalEmployees = employeeList.length;

  let totalItemsTracked = 0;
  let validCount = 0;
  let upcomingCount = 0;
  let overdueCount = 0;
  let missingCount = 0;

  for (const emp of employeeList) {
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
    ? 0
    : Math.round((validCount / totalItemsTracked) * 100);

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

/**
 * Safe Romanian date formatter (DD.MM.YYYY) preventing SSR hydration mismatches.
 */
export function formatRoDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * UI Badge text and Tailwind CSS class styling helper for an individual compliance item.
 */
export function getStatusBadgeInfo(
  status: ComplianceStatus,
  daysRemaining?: number | null
): ComplianceBadgeInfo {
  switch (status) {
    case 'VALID':
      return {
        status,
        text: daysRemaining !== null && daysRemaining !== undefined 
          ? `VALID (${daysRemaining}z)` 
          : 'VALID',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        daysRemaining: daysRemaining ?? null,
      };
    case 'UPCOMING':
      return {
        status,
        text: daysRemaining === 0 
          ? 'SCADENT AZI' 
          : daysRemaining !== null && daysRemaining !== undefined 
            ? `SCADENT (${daysRemaining}z)` 
            : 'SCADENT',
        className: 'bg-amber-50 text-amber-700 border border-amber-200 font-medium',
        daysRemaining: daysRemaining ?? null,
      };
    case 'OVERDUE':
      return {
        status,
        text: daysRemaining !== null && daysRemaining !== undefined 
          ? `EXPIRAT (${Math.abs(daysRemaining)}z)` 
          : 'EXPIRAT',
        className: 'bg-red-50 text-red-700 border border-red-200 font-semibold',
        daysRemaining: daysRemaining ?? null,
      };
    case 'MISSING':
    default:
      return {
        status: 'MISSING',
        text: 'NEÎNREGISTRAT',
        className: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
        daysRemaining: null,
      };
  }
}

/**
 * UI Badge text and Tailwind CSS class styling helper for an employee overall compliance status.
 */
export function getOverallStatusBadgeInfo(status: ComplianceStatus): {
  text: string;
  className: string;
} {
  switch (status) {
    case 'VALID':
      return {
        text: 'CONFORM',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    case 'UPCOMING':
      return {
        text: 'SCADENȚĂ IMINENTĂ',
        className: 'bg-amber-50 text-amber-700 border border-amber-200 font-medium',
      };
    case 'OVERDUE':
      return {
        text: 'EXPIRAT / NECONFORM',
        className: 'bg-red-50 text-red-700 border border-red-200 font-bold',
      };
    case 'MISSING':
    default:
      return {
        text: 'DATE LIPSĂ',
        className: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      };
  }
}
```

---

## 10. Recomandări de Integrare pentru Colegii de Echipă

1. **Pentru Explorer 1 (Prisma Schema)**:
   - Câmpurile din `Employee` trebuie să fie numite exact:
     - `medicalLastExamDate` (DateTime?)
     - `medicalIntervalMonths` (Int? @default(12))
     - `medicalFitnessVerdict` (String? @default("APT"))
     - `medicalNotes` (String?)
     - `ssmLastTrainingDate` (DateTime?)
     - `ssmIntervalMonths` (Int? @default(6))
     - `ssmNotes` (String?)
     - `psiLastTrainingDate` (DateTime?)
     - `psiIntervalMonths` (Int? @default(6))
     - `psiNotes` (String?)
     - `hygieneRequested` (Boolean @default(false))
     - `hygieneLastExamDate` (DateTime?)
     - `hygieneIntervalMonths` (Int? @default(36))
     - `hygieneCertificateNumber` (String?)
     - `hygieneCertificateIssueDate` (DateTime?)
     - `hygieneNotes` (String?)
2. **Pentru Explorer 3 (Unit Testing)**:
   - Suita `scripts/verify-compliance.ts` trebuie să testeze:
     - `addMonthsSafe` pe ani bisecți (2024-02-29 + 12m $\rightarrow$ 2025-02-28, + 48m $\rightarrow$ 2028-02-29).
     - `addMonthsSafe` pe sfârșit de lună (2023-01-31 + 1m $\rightarrow$ 2023-02-28, 2023-08-31 + 1m $\rightarrow$ 2023-09-30).
     - Pragurile de `daysRemaining` la data de referință fixată: `0` (UPCOMING), `30` (UPCOMING), `31` (VALID), `-1` (OVERDUE).
     - Tratarea `null`/`undefined` $\rightarrow$ `MISSING`.
     - `hygieneRequested: false` $\rightarrow$ `hygieneCertificate === null`, nu penalizează scorul.
     - `hygieneRequested: true` cu dată expirată $\rightarrow$ `overallStatus = 'OVERDUE'`.
     - `calculateCompanyMetrics` peste colectivitate mixtă (procent calculat ca `(valid / total) * 100`).
