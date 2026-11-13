# Milestone 3 (M3) Review & Adversarial Critic Report — reviewer_2

**Task**: Independent Statutory, UX & Adversarial Review of Milestone 3: Training Module Synchronization & Statutory Docs (Features 14, 15, 16, 17, 18)  
**Date**: 2026-11-11  
**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/reviewer_2`  
**Verdict**: **APPROVE**  

---

## 1. Observation

### 1.1 Source Code and Architecture Verification
1. **Real Training Event Dates Resolution (No unconditional fallback to `hireDate`)**:
   - In `src/lib/templates/resolver.ts` lines 1324–1360:
     ```typescript
     const introEvent = participantEvents.find((e: any) =>
       ['INTRODUCTIV', 'INTRODUCTIV_GENERAL'].includes(String(e.type || '').toUpperCase())
     );
     const dataIntroductiv = introEvent?.eventDate
       ? formatDateRo(introEvent.eventDate)
       : (employee?.hireDate ? formatDateRo(employee.hireDate) : '');
     const durataIntroductiv = introEvent?.durationHours
       ? `${introEvent.durationHours} ore`
       : '8 ore';
     const instructorIntroductiv = introEvent?.instructorName || ssmSpecialistName;
     ```
     - Introductive date and on-the-job training date use the actual `eventDate` and `instructorName` recorded for that employee participant.
     - Fallback to `employee.hireDate` occurs **only** when no real training event exists for that employee (statutory default under HG 1425/2006 art. 83).
2. **Accurate Event Type Discrimination in Individual Sheets**:
   - In `src/lib/templates/resolver.ts` lines 1361–1446:
     - `ssmEvents` specifically filters `['PERIODIC_SSM', 'SSM', 'PERIODIC'].includes(String(e.type || '').toUpperCase())` into `instruiriPeriodiceSSM` (padded to minimum 16 rows per statutory template format).
     - `psiEvents` specifically filters `['PERIODIC_PSI', 'PSI', 'SU'].includes(String(e.type || '').toUpperCase())` into `instructajePeriodicePSI` (padded to minimum 16 rows).
     - No cross-contamination between SSM and PSI periodic tables was observed.
3. **Feature 18: Unblocking of Expired Training Documents (Catch-22 Elimination)**:
   - In `src/app/documents/generate/page.tsx` lines 122–148 & 169–188:
     - `isTrainingTemplate` identifies training documents (`fisa-instruire`, `fisa-instructaj`, `pv-instruire`, `training-`).
     - When an employee has compliance status `OVERDUE`, `isTrainingTemplate` returns `isExpired: false` with badge `'Reinstruire Necesară'` (amber badge), allowing the generation of reinstatement training documents.
     - Non-training operational documents (e.g., `ipssm-birou`, work authorizations) retain `isExpired: true` (red badge `'Expirat'`), enforcing statutory protection under Legea 319/2006.
   - In `src/app/api/documents/generate-batch/route.ts` lines 37–58:
     - `checkEmployeeTemplateExpiry` exempts training templates from rejection:
       `if (!isTrainingTemplate && (code.includes('ssm') || ...)) { if (compliance.ssmTraining.status === 'OVERDUE') return { isExpired: true }; }`
     - Allows bulk emission of training sheets for overdue employees to conduct group reinstatement training sessions.
4. **Planned Session Compliance Deadline Integrity**:
   - In `src/app/api/trainings/record/route.ts` lines 48–67 & 154–182:
     - `status === 'planned'` allows future dates up to 365 days ahead.
     - Scadențe update `tx.employee.updateMany` is wrapped in `if (status !== 'planned')`:
       When `status === 'planned'`, `updatedCount = 0` and participant `ssmLastTrainingDate` / `psiLastTrainingDate` fields remain strictly unchanged.
     - When `status === 'completed'` or `'recorded'`, dates must be `<= endOfToday` and participant scadențe are updated atomically.
5. **Training UI Differentiation and Download Shortcuts**:
   - `src/components/training/training-session-card.tsx`:
     - Planned vs Recorded sessions are visually distinct:
       - Badge: "Planificat" (blue pill, Clock icon) vs "Consemnat" (emerald pill, CheckCircle2 icon).
       - Stats: "Data programată" vs "Data efectuării".
     - Action toolbar:
       - Direct shortcut to download "PV Instruire" (`ssm-pv-instruire-colectiva` or `psi-pv-instruire` with `trainingEventId`).
       - Direct shortcut to download "Tematică" (`training-tematica-introductiv` or `training-tematica-loc-munca`).
       - Expandable accordion for participants with one-click download of individual training sheet for each employee (`ssm-fisa-instruire-individuala` or `psi-fisa-instructaj-individuala`).
   - `src/components/training-planner-modal.tsx`:
     - Clean toggle between "Consemnare Instruire Efectuată (actualizează scadențele)" and "Planificare Sesiune Viitoare (programare)".
     - Automatically selects "Planificare" when a date in the future is picked; restricts date input to `max={oneYearFromNow}`.
     - Informational compliance notice detailing that scadențe will update only upon completion consemnare.

---

## 2. Logic Chain

1. **Statutory Integrity (Legea 319/2006, HG 1425/2006, Legea 307/2006, OMAI 712/2005)**:
   - Under HG 1425/2006 arts. 77–100 and OMAI 712/2005 arts. 30–45, training records must accurately reflect the real date, duration, instructor, and content of each training session.
   - Observation 1.1 confirms that when real `INTRODUCTIV`, `LOC_MUNCA`, `PERIODIC_SSM`, or `PERIODIC_PSI` events exist in the database, the resolver extracts and formats the actual `eventDate` (e.g. `15.01.2024`), rather than falling back to `hireDate` (`10.01.2024`).
   - The fallback to `hireDate` is utilized strictly when no prior event is recorded in the database, which is legally sound for initial onboarding.
2. **Catch-22 Resolution (Feature 18)**:
   - Previously, if an employee was overdue, generation was completely locked, creating a circular blockage: an inspector or employer could not generate the sheet needed to conduct the training that would remove the overdue status.
   - Observation 1.3 shows that the system now properly discriminates between training sheets (which must be generated for overdue employees to conduct reinstatement) and operational documents (which must remain blocked because an overdue worker cannot perform high-risk work).
3. **Deadline Reset Gate**:
   - A planned session in the future must not prematurely mark an overdue employee as compliant.
   - Observation 1.4 confirms that `tx.employee.updateMany` is conditional upon `status !== 'planned'`. Our independent test verified that recording a future planned session leaves `ssmLastTrainingDate` untouched, whereas recording a completed session updates `ssmLastTrainingDate` immediately.
4. **Adversarial Security & Edge Cases**:
   - Tested 38 distinct adversarial scenarios via `scripts/adversarial-m3-statutory-review.ts`:
     - Completed sessions with future dates are rejected (HTTP 400).
     - Planned sessions > 365 days in the future are rejected (HTTP 400).
     - Invalid training types are rejected (HTTP 400).
     - Durations <= 0 are rejected (HTTP 400).
     - Empty participant lists are rejected (HTTP 400).
     - Cross-client participant spoofing is rejected (HTTP 400).
     - Status PLECAT employees are strictly blocked from training document generation.
     - Medical INAPT employees are strictly blocked from training document generation.
     - XML special characters (`&`, `<`, `>`, `"`, `'`) in training topics do not corrupt OpenXML DOCX files.
5. **No Integrity Violations Detected**:
   - No hardcoded test responses, dummy facade implementations, or bypasses were found.
   - The OpenXML DOCX templates (`ssm-pv-instruire-colectiva.docx` and `psi-pv-instruire.docx`) are genuine, valid zip archives containing full statutory wording and table loops.

---

## 3. Caveats

No caveats. All M3 features (Features 14, 15, 16, 17, 18) were thoroughly verified through unit tests, statutory review, end-to-end generation, OpenXML parsing, and adversarial attack vectors.

---

## 4. Conclusion

The implementation of Milestone 3 satisfies all Romanian statutory regulations (Legea 319/2006, HG 1425/2006, Legea 307/2006, OMAI 712/2005) and operational requirements:
- Real event dates and instructors are faithfully reflected in generated training sheets.
- Event types map accurately without cross-contamination.
- Catch-22 expiration blockage is eliminated: training documents can be generated singly and in batch for overdue workers, while operational documents remain properly protected.
- Planned future sessions preserve compliance deadlines until training is performed.
- UI components clearly differentiate session states and offer functional 1-click download shortcuts.

**Verdict: APPROVE**

---

## 5. Verification Method

### 5.1 Project Verification Commands & Results
1. **Production Next.js Turbopack Build**:
   ```bash
   npm run build
   ```
   - Result: Exit code 0. Compiled successfully in 805ms with 0 errors across all routes.
2. **Acceptance Test Suite (5 Suites)**:
   ```bash
   npm test
   ```
   - Result: Exit code 0. 416/416 tests passed (100% pass rate).
     - Suite 1: Document Auto-Completion (31/31) — PASS
     - Suite 2: Compliance Deadlines & Expiry (45/45) — PASS
     - Suite 3: Excel Import/Export Resilience (6/6) — PASS
     - Suite 4: Comprehensive E2E Suite (333/333) — PASS
     - Suite 5: Application Production Build — PASS
3. **Independent Statutory & Adversarial Audit Suite**:
   ```bash
   npx tsx scripts/adversarial-m3-statutory-review.ts
   ```
   - Result: Exit code 0. 38/38 audit checks passed:
     - Real training event date prioritization over hireDate: PASS
     - Event type mapping into statutory tables (SSM vs PSI isolation): PASS
     - Feature 18 unblocking of overdue employees (single & batch): PASS
     - Operational non-training document blocking for overdue employees: PASS
     - Planned session deadline immunity: PASS
     - Completed session deadline reset: PASS
     - Adversarial API boundaries (future completed, >365d, cross-client, invalid type): PASS
     - Status PLECAT & Medical INAPT strict exclusions: PASS
     - OpenXML integrity with XML entity injection: PASS
