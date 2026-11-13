# Handoff Report: Milestone 2 — Sănătate Ocupațională (F7/F8) & Excludere Status PLECAT (F13)

**Agent**: explorer_m2_1  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM`  
**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_1`  
**Target Milestone**: Milestone 2 (M2) — Employee Lifecycle CRUD, Occupational Health & Status PLECAT  
**Features Analyzed**: Feature 7 (Înregistrare Examen Medical HG 355/2007), Feature 8 (Actualizare `medicalLastExamDate` & Recalculare), Feature 13 (Excludere Status PLECAT din Conformitate & Batch).  

---

## 1. Observation

1. **Prisma Schema (`prisma/schema.prisma`)**:
   - Model `Employee` (l. 194–298) conține câmpurile scalare:
     - `status String @default("ACTIV")` (l. 221)
     - `leaveDate DateTime?` (l. 222)
     - `medicalLastExamDate DateTime?` (l. 235)
     - `medicalIntervalMonths Int @default(12)` (l. 236)
     - `medicalFitnessVerdict String? @default("APT")` (l. 237)
     - `medicalNotes String?` (l. 238)
     - Index existent: `@@index([clientId, status])` (l. 297).
     - Nu există coloane separate pentru `clinicName` sau `doctorName` în `Employee`.
   - Model `AuditEvent` (l. 605–618) conține:
     - `id String @id @default(uuid())`
     - `actorName String`
     - `action String` (fără constrângere de enum la nivel de DB)
     - `entityType String`
     - `entityId String?`
     - `details String?` (JSON fără CNP/date de CI)
     - Indexuri: `@@index([entityType, entityId])`, `@@index([createdAt])`.

2. **Compliance Engine (`src/lib/compliance.ts`)**:
   - În `calculateCompanyMetrics` (l. 286–292):
     ```typescript
     export function calculateCompanyMetrics(
       employees: (EmployeeComplianceInput | Record<string, unknown>)[],
       referenceDate: Date = new Date()
     ): CompanyComplianceMetrics {
       const employeeList = Array.isArray(employees) ? employees : [];
       const totalEmployees = employeeList.length;
     ```
     Nu există nicio filtrare pe `status` sau excludere a valorii `'PLECAT'`.
   - În `calculateEmployeeCompliance` (l. 177–281):
     `EmployeeComplianceInput` nu include explicit `status` sau `leaveDate`, iar `EmployeeComplianceSummary` nu include `isTerminated` sau `status`.

3. **Inspecție Suită de Teste E2E (`scripts/e2e-tier1-features.ts`)**:
   - Linia 686:
     ```typescript
     const audit = await prisma.auditEvent.findFirst({
       where: { entityId: fixture.employee.id, action: 'MEDICAL_EXAM_RECORDED' },
     });
     ```
   - Linia 740:
     ```typescript
     const auditCountBefore = await prisma.auditEvent.count({ where: { action: 'MEDICAL_EXAM_RECORDED' } });
     ```
     Testul verifică literal `action: 'MEDICAL_EXAM_RECORDED'` (și nu `'RECORD_MEDICAL_EXAM'`).
   - Linia 1094–1103:
     Feature 13 testează că un calcul de metrici exclude salariații plecați și returnează 100% când toți angajații activi sunt conformi.
   - `scripts/e2e-tier4-scenarios.ts` (l. 696–728):
     Scenariul S4 testează că trecerea unui angajat în `status: 'PLECAT'` cu `leaveDate` readuce compania la 100% conformitate și îl exclude din pachetul de arhivă de inspecție.

4. **Starea Rutei API `POST /api/employees/[id]/medical-exam`**:
   - Rădăcina `src/app/api/employees` nu este creată încă (`ls src/app/api/employees` returnează `No such file or directory`).
   - În `scripts/e2e-test-helpers.ts` (l. 593–608), apelul folosește un fallback intern în cazul în care ruta nu este montată, verificând dinamic `import('../src/app/api/employees/[id]/medical-exam/route')`.

5. **Rularea Testelor Inițiale**:
   - Comanda `npm test` rulează curat: 5/5 suite trecute, 416/416 itemi validați cu 100% pass rate.

---

## 2. Logic Chain

1. **Relația dintre F7/F8 și Schema Prisma**:
   - Baza de date conține deja toate coloanele necesare pe `Employee` (`medicalLastExamDate`, `medicalIntervalMonths`, `medicalFitnessVerdict`, `medicalNotes`).
   - Pentru `clinicName` și `doctorName`, din moment ce nu există coloane dedicate în schemă, concatenarea lor în `medicalNotes` sub forma `"[Clinica: ..., Medic: ...] Restricții: ..."` și salvarea în payload-ul JSON al `AuditEvent.details` rezolvă cerința fără a necesita migrare suplimentară pe baza de date.

2. **Relația dintre F7/F8 și `AuditEvent`**:
   - Deși documentul de sinteză inițial menționa `RECORD_MEDICAL_EXAM`, suita automată E2E (`e2e-tier1-features.ts:686` și `740`) caută explicit `action: 'MEDICAL_EXAM_RECORDED'`.
   - Prin urmare, setarea `action: 'MEDICAL_EXAM_RECORDED'` în `AuditEvent` este obligatorie pentru trecerea automată a testelor fără erori de aserțiune.

3. **Relația dintre `status: 'PLECAT'` și `compliance.ts` (F13)**:
   - În prezent, `calculateCompanyMetrics` parcurge orbește întreaga listă de angajați primită.
   - Dacă o firmă are 4 angajați, dintre care 1 este plecat cu avize medicale expirate, scorul de conformitate scade la 75% și se declanșează alerte false pentru inspectorii ITM.
   - Filtrarea `status !== 'PLECAT'` în `calculateCompanyMetrics` elimină automat această eroare pentru toate paginile și componentele care apelează această funcție (inclusiv `/employees`, `/` și `/clients/[id]`).
   - Dacă o firmă are 100% angajați plecați, returnarea scorului de 100% și totalEmployees = 0 protejează împotriva diviziunii la zero (`NaN`).

4. **Relația dintre `medicalLastExamDate` și deblocarea generării (F9)**:
   - `src/app/documents/generate/page.tsx` blochează salariatul doar când `calculateEmployeeCompliance` raportează `status === 'OVERDUE'`.
   - Imediat ce endpoint-ul F7 actualizează `medicalLastExamDate`, conformitatea devine `VALID`, `daysRemaining` devine pozitiv (~365), iar generatorul permite imediat descărcarea documentului.

---

## 3. Caveats

1. **Compatibilitate Acțiune Audit**:
   Dacă vreun script extern sau client viitor solicită valoarea `'RECORD_MEDICAL_EXAM'`, se poate asigura salvarea ambelor sau acceptarea lor ca echivalente, dar salvarea principală în DB trebuie să fie `'MEDICAL_EXAM_RECORDED'` conform testului E2E existent.
2. **Câmpuri Clinica și Medic**:
   Dacă pe viitor se dorește filtrarea directă în SQL după clinică sau medic, va fi necesară o migrare Prisma pentru coloane dedicate; în stadiul curent, stocarea în `medicalNotes` și `AuditEvent.details` respectă cerințele fără breaking changes.
3. **Rutele Paralele de CRUD Salariați**:
   Prezenta investigație s-a concentrat pe F7, F8 și F13. Rutele `POST /api/employees`, `PUT /api/employees/[id]` și `POST /api/employees/[id]/terminate` fac obiectul investigației Explorer 2, dar specificațiile de filtrare `status: 'PLECAT'` din această analiză acoperă întregul sistem.

---

## 4. Conclusion

1. Schema Prisma este 100% pregătită pentru F7, F8 și F13 fără modificări DDL.
2. Worker-ul trebuie să creeze fișierul `src/app/api/employees/[id]/medical-exam/route.ts` urmând întocmai specificația din `analysis.md` (cu validare `APT/APT_CONDITIONAT/INAPT_TEMPORAR/INAPT`, verificare dată, salvare `medicalNotes`, emitere `AuditEvent` cu `action: 'MEDICAL_EXAM_RECORDED'`, și recalculare conformitate).
3. În `src/lib/compliance.ts`, Worker-ul trebuie să adauge filtrarea automată a salariaților `status: 'PLECAT'` în `calculateCompanyMetrics`, cu protecție la diviziune cu zero, și să expună `isTerminated` în `calculateEmployeeCompliance`.
4. În componentele de generare colectivă (`src/app/api/documents/generate-batch/route.ts` și `src/lib/packages/bulk-packages.ts`), Worker-ul trebuie să asigure respingerea sau excluderea strictă a salariaților plecați.
5. În UI, Worker-ul trebuie să creeze `src/components/employees/record-medical-exam-modal.tsx` și să adauge butonul operativ în listele de salariați.

---

## 5. Verification Method

Worker-ul și auditorul vor verifica implementarea executând:

1. **Validare sintaxă și tipuri**:
   ```bash
   npx prisma validate
   npm run build
   ```
2. **Execuție teste unitare de conformitate**:
   ```bash
   npx tsx scripts/verify-compliance.ts
   ```
3. **Execuție teste E2E specifice**:
   ```bash
   npx tsx scripts/e2e-tier1-features.ts
   ```
   (Se vor verifica în special testele F7, F8 și F13: T1.1–T1.5).
4. **Execuție suita completă de acceptanță**:
   ```bash
   npm test
   ```
   **Condiție de invalidare**: Dacă vreun test din cele 416 pică sau dacă un salariat cu `status: 'PLECAT'` este inclus într-un batch sau scade scorul companiei, sarcina este invalidată.
