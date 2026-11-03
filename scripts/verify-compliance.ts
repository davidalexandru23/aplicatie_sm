/**
 * scripts/verify-compliance.ts
 * 
 * Suită exhaustivă de teste unitare pentru motorul determinist de calcul al conformității SSM:
 * - Aritmetică calendaristică cu month clamping (ani bisecți, 31 -> 30 zile, 36 luni)
 * - Imunitate DST (ora de vară/iarnă) și normalizare orară la miezul nopții
 * - Praguri de stare (VALID >30d, UPCOMING 0..30d, OVERDUE <0d, MISSING)
 * - Zile limită exacte (+31d, +30d, +1d, 0d, -1d)
 * - Urmărire condițională a cursurilor de igienă (hygieneRequested)
 * - Ierarhia de agregare per salariat (overallStatus)
 * - Metrice agregate per companie și protecție împotriva diviziunii la zero
 * - Helperi de formatare și badge-uri UI
 * 
 * Rulare: npx tsx scripts/verify-compliance.ts
 */

import assert from 'node:assert/strict';
import {
  addMonthsSafe,
  calculateItemCompliance,
  calculateEmployeeCompliance,
  calculateCompanyMetrics,
  formatRoDate,
  getStatusBadgeInfo,
  getOverallStatusBadgeInfo,
} from '../src/lib/compliance';

interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

interface TestSuite {
  name: string;
  cases: TestCase[];
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function runComplianceTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  success: boolean;
}> {
  console.log('================================================================');
  console.log('   SUITĂ DE TESTE UNITARE: MOTORUL DE CONFORMITATE SSM & PSI    ');
  console.log('================================================================\n');

  const suites: TestSuite[] = [
    // -------------------------------------------------------------------------
    // SUITA 1: Aritmetică Calendaristică și End-of-Month Clamping (18 teste)
    // -------------------------------------------------------------------------
    {
      name: '1. Aritmetică Calendaristică și Safe Month Clamping (addMonthsSafe)',
      cases: [
        {
          name: 'An bisect 2024-02-29 + 12 luni -> 2025-02-28',
          fn: () => {
            const res = addMonthsSafe(new Date(2024, 1, 29), 12);
            assert.equal(formatDate(res), '2025-02-28');
          },
        },
        {
          name: 'An bisect 2024-02-29 + 24 luni -> 2026-02-28',
          fn: () => {
            const res = addMonthsSafe(new Date(2024, 1, 29), 24);
            assert.equal(formatDate(res), '2026-02-28');
          },
        },
        {
          name: 'An bisect 2024-02-29 + 36 luni (Igienă) -> 2027-02-28',
          fn: () => {
            const res = addMonthsSafe(new Date(2024, 1, 29), 36);
            assert.equal(formatDate(res), '2027-02-28');
          },
        },
        {
          name: 'An bisect 2024-02-29 + 48 luni (an bisect) -> 2028-02-29',
          fn: () => {
            const res = addMonthsSafe(new Date(2024, 1, 29), 48);
            assert.equal(formatDate(res), '2028-02-29');
          },
        },
        {
          name: 'An bisect 2020-02-29 + 36 luni -> 2023-02-28',
          fn: () => {
            const res = addMonthsSafe(new Date(2020, 1, 29), 36);
            assert.equal(formatDate(res), '2023-02-28');
          },
        },
        {
          name: 'An nebisect 2023-02-28 + 12 luni -> 2024-02-28 (rămâne 28, nu sare la 29)',
          fn: () => {
            const res = addMonthsSafe(new Date(2023, 1, 28), 12);
            assert.equal(formatDate(res), '2024-02-28');
          },
        },
        {
          name: 'Tranziție 31 Ianuarie 2023 + 1 lună -> 2023-02-28 (an nebisect)',
          fn: () => {
            const res = addMonthsSafe(new Date(2023, 0, 31), 1);
            assert.equal(formatDate(res), '2023-02-28');
          },
        },
        {
          name: 'Tranziție 31 Ianuarie 2024 + 1 lună -> 2024-02-29 (an bisect)',
          fn: () => {
            const res = addMonthsSafe(new Date(2024, 0, 31), 1);
            assert.equal(formatDate(res), '2024-02-29');
          },
        },
        {
          name: 'Tranziție 31 Martie 2023 + 1 lună -> 2023-04-30 (Aprilie are 30 zile)',
          fn: () => {
            const res = addMonthsSafe(new Date(2023, 2, 31), 1);
            assert.equal(formatDate(res), '2023-04-30');
          },
        },
        {
          name: 'Tranziție 31 Mai 2023 + 1 lună -> 2023-06-30 (Iunie are 30 zile)',
          fn: () => {
            const res = addMonthsSafe(new Date(2023, 4, 31), 1);
            assert.equal(formatDate(res), '2023-06-30');
          },
        },
        {
          name: 'Tranziție 31 August 2023 + 1 lună -> 2023-09-30 (Septembrie are 30 zile)',
          fn: () => {
            const res = addMonthsSafe(new Date(2023, 7, 31), 1);
            assert.equal(formatDate(res), '2023-09-30');
          },
        },
        {
          name: 'Tranziție 31 Octombrie 2023 + 1 lună -> 2023-11-30 (Noiembrie are 30 zile)',
          fn: () => {
            const res = addMonthsSafe(new Date(2023, 9, 31), 1);
            assert.equal(formatDate(res), '2023-11-30');
          },
        },
        {
          name: 'Salt trimestrial 31 Ianuarie 2023 + 3 luni -> 2023-04-30',
          fn: () => {
            const res = addMonthsSafe(new Date(2023, 0, 31), 3);
            assert.equal(formatDate(res), '2023-04-30');
          },
        },
        {
          name: 'Salt semestrial 31 August 2023 + 6 luni -> 2024-02-29 (Februarie bisect)',
          fn: () => {
            const res = addMonthsSafe(new Date(2023, 7, 31), 6);
            assert.equal(formatDate(res), '2024-02-29');
          },
        },
        {
          name: 'Salt semestrial 31 August 2024 + 6 luni -> 2025-02-28 (Februarie nebisect)',
          fn: () => {
            const res = addMonthsSafe(new Date(2024, 7, 31), 6);
            assert.equal(formatDate(res), '2025-02-28');
          },
        },
        {
          name: 'Tranziție de an: 15 Noiembrie 2023 + 3 luni -> 2024-02-15',
          fn: () => {
            const res = addMonthsSafe(new Date(2023, 10, 15), 3);
            assert.equal(formatDate(res), '2024-02-15');
          },
        },
        {
          name: 'String ISO ca dată de intrare: "2024-02-29" + 12 luni -> 2025-02-28',
          fn: () => {
            const res = addMonthsSafe('2024-02-29T00:00:00.000Z', 12);
            assert.equal(res.getFullYear(), 2025);
            assert.equal(res.getMonth(), 1); // Februarie
            assert.equal(res.getDate(), 28);
          },
        },
        {
          name: 'Adăugare 0 luni: 2025-03-31 + 0 luni -> 2025-03-31',
          fn: () => {
            const res = addMonthsSafe(new Date(2025, 2, 31), 0);
            assert.equal(formatDate(res), '2025-03-31');
          },
        },
      ],
    },

    // -------------------------------------------------------------------------
    // SUITA 2: Praguri de Stare, Zile Limită și Imunitate DST (14 teste)
    // -------------------------------------------------------------------------
    {
      name: '2. Praguri de Stare și Cazuri Limită (calculateItemCompliance)',
      cases: [
        {
          name: 'Exact 31 zile rămase -> status VALID',
          fn: () => {
            const refDate = new Date(2026, 4, 1); // 1 Mai 2026
            const lastDate = new Date(2025, 5, 1); // 1 Iunie 2025 (+12 luni -> 1 Iunie 2026 = 31 zile)
            const item = calculateItemCompliance(lastDate, 12, 'Medicină Muncii', refDate);
            assert.equal(item.daysRemaining, 31);
            assert.equal(item.status, 'VALID');
          },
        },
        {
          name: 'Exact 30 zile rămase -> status UPCOMING',
          fn: () => {
            const refDate = new Date(2026, 4, 2); // 2 Mai 2026
            const lastDate = new Date(2025, 5, 1); // due 1 Iunie 2026 (30 zile)
            const item = calculateItemCompliance(lastDate, 12, 'Medicină Muncii', refDate);
            assert.equal(item.daysRemaining, 30);
            assert.equal(item.status, 'UPCOMING');
          },
        },
        {
          name: 'Exact 1 zi rămasă (scadență mâine) -> status UPCOMING',
          fn: () => {
            const refDate = new Date(2026, 4, 31);
            const lastDate = new Date(2025, 5, 1); // due 1 Iunie 2026 (1 zi)
            const item = calculateItemCompliance(lastDate, 12, 'Medicină Muncii', refDate);
            assert.equal(item.daysRemaining, 1);
            assert.equal(item.status, 'UPCOMING');
          },
        },
        {
          name: 'Exact 0 zile rămase (scadent astăzi) -> status UPCOMING (nu OVERDUE)',
          fn: () => {
            const refDate = new Date(2026, 5, 1); // 1 Iunie 2026
            const lastDate = new Date(2025, 5, 1); // due 1 Iunie 2026 (0 zile)
            const item = calculateItemCompliance(lastDate, 12, 'Medicină Muncii', refDate);
            assert.equal(item.daysRemaining, 0);
            assert.equal(item.status, 'UPCOMING');
          },
        },
        {
          name: 'Exact -1 zi rămasă (expirat ieri) -> status OVERDUE',
          fn: () => {
            const refDate = new Date(2026, 5, 2); // 2 Iunie 2026
            const lastDate = new Date(2025, 5, 1); // due 1 Iunie 2026 (-1 zi)
            const item = calculateItemCompliance(lastDate, 12, 'Medicină Muncii', refDate);
            assert.equal(item.daysRemaining, -1);
            assert.equal(item.status, 'OVERDUE');
          },
        },
        {
          name: 'Expirat de 30 de zile (-30 zile) -> status OVERDUE',
          fn: () => {
            const refDate = new Date(2026, 6, 1); // 1 Iulie 2026
            const lastDate = new Date(2025, 5, 1); // due 1 Iunie 2026 (-30 zile)
            const item = calculateItemCompliance(lastDate, 12, 'Medicină Muncii', refDate);
            assert.equal(item.daysRemaining, -30);
            assert.equal(item.status, 'OVERDUE');
          },
        },
        {
          name: 'Valabil pe termen lung (365 zile rămase) -> status VALID',
          fn: () => {
            const refDate = new Date(2025, 5, 1);
            const lastDate = new Date(2025, 5, 1); // due 1 Iunie 2026
            const item = calculateItemCompliance(lastDate, 12, 'Medicină Muncii', refDate);
            assert.equal(item.daysRemaining, 365);
            assert.equal(item.status, 'VALID');
          },
        },
        {
          name: 'Data nulă (lastDate === null) -> status MISSING, dueDate null, daysRemaining null',
          fn: () => {
            const item = calculateItemCompliance(null, 12, 'Medicină Muncii');
            assert.equal(item.status, 'MISSING');
            assert.equal(item.dueDate, null);
            assert.equal(item.daysRemaining, null);
            assert.equal(item.lastDate, null);
          },
        },
        {
          name: 'Data nedefinită (lastDate === undefined) -> status MISSING',
          fn: () => {
            const item = calculateItemCompliance(undefined, 12, 'Medicină Muncii');
            assert.equal(item.status, 'MISSING');
          },
        },
        {
          name: 'Șir de caractere invalid ca dată -> fallback sigur la MISSING fără excepție',
          fn: () => {
            const item = calculateItemCompliance('data-invalida', 12, 'Medicină Muncii');
            assert.equal(item.status, 'MISSING');
          },
        },
        {
          name: 'Imunitate DST: trecerea la ora de vară în România (28 Martie -> 30 Martie = 2 zile)',
          fn: () => {
            const refDate = new Date(2026, 2, 28);
            const item = calculateItemCompliance(new Date(2025, 2, 30), 12, 'Test DST', refDate);
            assert.equal(item.daysRemaining, 2);
          },
        },
        {
          name: 'Imunitate componente orare: oră diferită în refDate și dueDate nu alterează scadența zilei (0d)',
          fn: () => {
            const refDate = new Date(2026, 5, 1, 18, 30, 0); // 1 Iunie 2026 18:30
            const lastDate = new Date(2025, 5, 1, 8, 0, 0);  // 1 Iunie 2025 08:00
            const item = calculateItemCompliance(lastDate, 12, 'Medicină Muncii', refDate);
            assert.equal(item.daysRemaining, 0);
            assert.equal(item.status, 'UPCOMING');
          },
        },
        {
          name: 'Helper formatare dată românească formatRoDate (dată validă și null)',
          fn: () => {
            assert.equal(formatRoDate(new Date(2026, 4, 15)), '15.05.2026');
            assert.equal(formatRoDate(null), '—');
            assert.equal(formatRoDate(undefined), '—');
            assert.equal(formatRoDate('data-invalida'), '—');
          },
        },
        {
          name: 'Helper badge individual getStatusBadgeInfo (stări și etichete corecte)',
          fn: () => {
            const badgeValid = getStatusBadgeInfo('VALID', 45);
            assert.equal(badgeValid.text, 'VALID (45z)');
            assert.equal(badgeValid.status, 'VALID');

            const badgeDueToday = getStatusBadgeInfo('UPCOMING', 0);
            assert.equal(badgeDueToday.text, 'SCADENT AZI');

            const badgeOverdue = getStatusBadgeInfo('OVERDUE', -10);
            assert.equal(badgeOverdue.text, 'EXPIRAT (10z)');

            const badgeMissing = getStatusBadgeInfo('MISSING');
            assert.equal(badgeMissing.text, 'NEÎNREGISTRAT');
            assert.equal(badgeMissing.daysRemaining, null);

            const overallValid = getOverallStatusBadgeInfo('VALID');
            assert.equal(overallValid.text, 'CONFORM');
          },
        },
      ],
    },

    // -------------------------------------------------------------------------
    // SUITA 3: Evaluarea Salariatului și Urmărirea Cursurilor de Igienă (9 teste)
    // -------------------------------------------------------------------------
    {
      name: '3. Evaluare Salariat și Cursuri de Igienă (calculateEmployeeCompliance)',
      cases: [
        {
          name: 'Salariat complet conform fără curs de igienă (hygieneRequested = false) -> overall VALID',
          fn: () => {
            const refDate = new Date(2026, 4, 15);
            const emp = {
              id: 'emp-1',
              firstName: 'Ion',
              lastName: 'Popescu',
              medicalLastExamDate: new Date(2026, 0, 10),
              medicalIntervalMonths: 12,
              ssmLastTrainingDate: new Date(2026, 2, 10),
              ssmIntervalMonths: 6,
              psiLastTrainingDate: new Date(2026, 2, 10),
              psiIntervalMonths: 6,
              hygieneRequested: false,
            };
            const summary = calculateEmployeeCompliance(emp, refDate);
            assert.equal(summary.overallStatus, 'VALID');
            assert.equal(summary.hygieneCertificate, null);
          },
        },
        {
          name: 'Salariat cu un element UPCOMING -> overallStatus UPCOMING',
          fn: () => {
            const refDate = new Date(2026, 4, 15);
            const emp = {
              id: 'emp-2',
              firstName: 'Maria',
              lastName: 'Ionescu',
              medicalLastExamDate: new Date(2025, 5, 1), // due 1 Iunie 2026 (17 zile rămase)
              medicalIntervalMonths: 12,
              ssmLastTrainingDate: new Date(2026, 2, 10),
              ssmIntervalMonths: 6,
              psiLastTrainingDate: new Date(2026, 2, 10),
              psiIntervalMonths: 6,
              hygieneRequested: false,
            };
            const summary = calculateEmployeeCompliance(emp, refDate);
            assert.equal(summary.occupationalMedicine.status, 'UPCOMING');
            assert.equal(summary.overallStatus, 'UPCOMING');
          },
        },
        {
          name: 'Salariat cu un element OVERDUE -> overallStatus OVERDUE',
          fn: () => {
            const refDate = new Date(2026, 4, 15);
            const emp = {
              id: 'emp-3',
              firstName: 'Vasile',
              lastName: 'Radu',
              medicalLastExamDate: new Date(2026, 0, 10),
              medicalIntervalMonths: 12,
              ssmLastTrainingDate: new Date(2025, 9, 1), // due 1 Aprilie 2026 (-44 zile)
              ssmIntervalMonths: 6,
              psiLastTrainingDate: new Date(2026, 2, 10),
              psiIntervalMonths: 6,
              hygieneRequested: false,
            };
            const summary = calculateEmployeeCompliance(emp, refDate);
            assert.equal(summary.ssmTraining.status, 'OVERDUE');
            assert.equal(summary.overallStatus, 'OVERDUE');
          },
        },
        {
          name: 'Salariat nou fără fișă medicală (MISSING) -> overallStatus MISSING',
          fn: () => {
            const refDate = new Date(2026, 4, 15);
            const emp = {
              id: 'emp-4',
              firstName: 'Andrei',
              lastName: 'Voinea',
              medicalLastExamDate: null,
              medicalIntervalMonths: 12,
              ssmLastTrainingDate: new Date(2026, 2, 10),
              ssmIntervalMonths: 6,
              psiLastTrainingDate: new Date(2026, 2, 10),
              psiIntervalMonths: 6,
              hygieneRequested: false,
            };
            const summary = calculateEmployeeCompliance(emp, refDate);
            assert.equal(summary.occupationalMedicine.status, 'MISSING');
            assert.equal(summary.overallStatus, 'MISSING');
          },
        },
        {
          name: 'Prioritate OVERDUE peste MISSING: dacă un element e OVERDUE și altul MISSING -> overall OVERDUE',
          fn: () => {
            const refDate = new Date(2026, 4, 15);
            const emp = {
              id: 'emp-5',
              firstName: 'Gheorghe',
              lastName: 'Munteanu',
              medicalLastExamDate: null, // MISSING
              medicalIntervalMonths: 12,
              ssmLastTrainingDate: new Date(2025, 8, 1), // OVERDUE
              ssmIntervalMonths: 6,
              psiLastTrainingDate: new Date(2026, 2, 10),
              psiIntervalMonths: 6,
              hygieneRequested: false,
            };
            const summary = calculateEmployeeCompliance(emp, refDate);
            assert.equal(summary.overallStatus, 'OVERDUE');
          },
        },
        {
          name: 'Curs de igienă nesolicitat (hygieneRequested = false) nu penalizează conformitatea generală',
          fn: () => {
            const refDate = new Date(2026, 4, 15);
            const emp = {
              id: 'emp-6',
              firstName: 'Ana',
              lastName: 'Dobre',
              medicalLastExamDate: new Date(2026, 0, 10),
              ssmLastTrainingDate: new Date(2026, 2, 10),
              psiLastTrainingDate: new Date(2026, 2, 10),
              hygieneRequested: false,
              hygieneLastExamDate: null, // chiar dacă e null, e nesolicitat
            };
            const summary = calculateEmployeeCompliance(emp, refDate);
            assert.equal(summary.hygieneCertificate, null);
            assert.equal(summary.overallStatus, 'VALID');
          },
        },
        {
          name: 'Curs de igienă solicitat dar neînregistrat (null) -> penalizează la MISSING',
          fn: () => {
            const refDate = new Date(2026, 4, 15);
            const emp = {
              id: 'emp-7',
              firstName: 'Florin',
              lastName: 'Stan',
              medicalLastExamDate: new Date(2026, 0, 10),
              ssmLastTrainingDate: new Date(2026, 2, 10),
              psiLastTrainingDate: new Date(2026, 2, 10),
              hygieneRequested: true,
              hygieneLastExamDate: null,
              hygieneIntervalMonths: 36,
            };
            const summary = calculateEmployeeCompliance(emp, refDate);
            assert.notEqual(summary.hygieneCertificate, null);
            assert.equal(summary.hygieneCertificate?.status, 'MISSING');
            assert.equal(summary.overallStatus, 'MISSING');
          },
        },
        {
          name: 'Curs de igienă solicitat și expirat (>36 luni) -> penalizează la OVERDUE',
          fn: () => {
            const refDate = new Date(2026, 4, 15);
            const emp = {
              id: 'emp-8',
              firstName: 'Elena',
              lastName: 'Dumitru',
              medicalLastExamDate: new Date(2026, 0, 10),
              ssmLastTrainingDate: new Date(2026, 2, 10),
              psiLastTrainingDate: new Date(2026, 2, 10),
              hygieneRequested: true,
              hygieneLastExamDate: new Date(2022, 0, 10), // +36 luni -> 2025-01-10 (expirat)
              hygieneIntervalMonths: 36,
            };
            const summary = calculateEmployeeCompliance(emp, refDate);
            assert.notEqual(summary.hygieneCertificate, null);
            assert.equal(summary.hygieneCertificate?.status, 'OVERDUE');
            assert.equal(summary.overallStatus, 'OVERDUE');
          },
        },
        {
          name: 'Curs de igienă solicitat și valid (efectuat acum 1 an) -> status VALID',
          fn: () => {
            const refDate = new Date(2026, 4, 15);
            const emp = {
              id: 'emp-9',
              firstName: 'Cristian',
              lastName: 'Enache',
              medicalLastExamDate: new Date(2026, 0, 10),
              ssmLastTrainingDate: new Date(2026, 2, 10),
              psiLastTrainingDate: new Date(2026, 2, 10),
              hygieneRequested: true,
              hygieneLastExamDate: new Date(2025, 4, 15), // due 2028-05-15 (731 zile)
              hygieneIntervalMonths: 36,
            };
            const summary = calculateEmployeeCompliance(emp, refDate);
            assert.equal(summary.hygieneCertificate?.status, 'VALID');
            assert.equal(summary.overallStatus, 'VALID');
          },
        },
      ],
    },

    // -------------------------------------------------------------------------
    // SUITA 4: Metrice Agregate la Nivel de Companie (4 teste)
    // -------------------------------------------------------------------------
    {
      name: '4. Metrice Agregate la Nivel de Companie (calculateCompanyMetrics)',
      cases: [
        {
          name: 'Companie cu 5 angajați micști: calcul exact al elementelor și scorului',
          fn: () => {
            const refDate = new Date(2026, 4, 15);
            const employees = [
              // Emp 1: 3 elemente valide, fără igienă
              {
                firstName: 'E1',
                medicalLastExamDate: new Date(2026, 0, 10),
                ssmLastTrainingDate: new Date(2026, 2, 10),
                psiLastTrainingDate: new Date(2026, 2, 10),
                hygieneRequested: false,
              },
              // Emp 2: 1 upcoming, 2 valide, fără igienă
              {
                firstName: 'E2',
                medicalLastExamDate: new Date(2025, 5, 1), // upcoming
                ssmLastTrainingDate: new Date(2026, 2, 10),
                psiLastTrainingDate: new Date(2026, 2, 10),
                hygieneRequested: false,
              },
              // Emp 3: 1 overdue, 2 valide, fără igienă
              {
                firstName: 'E3',
                medicalLastExamDate: new Date(2026, 0, 10),
                ssmLastTrainingDate: new Date(2025, 9, 1), // overdue
                psiLastTrainingDate: new Date(2026, 2, 10),
                hygieneRequested: false,
              },
              // Emp 4: 3 valide + 1 overdue igienă = 4 elemente
              {
                firstName: 'E4',
                medicalLastExamDate: new Date(2026, 0, 10),
                ssmLastTrainingDate: new Date(2026, 2, 10),
                psiLastTrainingDate: new Date(2026, 2, 10),
                hygieneRequested: true,
                hygieneLastExamDate: new Date(2022, 0, 10), // overdue
                hygieneIntervalMonths: 36,
              },
              // Emp 5: 3 valide + 1 missing igienă = 4 elemente
              {
                firstName: 'E5',
                medicalLastExamDate: new Date(2026, 0, 10),
                ssmLastTrainingDate: new Date(2026, 2, 10),
                psiLastTrainingDate: new Date(2026, 2, 10),
                hygieneRequested: true,
                hygieneLastExamDate: null, // missing
              },
            ];

            const metrics = calculateCompanyMetrics(employees, refDate);

            // Total elemente = 3 + 3 + 3 + 4 + 4 = 17
            assert.equal(metrics.totalEmployees, 5);
            assert.equal(metrics.totalItemsTracked, 17);
            // Valide = 3 + 2 + 2 + 3 + 3 = 13
            assert.equal(metrics.validCount, 13);
            // Upcoming = 0 + 1 + 0 + 0 + 0 = 1
            assert.equal(metrics.upcomingCount, 1);
            // Overdue = 0 + 0 + 1 + 1 + 0 = 2
            assert.equal(metrics.overdueCount, 2);
            // Missing = 0 + 0 + 0 + 0 + 1 = 1
            assert.equal(metrics.missingCount, 1);

            // Conservarea numărului de elemente
            assert.equal(
              metrics.validCount + metrics.upcomingCount + metrics.overdueCount + metrics.missingCount,
              metrics.totalItemsTracked
            );

            // Scorul: 13 / 17 * 100 = 76.47%
            assert.equal(metrics.complianceScorePercent, 76.47);
          },
        },
        {
          name: 'Companie fără angajați (empty array): evită NaN și returnează scor 100%',
          fn: () => {
            const metrics = calculateCompanyMetrics([]);
            assert.equal(metrics.totalEmployees, 0);
            assert.equal(metrics.totalItemsTracked, 0);
            assert.equal(metrics.validCount, 0);
            assert.equal(metrics.upcomingCount, 0);
            assert.equal(metrics.overdueCount, 0);
            assert.equal(metrics.missingCount, 0);
            assert.equal(metrics.complianceScorePercent, 100);
          },
        },
        {
          name: 'Companie cu toți salariații noi (date null): scor 0%',
          fn: () => {
            const employees = [
              {
                firstName: 'Nou',
                medicalLastExamDate: null,
                ssmLastTrainingDate: null,
                psiLastTrainingDate: null,
                hygieneRequested: false,
              },
            ];
            const metrics = calculateCompanyMetrics(employees);
            assert.equal(metrics.totalItemsTracked, 3);
            assert.equal(metrics.validCount, 0);
            assert.equal(metrics.missingCount, 3);
            assert.equal(metrics.complianceScorePercent, 0);
          },
        },
        {
          name: 'Companie cu 100% salariați valizi: scor 100%',
          fn: () => {
            const refDate = new Date(2026, 4, 15);
            const employees = [
              {
                firstName: 'V1',
                medicalLastExamDate: new Date(2026, 0, 10),
                ssmLastTrainingDate: new Date(2026, 2, 10),
                psiLastTrainingDate: new Date(2026, 2, 10),
                hygieneRequested: false,
              },
            ];
            const metrics = calculateCompanyMetrics(employees, refDate);
            assert.equal(metrics.totalEmployees, 1);
            assert.equal(metrics.totalItemsTracked, 3);
            assert.equal(metrics.validCount, 3);
            assert.equal(metrics.complianceScorePercent, 100);
          },
        },
      ],
    },
  ];

  let totalPassed = 0;
  let totalFailed = 0;
  let totalCount = 0;

  for (const suite of suites) {
    console.log(`\n▶ ${suite.name}`);
    for (const testCase of suite.cases) {
      totalCount++;
      try {
        await testCase.fn();
        totalPassed++;
        console.log(`  ✓ [PASS] ${testCase.name}`);
      } catch (err: unknown) {
        totalFailed++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ [FAIL] ${testCase.name}`);
        console.error(`     Eroare: ${message}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`REZULTAT SUITĂ COMPLIANCE: ${totalPassed} / ${totalCount} teste trecute`);
  if (totalFailed > 0) {
    console.error(`STATUS: EȘUAT (${totalFailed} teste picate)`);
  } else {
    console.log(`STATUS: SUCCES COMPLET 100% (Zero erori)`);
  }
  console.log('================================================================\n');

  return {
    total: totalCount,
    passed: totalPassed,
    failed: totalFailed,
    success: totalFailed === 0,
  };
}

// Auto-execuție la rulare din linia de comandă
if (
  process.argv[1] &&
  (process.argv[1].endsWith('verify-compliance.ts') || process.argv[1].endsWith('verify-compliance.js'))
) {
  runComplianceTests()
    .then((res) => {
      if (!res.success) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Eroare fatală la rularea testelor de conformitate:', err);
      process.exit(1);
    });
}
