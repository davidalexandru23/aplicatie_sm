# Project: Modernizare Strategică SSM, Igienă și HR Externalizat (Pilonii 1-5)

## Architecture

The system is a Next.js 15 (App Router, Turbopack) web application with Prisma ORM 6 on PostgreSQL, Tailwind CSS v4, and a dual document generation engine (`docxtemplater` & `pizzip` for DOCX, `xlsx` for XLSX).

### Core Layers & Components
1. **Data Model Layer (`prisma/schema.prisma`)**:
   - PostgreSQL persistence for clients, jobs, worksites, employees, risk assessments, training events, hygiene sessions, and document templates.
   - External SSM provider subsystem (`SsmProvider`, `SsmSpecialist`) with `isDefault: true` fallback resolution.
   - Job contextual profile (`mainActivities`, `equipmentUsed`, `workConditions`, `corCode`).
2. **SSM & HR Document Template Catalog (`src/lib/templates/`)**:
   - `definitions.ts`: Ground-truth catalog expanded from 25 to 31 templates with complete token schemas, legal citations, and required fields.
   - `resolver.ts`: High-fidelity data resolution engine connecting real database entities, `isDefault: true` providers, `Job` operational context, dynamic gender salutations (`Dl.`/`Dna.`), and graceful `missing_data` flagging for non-statutory variables (stopping mock salaries).
   - `generator.ts`: Template rendering with PizZip, Docxtemplater, and dynamic XML/table injection.
   - `caen-risk-presets.ts`: Contextual INCDPM Pece risk profiles dynamically populating measures in Prevention & Protection Plans.
3. **Bulk Generation & Package Subsystem (`src/app/api/documents/packages/`)**:
   - In-memory multi-file ZIP packaging via `pizzip` without external heavy dependencies.
   - Three operational packages: Onboarding Salariat ZIP, Înființare Dosar SSM Client ZIP, and Export Arhivă Control ITM/ISU ZIP.
4. **UI & User Workflows (`src/app/`)**:
   - `/documents/generate`: Post/Job selector (`jobId`) allowing generation of workplace risk evaluations and training topics without requiring an employee roster.
   - `/risk-assessments`: Interactive visual risk assessment configurator allowing CAEN and Job selection with dynamic Pece gravity/probability adjustment.
   - `/clients/[id]` & `/employees`: 1-Click ZIP package generation triggers.
5. **Automated Verification Suite (`scripts/`)**:
   - `scripts/verify-all.ts`: Unified acceptance suite validating all 31 templates, zero unmapped placeholders, database relations, and clean builds (`npm run build`).

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Rectificare EVALUAREA RISCURILOR.docx | Corectare token RegCom, eliminare „București” static, curățare date istorice și text licență, restaurare Cap 6-7 | M1 | Pilonul 1 (Survey 1) |
| F2 | Rectificare IPSSM Birou & Alunecări | Înlocuire „agenților de pază” cu personal birou, adăugare `{PLACEHOLDER_FIRMA}` în antet | M1 | Pilonul 1 (Survey 1) |
| F3 | Curățare Reclamă Tematică Loc Muncă | Ștergere imagine TinyPic comercială din footers, adăugare `{PLACEHOLDER_FUNCTIE}` | M1 | Pilonul 1 (Survey 1) |
| F4 | Apelative Dinamice & Decizia 10 | Înlocuire 24 apariții `Dna.` cu `{PLACEHOLDER_APELATIV_*}` dinamic și `{PLACEHOLDER_NUMAR_DECIZIE_10}` | M1 | Pilonul 1 (Survey 1) |
| F5 | Rectificare Anexă Fișă Post & GDPR | Adăugare tokenuri identificare/COR/CIM în fișa postului; trecere GDPR la Art. 6(1)(b)/(c) și eliminare puncte suspensie | M1 | Pilonul 1 (Survey 1) |
| F6 | Curățare Excel Igienă & Adeverință | Eliminare Sheet1 (Registru Casă); corectare stutter aviz și adaptare dinamică Nivel 1/2 în adeverință | M1 | Pilonul 1 (Survey 1) |
| F7 | Fișă Individuală Instruire SSM | Creare șablon Anexa 11 HG 1425/2006 (`ssm-fisa-instruire-individuala`) cu tabel periodic multianual | M2 | Pilonul 2 (Spec Miner 2) |
| F8 | Fișă Individuală Instructaj PSI/SU | Creare șablon Anexa OMAI 712/2005 (`psi-fisa-instructaj-individuala`) | M2 | Pilonul 2 (Spec Miner 2) |
| F9 | Formulare Medicină a Muncii | Creare Fișă Trimitere Examen (Anexa 2) și Fișă Identificare Riscuri (Anexa 3) HG 355/2007 | M2 | Pilonul 2 (Spec Miner 2) |
| F10 | Fișă Dotare EIP & Model CIM 2022 | Creare Fișă EIP HG 1048/2006 și Contract Individual Muncă Model-Cadru Ordin MMSS 2171/2022 (Cap A-P) | M2 | Pilonul 2 (Spec Miner 2) |
| F11 | Extindere Catalog la 31 Șabloane | Integrare definiții TypeScript în `definitions.ts`, sincronizare `seed.ts` și schemă DB | M2 | Pilonul 2 (Spec Miner 2) |
| F12 | Oprire Date Fictive în Resolver | Eliminare salariu fictiv (6500 lei) și CIM generic; marcare curată `missing_data` cu raportare câmpuri lipsă | M3 | Pilonul 3 (Survey 3) |
| F13 | Fallback Automat Provider Implicit | Interogare automată `SsmProvider` și `SsmSpecialist` cu `isDefault: true` dacă clientul nu are alocare manuală | M3 | Pilonul 3 (Survey 3) |
| F14 | Conectare Context Post (Job) | Mapare `mainActivities`, `equipmentUsed`, `workConditions`, `corCode` în tokenurile de tematică și fișă post | M3 | Pilonul 3 (Survey 3) |
| F15 | Corelare Dinamică Măsuri CAEN | Populare Plan de Prevenire cu măsuri specifice codului CAEN din `caen-risk-presets.ts` | M3 | Pilonul 3 (Survey 3) |
| F16 | Pachet Onboarding Salariat (ZIP) | Endpoint și generator bulk ZIP 1-Click cu cele 7-9 documente necesare la angajare | M4 | Pilonul 4 (Survey 3) |
| F17 | Pachet Înființare Dosar SSM (ZIP) | Endpoint și generator bulk ZIP 1-Click cu decizii, evaluare, plan prevenire și tematici de bază | M4 | Pilonul 4 (Survey 3) |
| F18 | Export Arhivă Control ITM/ISU (ZIP) | Arhivă structurată pe foldere tematice pentru inspecții de control | M4 | Pilonul 4 (Survey 3) |
| F19 | Selector Post/Job în Document Generator | Selector `jobId` în `/documents/generate` pentru documente de post fără salariat obligatoriu | M5 | Pilonul 5 (Survey 3) |
| F20 | Configurator Vizual Evaluare Riscuri | Configurator interactiv în `/risk-assessments` cu ajustare coeficienți Pece și calcul dinamic $N_{rg}$ | M5 | Pilonul 5 (Survey 3) |
| F21 | Suită Verificare Automată 31 Șabloane | Rulare teste automate complete, verificare 31/31 șabloane fără tokenuri nepopulate și `npm run build` curat | M5 | Pilonul 5 (Survey 3) |

Toate cele 21 de funcționalități sunt atribuite milestoanelor M1-M5. Zero funcționalități neatribuite.

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Rectificarea Textuală a Celor 9 Șabloane Existente | F1, F2, F3, F4, F5, F6: Curățare XML, antete, reclame, apelative Dl/Dna, ștergere Sheet1 casă, sincronizare definitions & resolver | none | DONE |
| M2 | Extinderea Catalogului la 31 Șabloane Statutare | F7, F8, F9, F10, F11: Creare fișiere DOCX statutare (Anexa 11 SSM, Anexa PSI, Anexa 2 & 3 Med, Fișă EIP, CIM 2022), extindere definitions.ts, actualizare seed | M1 | DONE |
| M3 | Reconfigurarea Resolverului & Conectarea Datelor Reale | F12, F13, F14, F15: Oprire date fictive, fallback isDefault: true, conectare Job context, corelare măsuri CAEN | M1, M2 | IN_PROGRESS |
| M4 | Generare în Lot pe Fluxuri Operaționale (Bulk ZIP) | F16, F17, F18: Pachet Onboarding ZIP, Pachet Dosar SSM ZIP, Export Arhivă Control ITM/ISU ZIP via PizZip | M2, M3 | PLANNED |
| M5 | Rafinarea Interfeței UI/UX, Configurator Riscuri & Build Pass | F19, F20, F21: Selector Job în generator, configurator interactiv în /risk-assessments, verificare 31/31 șabloane, build & audit curat | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### `src/lib/templates/definitions.ts`
- Catalogul conține exact 31 de șabloane tipizate.
- Tokenuri noi adăugate în schema oficială:
  - `PLACEHOLDER_NUMAR_DECIZIE_10`: Numărul deciziei 10 din registrul de decizii.
  - `PLACEHOLDER_APELATIV_ADMINISTRATOR`: „Dl.” sau „Dna.” determinat dinamic din sexul sau prenumele administratorului.
  - `PLACEHOLDER_APELATIV_PSI`: „Dl.” sau „Dna.” determinat dinamic din sexul sau prenumele responsabilului PSI.
  - `PLACEHOLDER_ACTIVITATI_POST`: Preluat din `job.mainActivities`.
  - `PLACEHOLDER_ECHIPAMENTE_POST`: Preluat din `job.equipmentUsed`.
  - `PLACEHOLDER_CONDITII_POST`: Preluat din `job.workConditions`.
  - `PLACEHOLDER_COD_COR`: Preluat din `job.corCode`.
  - `PLACEHOLDER_NUMAR_CIM`: Preluat din datele salariatului sau lăsat curat pentru completare manuală.

### `src/lib/templates/resolver.ts`
```typescript
export interface TemplateResolutionOptions {
  client: ClientWithRelations;
  employee?: EmployeeWithRelations;
  job?: Job;
  hygieneSession?: HygieneSessionWithRelations;
  manualOverrides?: Record<string, string>;
  jobId?: string;
}
```
- Dacă `client.providerId` sau `client.specialistId` este null, resolverul interoghează `SsmProvider` și `SsmSpecialist` cu `isDefault: true`.
- Salariul și variabilele tranzacționale nespecificate nu sunt fabricate; se returnează `missing_data` cu lista rubricilor necompletate.

### `src/app/api/documents/packages/route.ts`
- `POST /api/documents/packages/onboarding`: Returnează ZIP cu pachetul complet de onboarding pentru `employeeId`.
- `POST /api/documents/packages/dossier`: Returnează ZIP cu dosarul SSM de înființare pentru `clientId`.
- `POST /api/documents/packages/inspection-archive`: Returnează ZIP structurat pe foldere tematice pentru controale ITM/ISU.
