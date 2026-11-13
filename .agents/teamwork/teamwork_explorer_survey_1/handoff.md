# Handoff Report: Survey Cerințe R1, R2 și R3

- **Agent**: `teamwork_explorer_survey_1`
- **Data**: 2026-11-10T21:42:00Z
- **Working directory**: `/Users/davidalexandru/Documents/Proiect_SSM`
- **Raport complet detaliat**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_explorer_survey_1/survey_report.md`

---

## 1. Observation

1. **R1: Date Fabricate în `src/lib/templates/resolver.ts`**:
   - `ROMANIAN_LEGAL_SSM_PROVIDER` (l. 54-80): hardcodează prestator `"EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L."`, CUI `"RO34567890"`, certificat `"4812/2021"`, specialist `"Ing. Mihai Popescu"`.
   - `ROMANIAN_LEGAL_DECIZII` (l. 86-129): hardcodează deciziile `01/15.01.2026` - `11/15.01.2026`, numiri de persoane fictive (`"Ioana-Raluca Dumitru"`, `"Gheorghe Barbu"`, `"Elena Vasilescu"`), permis de foc `"01/2026" din 15.01.2026`, executant `"Vasile Ionescu"`.
   - `ROMANIAN_LEGAL_TRAINING_SHEETS` (l. 298-336): hardcodează adrese, calificări și instructori/verificatori `"Munteanu Cristian"` pe fișele F7 și F8.
   - `ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH` (l. 341-434): hardcodează cabinet `"CENTRU MEDICAL DE MEDICINA MUNCII S.R.L."`, medic `"Dr. Alexandrescu Victor"`, solicitare `"SOL-MED-042/2026"`.
   - `ROMANIAN_LEGAL_EIP` (l. 440-560): hardcodează mărimi `"M / 48"`, `"42"`, `"9 (L)"`, salariat `"Stan Alexandru"` și 10 rânduri de dotare acordate la `"15.01.2026"` cu semnătura `"Semnat salariat"`.
   - `verifiedMap` (l. 1088, 1450-1460, 1568-1660):
     * `legalRepresentativeName = client?.legalRepresentative || 'Munteanu Cristian'` (l. 1088)
     * `PLACEHOLDER_FIRMA: client?.name || 'S.C. CLIENT TEST S.R.L.'` (l. 1450)
     * `PLACEHOLDER_CUI: client?.cui || 'RO12345678'` (l. 1451)
     * `PLACEHOLDER_NR_REG_COM: client?.regCom || 'J40/1000/2021'` (l. 1452)
     * Date salariat fallback: `'15.03.1988'`, `'RX'`, `'123456'`, `'0I (Rh +)'`, mărimi `'42'`, `'L'`, `'9'`.
     * Când salariatul este null (l. 1601-1636): injectează întregul salariat fictiv „Stan Alexandru”, CNP `1880315410127`.
   - `isAutocompleted` (l. 2097-2113):
     `const hasValue = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';`  
     `isAutocompleted: hasValue` setează `true` pentru toate fallback-urile de mai sus, transformându-le în UI în carduri verzi doar-pentru-citire (`autoFields`, `generate/page.tsx:1248-1256`).
   - `approved_for_print` (`generator.ts:554, 584-591`): deoarece `resolver.ts` a injectat date mock peste tot, `validateMissingFields` și `collectUnresolvedPlaceholders` returnează 0 câmpuri lipsă, acordând automat `approved_for_print` documentelor cărora le lipsesc date statutare esențiale (`cimNumber`, `grossSalary` etc.).
   - Trunchiere UI (`generate/page.tsx:1222`): `{manualFields.slice(0, 20).map((field) => (` ascunde orice câmp manual peste indexul 19.
   - Escapare XML (`generator.ts:353-370`): `text = text.replaceAll(curly, strVal)` injectează text brut în fișierele `.xml` din DOCX fără escaparea `&`, `<`, `>`, producând coruperea documentului la caractere speciale.

2. **R2: Medicină a Muncii (HG 355/2007)**:
   - Schema Prisma (`Employee`, l. 234-239): conține `medicalLastExamDate DateTime?`, `medicalIntervalMonths Int @default(12)`, `medicalFitnessVerdict String? @default("APT")`, `medicalNotes String?`. Nu există modelul `MedicalExam`.
   - Rute API: Nu există nicio rută API pentru medicină a muncii în `src/app/api/`. Singurul loc unde se selectează este `GET /api/clients/[id]/employees:20,22`.
   - Blocaj flux: `generate/page.tsx:140-153` dezactivează butonul de generare (`isGenerateDisabled`) când `compliance.occupationalMedicine.status === 'OVERDUE'`. `generate-batch/route.ts:160` aruncă eroare 400. Fără rută API și fără modală UI, utilizatorul este complet blocat.

3. **R3: Ciclul de Viață Salariați & Status „PLECAT”**:
   - CRUD API: Nu există `POST /api/employees`, nici `PUT /api/employees/[id]`, nici endpoint de încetare (`status: "PLECAT"`).
   - CRUD UI: `src/app/employees/employee-registry-client.tsx` și `src/app/clients/[id]/page.tsx` sunt tabele 100% de vizualizare (read-only), fără nicio modală de adăugare manuală sau editare.
   - Câmpurile statutare (`cimNumber`, `cimDate`, `grossSalary`, `workNorm`, `bankIban`, adrese, mărimi EIP, `leaveDate`) există deja în `prisma/schema.prisma:194-295`.
   - Tratare `PLECAT`:
     * `compliance.ts:286-335`: `calculateCompanyMetrics` include toți salariații fără verificare `status === 'ACTIV'`, scăzând scorul din cauza celor plecați.
     * `employees/page.tsx:50`: `calculateCompanyMetrics(employeesRaw)` nu filtrează salariații plecați.
     * `api/clients/[id]/employees/route.ts:11`: returnează toți angajații, inclusiv plecați.
     * `generate/page.tsx:302`: populează selectorul de documente și batch cu angajați plecați.
     * `generate-batch/route.ts:127`: nu filtrează salariații plecați în `findMany`.
     * `resolver.ts:2054`: la lipsa `employeeId`, fallback-ul ia `client.employees[0]`, care poate fi un salariat plecat.
     * `bulk-packages.ts:189`: `generateClientDossierZip` include salariații plecați în dosarul firmei.

---

## 2. Logic Chain

1. Din Observația 1, `resolver.ts` definește constante globale cu date fictive și le combină prin spread (`...ALL_ROMANIAN_LEGAL_FALLBACKS`, `...verifiedMap`) în rezultatul final. Astfel, orice câmp absent din DB capătă o valoare fictivă (ex: CNP `1880315410127`, serie `RX 123456`, reprezentant `Munteanu Cristian`).
2. Din Observația 1, `isAutocompleted` verifică doar dacă `rawVal` este nenul. Deoarece pasul 1 atribuie valori nenule fictive, `isAutocompleted` devine `true`, transformând câmpul în card verde ne-editabil în UI.
3. Din Observația 1, `generator.ts` consideră un câmp „lipsă” doar dacă este gol. Deoarece pasul 1 a umplut totul cu text mock, generatorul găsește 0 câmpuri lipsă și acordă eronat `approved_for_print`.
4. Din Observația 1, `manualFields.slice(0, 20)` împiedică afișarea câmpurilor de la indexul 20 încolo, făcând imposibilă editarea formularelor extinse (CIM 2022, Anexele 2-3 HG 355/2007).
5. Din Observația 1, înlocuirea directă de tokenuri în stringul XML fără `escapeXml` lasă caracterele `&`, `<`, `>` needitate, generând un arbore XML malformat care corupe documentul DOCX.
6. Din Observația 2, lipsa unui endpoint API și a unei modale UI pentru medicina muncii face imposibilă actualizarea `medicalLastExamDate` din aplicație, blocând permanent fluxul de generare odată ce termenul precedent a expirat.
7. Din Observația 3, nefiltrarea `status === 'PLECAT'` în `compliance.ts`, `employees/route.ts`, `generate/page.tsx`, `generate-batch/route.ts` și `bulk-packages.ts` denaturează statisticile de conformitate și permite generarea eronată de documente pentru salariați inactivi.

---

## 3. Caveats

- Nu s-au modificat fișiere de cod în această etapă (investigație strict read-only).
- Modulul „Arhiva Documente” / scanuri semnate a fost exclus conform cerințelor din `ORIGINAL_REQUEST.md`.
- Schema Prisma are deja coloanele `medicalLastExamDate`, `medicalIntervalMonths`, `medicalFitnessVerdict`, `medicalNotes` pe `Employee`. Nu este strict necesară crearea unei tabele `MedicalExam` noi pentru a satisface cerința R2, însă actualizarea atomică a câmpurilor existente pe `Employee` și logarea în `AuditEvent` este obligatorie.

---

## 4. Conclusion

Investigația a cartografiat cu precizie fiecare fișier, funcție, variabilă și linie de cod responsabilă pentru problemele R1, R2 și R3. Raportul complet din `survey_report.md` furnizează planul de remediere pas cu pas, gata pentru execuție directă de către agenții de implementare:
- Faza 1: Curățarea fallback-urilor din `resolver.ts`, repararea `isAutocompleted`, repararea `approved_for_print`, eliminarea limitării `.slice(0, 20)` și adăugarea `escapeXml` în `generator.ts`.
- Faza 2: Implementarea rutei `POST /api/employees/[id]/medical-exam` și a modalei `RecordMedicalExamModal`.
- Faza 3: Implementarea rutelor `POST /api/employees`, `PUT /api/employees/[id]`, `POST /api/employees/[id]/terminate`, a modalelor CRUD corespunzătoare și a filtrării complete a statusului `PLECAT`.

---

## 5. Verification Method

Pentru a verifica independent constatările din acest raport:
1. Verificare integritate build și schemă:
   `npm run build`  
   `npx prisma validate`
2. Verificare căutare fallback-uri mock:
   `grep -n "Munteanu Cristian\|RO12345678\|15.03.1988\|RX/123456" src/lib/templates/resolver.ts`
3. Verificare trunchiere 20 câmpuri:
   `grep -n "slice(0, 20)" src/app/documents/generate/page.tsx`
4. Verificare ne-escapare XML:
   `sed -n '350,370p' src/lib/templates/generator.ts`
5. Verificare absență rute API angajați:
   `ls -la src/app/api/employees` (returnează No such file or directory)
6. Verificare nefiltrare PLECAT în metrici:
   `grep -n -C 5 "calculateCompanyMetrics" src/app/employees/page.tsx`
