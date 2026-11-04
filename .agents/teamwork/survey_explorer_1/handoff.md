# Handoff Report: App Codebase Surveyor (Explorer 1)

## 1. Observation

1. **Stack & Dependențe (`package.json`)**:
   - Monolit Next.js `16.4.3` (App Router, Turbopack), React `19.3.0`, TypeScript `^5`, Tailwind CSS `^4`.
   - ORM: `@prisma/client` și `prisma` `^6.19.3`.
   - Documente: `docxtemplater` `^3.71.1`, `pizzip` `^3.3.0`, `xlsx` `^0.18.5`, `pdf-lib` `^1.17.1`.
   - Validare & Utilitare: `zod` `^4.6.7`, `lucide-react` `^1.66.0`.
   - Rularea `npm run build` are cod de ieșire 0, cu un singur avertisment Turbopack la `src/lib/templates/generator.ts:387` legat de `fs.readFileSync(baseSourcePath)`.
   - Rularea `npx tsc --noEmit` are cod de ieșire 0 (0 erori TypeScript).

2. **Baza de Date & Schemă (`prisma/schema.prisma`)**:
   - Conține 451 linii, 17 modele principale (`Client`, `Worksite`, `Job`, `Employee`, `IdentityDocument`, `ResidenceAddress`, `EmploymentHistory`, `RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone`, `TrainingMaterial`, `TrainingEvent`, `TrainingParticipant`, `HygieneSession`, `HygieneParticipant`, `Template`, `GeneratedDocument`, `ImportBatch`, `AuditEvent`).
   - În modelul `Employee` (L82-130) există doar câmpuri de date personale, act, adresă, job/punct și solicitare inițială curs igienă.
   - **Absență totală**: Nu există niciun câmp sau model pentru Medicina Muncii (fișe de aptitudine, date examinare/expirare conform HG 355/2007), calcul de intervale periodice SSM/PSI (HG 1425/2006) sau calcul al scadenței de 3 ani a certificatelor de igienă (Ordinul 1225/5031/2003 / Metodologia 2022).

3. **Catalogul și Generarea celor 25 de Șabloane (`src/lib/templates/`)**:
   - `templates_registry/normalized/` conține cele 25 de fișiere de șablon oficiale (23 DOCX și 2 XLSX) identice cu cele din `handoff/ssm-template-placeholder-pack/templates/`.
   - `definitions.ts` conține 3215 linii definind catalogul `TEMPLATE_CATALOG` pentru toate cele 25 de șabloane.
   - La rularea `npx tsx scripts/test-all-templates-generation.ts`, **16 din cele 25 de șabloane au ieșit cu status `missing_data`** (rămânând cu token-uri vizibile `{PLACEHOLDER_*}` în fișier), deoarece câmpurile de prestator, avize, numere decizii angajator, parametri INCDPM și zone de pericol sunt marcate `source: 'manual'` în `definitions.ts` și nu sunt populate automat din DB sau fallback-uri în `resolver.ts`.

4. **Rutele API & Interfața UI (`src/app/`)**:
   - Rutele API acoperă clienți, import Excel cu preview diff, catalog templates, generare document individual și descărcare fișier stocat.
   - Paginile `/employees` și `/clients/[id]` afișează liste de angajați cu CNP mascat conform GDPR (`18504********`), dar **nu afișează nicio coloană de scadență, nicio insignă de conformitate (Valid/Scadent/Expirat) și nicio alertă de expirare**.
   - Pagina Dashboard (`/`) nu conține widget-uri sau indicatori pentru termene depășite sau apropiate.
   - Nu există roluri de utilizator sau semnături electronice (respectă 100% cerința R3).

5. **Suita de Testare Existentă (`scripts/`)**:
   - `verify-offline-catalog.ts` verifică integritatea fișierelor offline (trecut 25/25).
   - `test-all-25-templates.ts` execută `TRUNCATE TABLE ... CASCADE;`, fiind riscant pentru date persistente.
   - Nu există teste automate pentru calculul scadențelor de medicina muncii, instruiri SSM/PSI și cursuri de igienă.

---

## 2. Logic Chain

1. **Premisă R1**: Cerința R1 din `ORIGINAL_REQUEST.md` cere ca toate cele 25 de șabloane DOCX și XLSX să fie complet autocompletate fără să rămână placeholdere nepopulate (`{PLACEHOLDER_*}`) sau fișiere malformate.
   - *Fapt observat (Obs 3)*: În prezent, 16 șabloane sunt marcate `missing_data` și conțin token-uri neînlocuite, din cauza marcajului `source: 'manual'` în `definitions.ts` și lipsei de fallback-uri în `resolver.ts`.
   - *Deducție*: Este necesară refactorizarea `resolver.ts` pentru a furniza date prestator, decizii, comisie igienă și parametri de risc conformi legislației românești, astfel încât toate cele 25 de șabloane să fie 100% completate și aprobate pentru tipărire.

2. **Premisă R2**: Cerința R2 cere urmărirea completă și vizibilitatea clară a scadențelor salariaților (medicină a muncii, instruire periodică SSM și PSI/SU, valabilitate cursuri de igienă), vizibile atât în backend cât și prin insigne și alerte UI.
   - *Fapt observat (Obs 2, Obs 4)*: Nu există câmpuri în `Employee` pentru medicina muncii sau scadențe SSM/PSI, iar în UI nu există insigne sau alerte de expirare.
   - *Deducție*: Trebuie extins modelul `Employee` din Prisma, implementat un modul unificat de calcul al scadențelor (`src/lib/compliance.ts`) și îmbogățită interfața (`/employees`, `/clients/[id]`, `/`) cu insigne colorate (Verde/Galben/Roșu) și card de alerte.

3. **Premisă R3**: Simplitate, fără roluri de utilizator sau semnături electronice.
   - *Fapt observat (Obs 4)*: Aplicația funcționează cu operator intern unic și flux de semnare olografă pe hârtie.
   - *Deducție*: Cerința R3 este deja respectată și nu trebuie adăugate mecanisme complexe de autentificare sau semnătură electronică.

4. **Premisă R4**: Suită de verificare automată pentru autocompletare 25/25, calcul scadențe și build curat.
   - *Fapt observat (Obs 1, Obs 5)*: `npm run build` funcționează curat, dar nu există test pentru verificarea automată a scadențelor și lipsesc testele pentru eliminarea completă a placeholderelor.
   - *Deducție*: Trebuie creat un script de verificare complet (`scripts/verify-all.ts`) care să testeze cele 3 componente din R4.

---

## 3. Caveats

1. Baza de date PostgreSQL locală conține în prezent 1 client de test (`NEXUS SOLUTIONS S.R.L.`) cu 3 angajați. Orice modificare de schemă (`npx prisma db push`) trebuie să păstreze datele existente sau să ruleze un seed adecvat.
2. Scriptul existent `scripts/test-all-25-templates.ts` conține la final `TRUNCATE TABLE ... CASCADE;`. Acesta nu trebuie apelat pe date persistente fără salvare prealabilă.
3. Șablonul `TESA.docx` are un set mare de câmpuri specifice de evaluare a riscului (30 de factori cu gravitate, frecvență, nivel parțial, grafice). Datele de referință INCDPM trebuie structurate curat pentru a evita valori fanteziste.

---

## 4. Conclusion

Aplicația are o bază arhitecturală solidă și modulară (Next.js 16 + Prisma + PostgreSQL + docxtemplater/xlsx).
Implementarea cerințelor utilizatorului necesită:
1. **Refactorizarea `resolver.ts`** pentru autocompletarea completă a tuturor celor 25 de șabloane cu profil realist de prestator și parametri legali (R1).
2. **Extinderea schemei Prisma și crearea utilitarului `compliance.ts`** pentru calculul scadențelor (Medicină a muncii: 12 luni, Instruire SSM/PSI: 6 luni, Curs Igienă: 36 luni) și adăugarea insignelor de status (Valid / Scadent / Expirat) și a alertelor în UI (R2).
3. **Păstrarea simplității** fără roluri sau semnături electronice (R3).
4. **Construirea suitei complete de verificare automată** (`scripts/verify-all.ts`) care să certifice 25/25 șabloane fără placeholdere reziduale, calculul exact al scadențelor și compilarea curată a aplicației (R4).

Raportul detaliat complet este disponibil în:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_explorer_1/analysis.md`

---

## 5. Verification Method

Pentru a verifica independent observațiile și concluziile din acest raport:

1. **Verificare compilare și build**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
2. **Verificare integritate offline a celor 25 de șabloane**:
   ```bash
   npx tsx scripts/verify-offline-catalog.ts
   ```
3. **Verificare generare curentă a celor 25 de șabloane (evidențiind cele 16 fișiere cu `missing_data`)**:
   ```bash
   npx tsx scripts/test-all-templates-generation.ts
   ```
4. **Inspectare schemă Prisma și lipsa câmpurilor de scadență**:
   Verifică fișierul `prisma/schema.prisma` liniile 82–130 (`model Employee`) pentru a confirma lipsa câmpurilor de medicină a muncii și periodicitate instruire.
5. **Inspectare UI angajați**:
   Verifică `src/app/employees/page.tsx` liniile 53–130 pentru a confirma lipsa coloanelor și a insignelor de scadență.
