# DISPATCH LOG

## 2026-11-01T20:47:07Z

Build an automated document completion and employee compliance deadline tracking system for Romanian SSM, HR, and Hygiene operations, with full autonomy to research external sources, inspect legal models, and modify or rewrite existing project components, keeping the workflow simple without user roles or electronic signatures.

Working directory: /Users/davidalexandru/Documents/Proiect_SSM
Integrity mode: development

References:
- Romanian SSM, PSI/SU, Labor, and Hygiene legislation and practices: Legea 319/2006 (SSM), Legea 53/2003 (Codul Muncii), HG 355/2007 (Medicina Muncii), Ordinul 1225/5031/2003 (Cursuri Igienă), Legea 307/2006 (Apărarea împotriva incendiilor).
- Template directory: `handoff/ssm-template-placeholder-pack/templates` (25 templates in DOCX and XLSX formats covering HR, Decizii, IPSSM, Evaluare Riscuri, Instruire SSM/SU, and Cursuri Igienă).
- Existing application stack: Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma ORM with PostgreSQL.

## Requirements

### R1. Comprehensive Document Auto-Completion
Implement complete auto-completion logic for all 25 document templates (DOCX and XLSX) in `handoff/ssm-template-placeholder-pack/templates`, using them as models and suggestions. The team has full autonomy to inspect external online documentation, repositories, and real-world Romanian legal models, and to refactor or rewrite existing project code and mapping logic in any direction needed to produce authentic, fully populated documents.

### R2. Employee Deadline and Expiry Tracking
Implement full tracking and clear visibility over employee compliance scadențe and expiration dates, specifically occupational health checkups (medicină a muncii), periodic SSM and PSI/SU training intervals, and hygiene certificate validity periods. Surfaced deadlines must be visible both in the backend data calculations and through clear status badges and alerts in the Next.js user interface.

### R3. Streamlined and Intuitive Workflow
Keep the system simple, intuitive, and automated without adding user roles, permission hierarchies, or electronic signatures.

### R4. Automated Verification Suite
Provide automated test scripts and verification routines that confirm:
1. Complete generation and placeholder replacement across all 25 templates with realistic data, leaving no unmapped placeholders or malformed files.
2. Accurate calculation of employee compliance deadlines according to Romanian legal intervals.
3. Proper functioning and clean builds of the application (`npm run build`).

## Acceptance Criteria

### Document Auto-Completion
- [ ] All 25 templates (DOCX and XLSX) in `handoff/ssm-template-placeholder-pack/templates` generate without unpopulated template placeholders or corrupted outputs.
- [ ] Generated documents conform to Romanian legal and practical standards for SSM, PSI/SU, HR, Risk Assessments, and Hygiene courses.

### Deadline & Expiry Tracking
- [ ] Occupational medicine (medicină a muncii) validity periods are calculated and tracked per employee.
- [ ] Periodic SSM and PSI/SU training intervals are calculated and tracked per employee.
- [ ] Hygiene certificate (cursuri de igienă) validity dates are calculated and tracked per employee.
- [ ] Clear visual status indicators and alerts for valid, upcoming, and overdue deadlines are present in the user interface.

### Architecture & Usability
- [ ] No user roles, permission hierarchies, or electronic signatures are introduced.
- [ ] The Next.js application compiles cleanly with `npm run build` with zero errors.

### Automated Verification
- [ ] Automated verification script(s) run and pass, confirming document generation for all 25 templates and verifying compliance deadline calculation logic.


## 2026-11-04T20:45:38Z
Începeți execuția imediat. Toate detaliile tehnice, cele 5 componente (Pilonii 1-5), cerințele pentru fiecare șablon și funcție sunt deja stabilite și aprobate în planul strategic. Continuați direct cu implementarea secvențială, rularea testelor și verificarea build-ului.

Context relevant din conversația anterioară (Planul Strategic și Raportul de Audit):
---
Planul strategic din artefactul `/Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md` structurat pe cei 5 piloni:

### Pilonul 1: Rectificarea Textuală a Șabloanelor Existente (Prioritate Maximă)
1. `EVALUAREA RISCURILOR.docx`: Înlocuirea `{PLACEHOLDER_ADRESA_FIRMA}` din antet cu `{PLACEHOLDER_NR_REG_COM}`; eliminarea localității statice „București”; reintegrarea tabelului factorilor de risc (Cap. 6 și 7).
2. `13 - ACTIVITATI DE BIROU.docx`: Înlocuirea sintagmei „agenților de pază” cu „personalului de birou”; adăugarea `{PLACEHOLDER_FIRMA}` în antet.
3. `11 - ALUNECARI.docx`: Adăugarea `{PLACEHOLDER_FIRMA}` în antet.
4. `Detaliu Tematica loc de munca.docx`: Ștergerea imaginii externe TinyPic cu reclama comercială din subsol; adăugarea `{PLACEHOLDER_FUNCTIE}`.
5. `DECIZII.docx`: Introducerea tokenului `{PLACEHOLDER_NUMAR_DECIZIE_10}` și a tokenurilor de apelativ `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` și `{PLACEHOLDER_APELATIV_PSI}` (`Dl.` / `Dna.` dinamic după sex/prenume).
6. `Anexa fisa postului SSM.docx`: Adăugarea `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_COD_COR}` și număr CIM.
7. `Informare Protectia Datelor.docx`: Trecerea la Art. 6(1)(b)/(c) GDPR; eliminarea punctelor de suspensie reziduale.
8. `Tabel Cursanti exemplu.xlsx`: Eliminarea foii de calcul contabile reziduale `Sheet1` (Registru de Casă).
9. `Adeverinta participare.docx`: Corectarea stutter-ului `Nr. Aviz MS nr.` și adaptarea nivelului în funcție de funcție (Nivelul 1 pentru execuție, Nivelul 2 pentru conducere).

### Pilonul 2: Adăugarea a 6 Șabloane Noi Esențiale în Catalog (Extindere de la 25 la 31)
1. `ssm-fisa-instruire-individuala` (Fișa Individuală de Instruire SSM - Anexa 11 HG 1425/2006).
2. `psi-fisa-instructaj-individuala` (Fișa Individuală de Instructaj în Domeniul Situațiilor de Urgență - Anexa OMAI 712/2005).
3. `med-fisa-solicitare-examen` (Fișa de Solicitare a Examenului Medical - Anexa 2 HG 355/2007).
4. `med-fisa-identificare-riscuri` (Fișa de Identificare a Factorilor de Risc Profesional - Anexa 3 HG 355/2007).
5. `eip-fisa-acordare-individuala` (Fișa Individuală de Dotare și Acordare EIP - HG 1048/2006).
6. `hr-cim-model-cadru-2022` (Contract Individual de Muncă Model-Cadru conform Ordinului MMSS 2171/2022).

### Pilonul 3: Reconfigurarea Resolverului & Conectarea Datelor Reale
1. Oprirea generării cu date fictive (salariu fictiv 6500 lei etc.).
2. Prioritizarea specialistului implicit (`isDefault: true`) din baza de date (`SsmProvider` și `SsmSpecialist`) dacă clientul nu are alocat explicit unul.
3. Conectarea contextului din post (`Job`): `mainActivities`, `equipmentUsed`, `workConditions`, `corCode` injectate în tematici și fișa postului.
4. Corelarea dinamică a măsurilor din Planul de Prevenire cu profilul de risc CAEN al postului.

### Pilonul 4: Generare în Lot pe Fluxuri Operaționale (Bulk Workflows)
- Pachet Onboarding Salariat (1-Click ZIP)
- Pachet Înființare Dosar SSM Client (Start-up Dossier)
- Export Arhivă Control ITM / ISU (ZIP)

### Pilonul 5: Rafinarea Interfeței (UI/UX) și Serviciul de Alerte
- Selector de Funcție / Post (`jobId`) în `/documents/generate`
- Configurator vizual de evaluare a riscurilor în `/risk-assessments`
- Sincronizare seed și verificare automată a suitei de teste (`npm run build`, `npm test`).


## 2026-11-04T23:55:47Z
Începeți execuția imediat. Toate detaliile tehnice, cele 5 componente (Pilonii 1-5), cerințele pentru fiecare șablon și funcție sunt deja stabilite și aprobate în planul strategic. Continuați direct cu implementarea secvențială, rularea testelor și verificarea build-ului.

Context relevant din conversația anterioară (Planul Strategic și Raportul de Audit):
---
Planul strategic din artefactul `/Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md` structurat pe cei 5 piloni:

### Pilonul 1: Rectificarea Textuală a Șabloanelor Existente (Prioritate Maximă)
1. `EVALUAREA RISCURILOR.docx`: Înlocuirea `{PLACEHOLDER_ADRESA_FIRMA}` din antet cu `{PLACEHOLDER_NR_REG_COM}`; eliminarea localității statice „București”; reintegrarea tabelului factorilor de risc (Cap. 6 și 7).
2. `13 - ACTIVITATI DE BIROU.docx`: Înlocuirea sintagmei „agenților de pază” cu „personalului de birou”; adăugarea `{PLACEHOLDER_FIRMA}` în antet.
3. `11 - ALUNECARI.docx`: Adăugarea `{PLACEHOLDER_FIRMA}` în antet.
4. `Detaliu Tematica loc de munca.docx`: Ștergerea imaginii externe TinyPic cu reclama comercială din subsol; adăugarea `{PLACEHOLDER_FUNCTIE}`.
5. `DECIZII.docx`: Introducerea tokenului `{PLACEHOLDER_NUMAR_DECIZIE_10}` și a tokenurilor de apelativ `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` și `{PLACEHOLDER_APELATIV_PSI}` (`Dl.` / `Dna.` dinamic după sex/prenume).
6. `Anexa fisa postului SSM.docx`: Adăugarea `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_COD_COR}` și număr CIM.
7. `Informare Protectia Datelor.docx`: Trecerea la Art. 6(1)(b)/(c) GDPR; eliminarea punctelor de suspensie reziduale.
8. `Tabel Cursanti exemplu.xlsx`: Eliminarea foii de calcul contabile reziduale `Sheet1` (Registru de Casă).
9. `Adeverinta participare.docx`: Corectarea stutter-ului `Nr. Aviz MS nr.` și adaptarea nivelului în funcție de funcție (Nivelul 1 pentru execuție, Nivelul 2 pentru conducere).

### Pilonul 2: Adăugarea a 6 Șabloane Noi Esențiale în Catalog (Extindere de la 25 la 31)
1. `ssm-fisa-instruire-individuala` (Fișa Individuală de Instruire SSM - Anexa 11 HG 1425/2006).
2. `psi-fisa-instructaj-individuala` (Fișa Individuală de Instructaj în Domeniul Situațiilor de Urgență - Anexa OMAI 712/2005).
3. `med-fisa-solicitare-examen` (Fișa de Solicitare a Examenului Medical - Anexa 2 HG 355/2007).
4. `med-fisa-identificare-riscuri` (Fișa de Identificare a Factorilor de Risc Profesional - Anexa 3 HG 355/2007).
5. `eip-fisa-acordare-individuala` (Fișa Individuală de Dotare și Acordare EIP - HG 1048/2006).
6. `hr-cim-model-cadru-2022` (Contract Individual de Muncă Model-Cadru conform Ordinului MMSS 2171/2022).

### Pilonul 3: Reconfigurarea Resolverului & Conectarea Datelor Reale
1. Oprirea generării cu date fictive (salariu fictiv 6500 lei etc.).
2. Prioritizarea specialistului implicit (`isDefault: true`) din baza de date (`SsmProvider` și `SsmSpecialist`) dacă clientul nu are alocat explicit unul.
3. Conectarea contextului din post (`Job`): `mainActivities`, `equipmentUsed`, `workConditions`, `corCode` injectate în tematici și fișa postului.
4. Corelarea dinamică a măsurilor din Planul de Prevenire cu profilul de risc CAEN al postului.

### Pilonul 4: Generare în Lot pe Fluxuri Operaționale (Bulk Workflows)
- Pachet Onboarding Salariat (1-Click ZIP)
- Pachet Înființare Dosar SSM Client (Start-up Dossier)
- Export Arhivă Control ITM / ISU (ZIP)

### Pilonul 5: Rafinarea Interfeței (UI/UX) și Serviciul de Alerte
- Selector de Funcție / Post (`jobId`) în `/documents/generate`
- Configurator vizual de evaluare a riscurilor în `/risk-assessments`
- Sincronizare seed și verificare automată a suitei de teste (`npm run build`, `npm test`).

Context reluare (State Recovery):
---
Starea completă a proiectului este conservată în `.agents/teamwork/PROJECT.md` (21 funcționalități F1-F21, Milestoane M1-M5).
Modificările aferente Milestone 1 (rectificarea celor 9 șabloane în `templates_registry/normalized/` și `handoff/`, ștergerea foii de casă din Excel, deducerea dinamică a apelativelor în `definitions.ts` și `resolver.ts`) sunt deja aplicate pe disc.
Verificați starea curentă a Milestone 1 și continuați direct cu execuția Milestone 2 (adăugarea celor 6 șabloane noi F7-F11) și secvențial cu M3, M4, M5 până la validarea completă a cerințelor (`npm run build`, `npm test`, `verify-all.ts`).
