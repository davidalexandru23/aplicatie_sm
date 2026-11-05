# RAPORT DE INVESTIGAȚIE & HANDOFF: F10 Part B & F11

**Agent ID**: `m2_p2_explorer_3`  
**Data**: 2026-11-05  
**Destinatar**: Worker / Orchestrator  
**Obiectiv**: 
1. Investigarea completă și specificarea tehnică a șablonului **F10 (Part B)**: `hr-cim-model-cadru-2022` (Contractul Individual de Muncă Model-Cadru conform Ordinului MMSS nr. 2171/2022, Capitolele A–P).
2. Proiectarea și formularea integrării arhitecturale **F11**: Extinderea oficială a catalogului de la 25 la 31 de șabloane în `src/lib/templates/definitions.ts`, sincronizarea resolver-ului în `src/lib/templates/resolver.ts`, și actualizarea seed-ului în `prisma/seed.ts` / `src/lib/templates/seed.ts`.

---

## 1. OBSERVATION (Observații Directe din Baza de Cod și Cadrul Legislativ)

### 1.1. Starea Curentă a Catalogului de Șabloane (`definitions.ts`)
- În fișierul `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/definitions.ts`, variabila `TEMPLATE_CATALOG: TemplateDefinition[]` conține în prezent **exact 25 de șabloane** (linii 38–3353).
- Catalogul actual conține un șablon de CIM denumit `hr-cim-2026` (linii 957–1173), având fișierul fizic `templates_registry/normalized/Contract individual munca 2026.docx`.
- Prin inspectarea directă a fișierului `templates_registry/normalized/Contract individual munca 2026.docx` (via `PizZip`), s-a observat că textul acestuia este structurat doar pe **7 articole abreviate (Art. A – Art. G)**:
  - `Art. A. Părțile contractului`
  - `Art. B. Obiectul și durata contractului` (obiectul și durata comasate)
  - `Art. C. Locul muncii și felul muncii` (locul și felul muncii comasate)
  - `Art. D. Durata muncii, concediul și salariul` (trei capitole comasate)
  - `Art. E. Perioada de probă și preavizul` (probă și preaviz comasate)
  - `Art. F. Drepturi și obligații generale`
  - `Art. G. Dispoziții finale`
- **Concluzie critică**: Șablonul existent `hr-cim-2026` este un format condensat pre-2022 și **nu respectă structura obligatorie pe 16 capitole (Capitolele A–P)** prevăzută de Ordinul ministrului muncii și solidarității sociale nr. 2171/2022.

### 1.2. Cadrul Legal Obligatoriu: Ordinul MMSS nr. 2171/2022
- Publicat în Monitorul Oficial al României nr. 1180 din 9 decembrie 2022, în aplicarea Directivei (UE) 2019/1152 și a modificărilor aduse Codului Muncii (Legea nr. 53/2003) prin Legea nr. 283/2022.
- Ordinul 2171/2022 instituie o structură imperativă de **16 capitole distincte (A–P)**:
  1. **Cap. A**: Părțile contractului (Angajator și Salariat, incluzând date bancare și date de contact complete)
  2. **Cap. B**: Obiectul contractului
  3. **Cap. C**: Durata contractului (nedeterminată / determinată)
  4. **Cap. D**: Perioada de probă (**NOU 2022**: specificarea expresă a condițiilor perioadei de probă)
  5. **Cap. E**: Locul de muncă (**NOU 2022**: loc fix vs lipsa locului fix, telemuncă, decontarea/asigurarea transportului de către angajator)
  6. **Cap. F**: Felul muncii (funcția și codul COR)
  7. **Cap. G**: Durata muncii (**NOU 2022**: normă întreagă / fracțiune, repartizare program, organizare în schimburi, condiții ore suplimentare)
  8. **Cap. H**: Concediul (de odihnă de minim 20 zile lucrătoare, concediu suplimentar)
  9. **Cap. I**: Salariul și alte elemente constitutive (**NOU 2022**: defalcarea elementelor constitutive, data plății, metoda de plată - virament în cont IBAN / numerar)
  10. **Cap. J**: Drepturi și obligații ale părților privind securitatea și sănătatea în muncă (EIP, echipament de lucru, materiale igienico-sanitare, alimentație de protecție, medicina muncii)
  11. **Cap. K**: Alte clauze (preaviz concediere, preaviz demisie, muncă în străinătate, clauze speciale de confidențialitate/neconcurență)
  12. **Cap. L**: Formarea profesională (**NOU 2022**: capitol distinct dedicat periodicității și suportării cheltuielilor de către angajator conform art. 193-194 Codul Muncii)
  13. **Cap. M**: Asigurare medicală privată, contribuții suplimentare la pensie facultativă sau la pensia ocupațională (**NOU 2022**: capitol distinct conform art. 17 alin. 3 lit. o^1 Codul Muncii)
  14. **Cap. N**: Drepturile și obligațiile generale ale părților (drepturile/obligațiile salariatului și ale angajatorului conform art. 39-40 Codul Muncii)
  15. **Cap. O**: Dispoziții comune (Regulamentul Intern și Contractul Colectiv de Muncă)
  16. **Cap. P**: Dispoziții finale (completare cu Codul Muncii, necesitate act adițional, soluționare litigii, 2 exemplare originale)

### 1.3. Mecanismul de Seeding și Baza de Date (`prisma/seed.ts` & `src/lib/templates/seed.ts`)
- În `prisma/seed.ts` (linii 10–14):
  ```typescript
  // 0. CATALOG ȘABLOANE OFICIALE (25 ȘABLOANE)
  console.log('0. Seeding Catalog Șabloane Oficiale...');
  await seedTemplates();
  ```
- În `src/lib/templates/seed.ts` (linii 4–48):
  Funcția `seedTemplates()` iterează direct prin `TEMPLATE_CATALOG` din `./definitions` și execută `prisma.template.upsert` pe baza cheii unice `code`.
- **Efect direct**: Prin adăugarea celor 6 noi definiții de șabloane în `TEMPLATE_CATALOG`, funcția `seedTemplates()` va sincroniza automat toate cele **31 de șabloane** în baza de date PostgreSQL, fără a necesita modificări complexe de schemă SQL.

### 1.4. Motorul de Rezolvare a Placeholder-elor (`resolver.ts`)
- În `src/lib/templates/resolver.ts`, funcția `resolveTemplateData` (linii 720–1291) efectuează compoziția datelor:
  `ALL_ROMANIAN_LEGAL_FALLBACKS` $\rightarrow$ `verifiedMap` (date reale DB) $\rightarrow$ `customOverrides`.
- Pentru cele 6 noi șabloane, resolver-ul necesită includerea de fallback-uri statutare specifice (ex: cont bancar, clauze de probă 2022, periodicitate formare, asigurare privată, date medicină a muncii, tabele instruire SSM/PSI, tabele EIP).

---

## 2. LOGIC CHAIN (Lanțul Raționamentului Tehnic și Juridic)

1. **Premisă**: Cerința strategică din `ORIGINAL_REQUEST.md` (Pilonul 2) și `PROJECT.md` (F7–F11, Milestone M2) stipulează extinderea catalogului de la 25 la 31 de șabloane statutare, cu adăugarea specifică a șablonului `hr-cim-model-cadru-2022`.
2. **Corelare structurală**: Șablonul existent `hr-cim-2026` nu poate fi simplu redenumit sau tratat ca fiind conform cu Ordinul 2171/2022, deoarece are doar 7 articole condensate. Menținerea `hr-cim-2026` în catalog ca opțiune condensată și adăugarea `hr-cim-model-cadru-2022` ca șablon oficial complet (Cap. A–P) garantează conformitatea juridică deplină cu Ordinul MMSS 2171/2022 și păstrează backward compatibility cu testele existente.
3. **Structura celor 6 șabloane noi**:
   - `ssm-fisa-instruire-individuala` (Anexa 11 HG 1425/2006) $\rightarrow$ Familie: `training`, Context: `employee`.
   - `psi-fisa-instructaj-individuala` (Anexa OMAI 712/2005) $\rightarrow$ Familie: `training`, Context: `employee`.
   - `med-fisa-solicitare-examen` (Anexa 2 HG 355/2007) $\rightarrow$ Familie: `hr`, Context: `employee`.
   - `med-fisa-identificare-riscuri` (Anexa 3 HG 355/2007) $\rightarrow$ Familie: `risk`, Context: `employee`.
   - `eip-fisa-acordare-individuala` (HG 1048/2006) $\rightarrow$ Familie: `hr`, Context: `employee`.
   - `hr-cim-model-cadru-2022` (Ordin MMSS 2171/2022 Cap A–P) $\rightarrow$ Familie: `hr`, Context: `employee`.
4. **Armonizarea Token-urilor**:
   - Fiecare nou șablon trebuie să utilizeze token-urile standardizate ale platformei (`PLACEHOLDER_FIRMA`, `PLACEHOLDER_CUI`, `PLACEHOLDER_NUME_COMPLET`, etc.) pentru a asigura interoperabilitatea cu datele extrase din entitățile Prisma (`Client`, `Employee`, `Job`, `Worksite`, `IdentityDocument`, `ResidenceAddress`).
   - Pentru capitolele inovative din Ordinul 2171/2022 (Capitolele D, E, G, I, L, M), au fost definiți token-uri clari, expresivi și compatibili cu `docxtemplater` (ex. `PLACEHOLDER_CONDITII_PROBA`, `PLACEHOLDER_DECONTARE_TRANSPORT`, `PLACEHOLDER_METODA_PLATA`, `PLACEHOLDER_CONDITII_FORMARE`, `PLACEHOLDER_ASIGURARE_MEDICALA_PRIVATA`).
5. **Integrare Seed & Verificare Automată**:
   - `TEMPLATE_CATALOG.length` devine exact **31**.
   - `seedTemplates()` va sincroniza 31 de rânduri în tabela `Template`.
   - `scripts/verify-all.ts` și `scripts/test-all-templates-generation.ts` vor valida 31/31 de șabloane cu zero erori și status `approved_for_print`.

---

## 3. CAVEATS (Situații Speciale, Excepții și Condiții la Limită)

1. **Prevenirea Salariilor Fictive (Pilonul 3 / F12)**:
   - În modelul 2022, `PLACEHOLDER_SALARIU_BRUT` este marcat ca `required: false` în schema șablonului sau rezolvat din datele salariatului. În absența unei valori explicite în baza de date / override, resolver-ul NU trebuie să inventeze salarii arbitrare (precum vechiul mock de 6500 lei), ci să semnaleze `missing_data` dacă documentul este generat pentru semnare efectivă.
2. **Durata Perioadei de Probă**:
   - Conform art. 31 din Codul Muncii: maxim 90 de zile calendaristice pentru funcții de execuție, respectiv maxim 120 de zile calendaristice pentru funcții de conducere. În cazul contractelor pe durată determinată, durata este proporțională (între 5 și 45 de zile lucrătoare conform art. 85 Codul Muncii).
3. **Preavizul la Demisie**:
   - Art. 81 alin. (4) Codul Muncii impune o perioadă de preaviz negociată, dar care nu poate depăși 20 de zile lucrătoare pentru salariații cu funcții de execuție, respectiv 45 de zile lucrătoare pentru salariații cu funcții de conducere.
4. **Locul de Muncă fără Sediul Fix & Decontare Transport**:
   - Clauza Cap. E permite două scenarii: loc fix (punct de lucru delimitat) SAU activitate mobilă/itinerantă/telemuncă. Clauza de decontare a transportului (art. 17 alin. 3 lit. b^1 Codul Muncii) se completează automat cu „Nu este cazul” dacă activitatea se desfășoară la sediul stabil și nu implică navetă / deplasări impuse de angajator.
5. **Fișierele DOCX Fizice din `templates_registry/normalized/`**:
   - Worker-ul trebuie să asigure prezența fizică a fișierelor `.docx` corespunzătoare în folderul `templates_registry/normalized/` cu numele indicate în `normalizedFilename`. Pentru `hr-cim-model-cadru-2022`, fișierul este `hr-cim-model-cadru-2022.docx`.

---

## 4. CONCLUSION (Instrucțiuni de Implementare & Definiții Complete TypeScript)

Worker-ul va efectua modificările în următoarea secvență precisă:

### 4.1. Adăugarea Definițiilor în `src/lib/templates/definitions.ts`

Adăugați cele 6 obiecte `TemplateDefinition` la sfârșitul array-ului `TEMPLATE_CATALOG` (înainte de paranteza `];` de la finalul fișierului):

```typescript
  // =========================================================================
  // PILONUL 2: EXTINDERE CATALOG LA 31 ȘABLOANE STATUTARE (F7 - F11)
  // =========================================================================

  // 26. F7: Fișă individuală de instruire SSM (Anexa 11 HG 1425/2006)
  {
    code: 'ssm-fisa-instruire-individuala',
    name: 'Fișă individuală de instruire SSM (Anexa 11 HG 1425/2006)',
    family: 'training',
    originalFilename: 'Fisa individuala de instruire SSM - Anexa 11 HG 1425.docx',
    normalizedFilename: 'ssm-fisa-instruire-individuala.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'active',
    version: 1,
    description: 'Fișa individuală de instruire în domeniul securității și sănătății în muncă conform Anexei nr. 11 la HG 1425/2006 cu tabel periodic multianual.',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod Unic de Înregistrare', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu social', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă punct de lucru', source: 'worksite.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'CNP salariat', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_NASTERII', label: 'Data nașterii', source: 'employee.birthDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_LOCALITATE_NASTERII', label: 'Localitate naștere', source: 'employee.birthPlace', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DOMICILIU', label: 'Adresă domiciliu salariat', source: 'residence.addressFull', required: true, type: 'string' },
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Ocupație', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR', source: 'job.corCode', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DEPARTAMENT', label: 'Atelier / Secție / Departament', source: 'worksite.activity', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_ANGAJARII', label: 'Data angajării', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_GRUPA_SANGUINA', label: 'Grupă sanguină / RH', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_INSTRUIRE_INTRODUCTIV', label: 'Data instruirii introductiv-generale', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DURATA_INSTRUIRE_INTRODUCTIV', label: 'Durată instruire introductiv-generală (ore)', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_INSTRUCTOR_INTRODUCTIV', label: 'Instructor instruire introductiv-generală', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CALIFICARE_INSTRUCTOR_INTRODUCTIV', label: 'Calificare instructor introductiv-generală', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_VERIFICATOR_INTRODUCTIV', label: 'Persoană verificare cunoștințe introductiv', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_INSTRUIRE_LOC_MUNCA', label: 'Data instruirii la locul de muncă', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DURATA_INSTRUIRE_LOC_MUNCA', label: 'Durată instruire la locul de muncă (ore)', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_INSTRUCTOR_LOC_MUNCA', label: 'Instructor instruire locul de muncă', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_SEF_IERARHIC', label: 'Șef ierarhic superior / Verificator', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_ADMITERE_LUCRU', label: 'Data admiterii la lucru', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_AUTORIZATOR_ADMITERE', label: 'Persoană aprobare admitere la lucru', source: 'client.legalRepresentative', required: true, type: 'string' }
    ],
  },

  // 27. F8: Fișă individuală de instructaj în domeniul situațiilor de urgență (OMAI 712/2005)
  {
    code: 'psi-fisa-instructaj-individuala',
    name: 'Fișă individuală de instructaj în domeniul situațiilor de urgență (OMAI 712/2005)',
    family: 'training',
    originalFilename: 'Fisa individuala instructaj PSI-SU - Anexa OMAI 712.docx',
    normalizedFilename: 'psi-fisa-instructaj-individuala.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'active',
    version: 1,
    description: 'Fișa individuală de instructaj în domeniul situațiilor de urgență (apărare împotriva incendiilor și protecție civilă) conform OMAI nr. 712/2005.',
    reviewer: 'Cadru Tehnic PSI / Specialist SSM',
    fields: [
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire unitate / Operator economic', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod Unic de Înregistrare', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu unitate', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă punct de lucru', source: 'worksite.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'CNP salariat', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_NASTERII', label: 'Data nașterii', source: 'employee.birthDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_LOCALITATE_NASTERII', label: 'Localitate naștere', source: 'employee.birthPlace', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DOMICILIU', label: 'Adresă domiciliu salariat', source: 'residence.addressFull', required: true, type: 'string' },
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Ocupație', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DEPARTAMENT', label: 'Locul de muncă / Atelier', source: 'worksite.activity', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_ANGAJARII', label: 'Data încadrării în muncă', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_PSI_INTRODUCTIV', label: 'Data instructajului introductiv-general PSI', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DURATA_PSI_INTRODUCTIV', label: 'Durată instructaj introductiv-general (ore)', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_RESPONSABIL_PSI', label: 'Cine a efectuat instructajul PSI introductiv', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_VERIFICATOR_PSI', label: 'Cine a verificat însușirea cunoștințelor PSI', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_PSI_LOC_MUNCA', label: 'Data instructajului la locul de muncă PSI', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DURATA_PSI_LOC_MUNCA', label: 'Durată instructaj locul de muncă (ore)', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_INSTRUCTOR_LOC_MUNCA', label: 'Cine a efectuat instructajul la locul de muncă', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_SEF_IERARHIC', label: 'Șef ierarhic / Verificator instructaj', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_ADMITERE_LUCRU', label: 'Data admiterii la lucru', source: 'employee.hireDate', required: true, type: 'string' }
    ],
  },

  // 28. F9 (Part A): Fișă de solicitare a examenului medical la angajare / periodic (Anexa 2 HG 355/2007)
  {
    code: 'med-fisa-solicitare-examen',
    name: 'Fișă de solicitare a examenului medical la angajare / periodic (Anexa 2 HG 355/2007)',
    family: 'hr',
    originalFilename: 'Fisa solicitare examen medical - Anexa 2 HG 355.docx',
    normalizedFilename: 'med-fisa-solicitare-examen.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'active',
    version: 1,
    description: 'Fișa oficială de solicitare a examenului medical de medicina muncii (la angajare, periodic, reluare, adaptare) conform Anexei nr. 2 la HG nr. 355/2007.',
    reviewer: 'Medic Medicina Muncii / Operator HR',
    fields: [
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Unitate', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod Unic de Înregistrare', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NR_REG_COM', label: 'Nr. Registrul Comerțului', source: 'client.regCom', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu societate', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă punct de lucru', source: 'worksite.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_TELEFON_CONTACT', label: 'Telefon contact angajator', source: 'client.contactPhone', required: false, type: 'string' },
      { key: 'PLACEHOLDER_MEDIC_MEDICINA_MUNCII', label: 'Către Medicul / Clinica de Medicina Muncii', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_TIP_EXAMEN_MEDICAL', label: 'Tip examen medical (angajare/periodic/reluare/adaptare)', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'CNP salariat', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_NASTERII', label: 'Data nașterii', source: 'employee.birthDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DOMICILIU', label: 'Adresă domiciliu salariat', source: 'residence.addressFull', required: true, type: 'string' },
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Post propus sau ocupat', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR funcție', source: 'job.corCode', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DEPARTAMENT', label: 'Loc de muncă / Atelier / Secție', source: 'worksite.activity', required: false, type: 'string' },
      { key: 'PLACEHOLDER_VECHIME_TOTALA', label: 'Vechime totală în muncă', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_VECHIME_PROFESIE', label: 'Vechime în profesie / funcție', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_CONDITII_POST', label: 'Condiții specifice ale postului', source: 'job.workConditions', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_SOLICITARE', label: 'Data întocmirii solicitării', source: 'meta.currentDateRo', required: true, type: 'string' },
      { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant legal / Semnătură și ștampilă', source: 'client.legalRepresentative', required: true, type: 'string' }
    ],
  },

  // 29. F9 (Part B): Fișă de identificare a factorilor de risc profesional (Anexa 3 HG 355/2007)
  {
    code: 'med-fisa-identificare-riscuri',
    name: 'Fișă de identificare a factorilor de risc profesional (Anexa 3 HG 355/2007)',
    family: 'risk',
    originalFilename: 'Fisa identificare factori risc - Anexa 3 HG 355.docx',
    normalizedFilename: 'med-fisa-identificare-riscuri.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'active',
    version: 1,
    description: 'Fișa de identificare a factorilor de risc profesional conform Anexei nr. 3 la HG 355/2007, anexată fișei de solicitare a examenului medical.',
    reviewer: 'Specialist SSM / Evaluator Riscuri',
    fields: [
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Unitate', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod Unic de Înregistrare', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu societate', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă loc de muncă', source: 'worksite.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'CNP salariat', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Meserie', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR', source: 'job.corCode', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DEPARTAMENT', label: 'Loc de muncă / Secție / Departament', source: 'worksite.activity', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ACTIVITATI_POST', label: 'Descrierea activității principale', source: 'job.mainActivities', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ECHIPAMENTE_POST', label: 'Echipamente de muncă utilizate', source: 'job.equipmentUsed', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ORE_VIDEOTERMINAL', label: 'Timp expunere ecran de vizualizare (ore/zi)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_RISCURI_FIZICE', label: 'Factori de risc fizici (zgomot, radiații, climat)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_RISCURI_CHIMICE', label: 'Factori de risc chimici (pulberi, gaze, solvenți)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_RISCURI_BIOLOGICE', label: 'Factori de risc biologici', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_SARCINA_MUNCA', label: 'Suprasolicitări musculo-scheletice și psihosenzoriale', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ECHIPAMENT_PROTECTIE', label: 'Echipament individual de protecție prevăzut', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_SPECIALIST_SSM', label: 'Nume și atestat specialist SSM', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_MEDIC_MEDICINA_MUNCII', label: 'Medic medicina muncii', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_INTOCMIRE', label: 'Data completării fișei', source: 'meta.currentDateRo', required: true, type: 'string' },
      { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant legal angajator', source: 'client.legalRepresentative', required: true, type: 'string' }
    ],
  },

  // 30. F10 (Part A): Fișă individuală de acordare a echipamentului individual de protecție (HG 1048/2006)
  {
    code: 'eip-fisa-acordare-individuala',
    name: 'Fișă individuală de acordare a echipamentului individual de protecție (HG 1048/2006)',
    family: 'hr',
    originalFilename: 'Fisa individuala acordare EIP - HG 1048.docx',
    normalizedFilename: 'eip-fisa-acordare-individuala.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'active',
    version: 1,
    description: 'Fișa individuală de dotare și acordare a echipamentului individual de protecție (EIP) conform HG nr. 1048/2006 și normativului intern.',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod Unic de Înregistrare', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu societate', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă loc de muncă', source: 'worksite.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'CNP salariat', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Meserie', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR', source: 'job.corCode', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DEPARTAMENT', label: 'Atelier / Secție / Loc de muncă', source: 'worksite.activity', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_ANGAJARII', label: 'Data angajării', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NORMATIV_EIP', label: 'Normativ intern / Decizie de aprobare EIP', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_SPECIALIST_SSM', label: 'Specialist / Serviciu SSM desemnat', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant legal angajator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_INTOCMIRE', label: 'Data întocmirii fișei EIP', source: 'meta.currentDateRo', required: true, type: 'string' }
    ],
  },

  // 31. F10 (Part B): Contract individual de muncă model-cadru (Ordin MMSS 2171/2022)
  {
    code: 'hr-cim-model-cadru-2022',
    name: 'Contract individual de muncă model-cadru (Ordin MMSS 2171/2022)',
    family: 'hr',
    originalFilename: 'CIM Model-Cadru Ordin MMSS 2171 2022.docx',
    normalizedFilename: 'hr-cim-model-cadru-2022.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'active',
    version: 1,
    description: 'Contractul individual de muncă model-cadru oficial conform Ordinului MMSS nr. 2171/2022 (Capitolele A-P) actualizat cu modificările Legii nr. 283/2022 (perioadă probă, loc de muncă, formare, beneficii, metodă plată).',
    reviewer: 'Jurist / Operator HR',
    fields: [
      // Cap. A: Părțile contractului
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire angajator', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Sediul / Adresa angajatorului', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_COD_POSTAL_FIRMA', label: 'Cod poștal sediu angajator', source: 'client.postalCode', required: false, type: 'string' },
      { key: 'PLACEHOLDER_TELEFON_CONTACT', label: 'Telefon angajator', source: 'client.contactPhone', required: true, type: 'string' },
      { key: 'PLACEHOLDER_EMAIL_CONTACT', label: 'E-mail angajator', source: 'client.contactEmail', required: false, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod de identificare fiscală (CUI)', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NR_REG_COM', label: 'Nr. înregistrare Registrul Comerțului', source: 'client.regCom', required: false, type: 'string' },
      { key: 'PLACEHOLDER_CONT_BANCA_FIRMA', label: 'Cont IBAN angajator', source: 'client.bankAccount', required: false, type: 'string' },
      { key: 'PLACEHOLDER_BANCA_FIRMA', label: 'Banca angajatorului', source: 'client.bankName', required: false, type: 'string' },
      { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant legal angajator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CALITATE_REPREZENTANT', label: 'Calitate reprezentant legal', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_APELATIV_SALARIAT', label: 'Apelativ salariat (Dl./Dna.)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_DOMICILIU', label: 'Adresă domiciliu salariat', source: 'residence.addressFull', required: true, type: 'string' },
      { key: 'PLACEHOLDER_TELEFON_SALARIAT', label: 'Telefon salariat', source: 'employee.phone', required: false, type: 'string' },
      { key: 'PLACEHOLDER_EMAIL_SALARIAT', label: 'E-mail salariat', source: 'employee.email', required: false, type: 'string' },
      { key: 'PLACEHOLDER_TIP_ACT', label: 'Tip act identitate', source: 'identity.docType', required: true, type: 'string' },
      { key: 'PLACEHOLDER_SERIE_ACT', label: 'Serie act identitate', source: 'identity.series', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUMAR_ACT', label: 'Număr act identitate', source: 'identity.number', required: true, type: 'string' },
      { key: 'PLACEHOLDER_EMITENT_ACT', label: 'Emitent act identitate', source: 'identity.issuedBy', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_EMITERII', label: 'Data eliberării actului', source: 'identity.issueDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'CNP salariat', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_PERMIS_MUNCA', label: 'Permis / autorizație de muncă (cetățeni străini)', source: 'manual', required: false, type: 'string' },

      // Cap. B: Obiectul contractului
      { key: 'PLACEHOLDER_OBIECT_CONTRACT', label: 'Obiectul contractului', source: 'manual', required: false, type: 'string' },

      // Cap. C: Durata contractului
      { key: 'PLACEHOLDER_TIP_DURATA_CIM', label: 'Tip durată contract (nedeterminată / determinată)', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_INCEPERE', label: 'Data începerii activității', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DURATA_LUNI_DETERMINATA', label: 'Durată contract în luni (dacă e determinată)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_SFARSIT', label: 'Data sfârșit CIM (durată determinată)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ARTICOL_DURATA_DETERMINATA', label: 'Temei legal durată determinată (art. 83 Codul Muncii)', source: 'manual', required: false, type: 'string' },

      // Cap. D: Perioada de probă (NOU 2022)
      { key: 'PLACEHOLDER_ZILE_PROBA', label: 'Durată perioadă de probă (zile calendaristice/lucrătoare)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_CONDITII_PROBA', label: 'Condițiile perioadei de probă', source: 'manual', required: false, type: 'string' },

      // Cap. E: Locul de muncă (NOU 2022)
      { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă loc de muncă fix (secție/atelier/birou)', source: 'worksite.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_TIP_LOC_MUNCA', label: 'Modalitate de lucru (loc fix / teren / telemuncă)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DECONTARE_TRANSPORT', label: 'Asigurarea / Decontarea transportului de către angajator', source: 'manual', required: false, type: 'string' },

      // Cap. F: Felul muncii
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcția / Meseria conform COR', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR (6 cifre)', source: 'job.corCode', required: true, type: 'string' },

      // Cap. G: Durata muncii (NOU 2022)
      { key: 'PLACEHOLDER_TIP_NORMA', label: 'Tip normă (întreagă / fracțiune de normă)', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ORE_PE_ZI', label: 'Număr ore de muncă pe zi', source: 'manual', required: true, type: 'number' },
      { key: 'PLACEHOLDER_ORE_PE_SAPTAMANA', label: 'Număr ore de muncă pe săptămână', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_PROGRAM_LUCRU', label: 'Interval program de lucru (repartizare)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_REPARTIZARE_PROGRAM', label: 'Repartizare program de lucru (egală/inegală)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_CONDITII_ORE_SUPLIMENTARE', label: 'Condiții de efectuare și compensare a orelor suplimentare', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ORGANIZARE_SCHIMBURI', label: 'Modalitate organizare muncă în schimburi', source: 'manual', required: false, type: 'string' },

      // Cap. H: Concediul
      { key: 'PLACEHOLDER_ZILE_CONCEDIU', label: 'Zile concediu de odihnă anual (minim 20)', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ZILE_CONCEDIU_SUPLIMENTAR', label: 'Zile concediu suplimentar (condiții grele/speciale)', source: 'manual', required: false, type: 'string' },

      // Cap. I: Salariul și alte elemente constitutive (NOU 2022)
      { key: 'PLACEHOLDER_SALARIU_BRUT', label: 'Salariu de bază lunar brut (lei)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_SPORURI_SALARIU', label: 'Sporuri la salariu', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_INDEMNIZATII_SALARIU', label: 'Indemnizații', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ALTE_ADAOSURI_BENEFICII', label: 'Alte adaosuri / prestații suplimentare în bani sau natură', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_PLATA', label: 'Data / datele plății salariului', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_METODA_PLATA', label: 'Metoda de plată (virament bancar / numerar)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_CONT_BANCA_SALARIAT', label: 'Cont IBAN salariat pentru virament', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_BANCA_SALARIAT', label: 'Banca salariatului', source: 'manual', required: false, type: 'string' },

      // Cap. J: Drepturi și obligații SSM
      { key: 'PLACEHOLDER_ECHIPAMENT_PROTECTIE', label: 'Echipament individual de protecție asigurat', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ECHIPAMENT_LUCRU', label: 'Echipament individual de lucru', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_MATERIALE_IGIENICO_SANITARE', label: 'Materiale igienico-sanitare asigurate', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ALIMENTATIE_PROTECTIE', label: 'Alimentație de protecție (dacă este cazul)', source: 'manual', required: false, type: 'string' },

      // Cap. K: Alte clauze
      { key: 'PLACEHOLDER_ZILE_PREAVIZ_CONCEDIERE', label: 'Zile preaviz la concediere (minim 20)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ZILE_PREAVIZ_DEMISIONARE', label: 'Zile preaviz la demisie (max 20/45)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_CLAUZE_SPECIALE', label: 'Clauze speciale (confidențialitate, neconcurență, mobilitate)', source: 'manual', required: false, type: 'string' },

      // Cap. L: Formarea profesională (NOU 2022)
      { key: 'PLACEHOLDER_PERIODICITATE_FORMARE', label: 'Periodicitatea formării profesionale (la 2/3 ani)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_CONDITII_FORMARE', label: 'Condițiile privind formarea profesională suportată de angajator', source: 'manual', required: false, type: 'string' },

      // Cap. M: Asigurare medicală privată, pensie facultativă sau alte beneficii (NOU 2022)
      { key: 'PLACEHOLDER_ASIGURARE_MEDICALA_PRIVATA', label: 'Asigurare medicală privată suportată de angajator', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_PENSIE_FACULTATIVA', label: 'Contribuții pensie facultativă / ocupațională suportate de angajator', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ALTE_BENEFICII_SOCIALE', label: 'Alte beneficii sociale acordate din inițiativa angajatorului', source: 'manual', required: false, type: 'string' },

      // Cap. P: Dispoziții finale
      { key: 'PLACEHOLDER_NUMAR_CIM', label: 'Număr contract individual de muncă', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_SEMNARE', label: 'Data încheierii și semnării CIM', source: 'meta.currentDateRo', required: false, type: 'string' },
      { key: 'PLACEHOLDER_NUMAR_EXEMPLARE_CIM', label: 'Număr exemplare originale încheiate (2)', source: 'manual', required: false, type: 'string' }
    ],
  }
```

---

### 4.2. Sincronizarea Resolver-ului în `src/lib/templates/resolver.ts`

În `src/lib/templates/resolver.ts`:

1. **Extinderea profilului legal `ROMANIAN_LEGAL_HR_CIM`**:
```typescript
export const ROMANIAN_LEGAL_HR_CIM = {
  PLACEHOLDER_NUMAR_CIM: 'CIM-2026-0042',
  PLACEHOLDER_DATA_CIM: '15.01.2026',
  PLACEHOLDER_DATA_SEMNARII: '15.01.2026',
  PLACEHOLDER_DATA_SFARSIT: '- (nedeterminată)',
  PLACEHOLDER_ARTICOL_DURATA_DETERMINATA: 'Nedeterminată conform art. 12 alin. (1) din Legea nr. 53/2003 - Codul Muncii',
  PLACEHOLDER_PERMIS_MUNCA: 'Nu este cazul (cetățean român)',
  PLACEHOLDER_ORE_PE_ZI: '8',
  PLACEHOLDER_ORE_PE_SAPTAMANA: '40',
  PLACEHOLDER_TIP_NORMA: 'normă întreagă',
  PLACEHOLDER_TIP_DURATA_CIM: 'nedeterminată',
  PLACEHOLDER_DURATA_LUNI_DETERMINATA: '-',
  PLACEHOLDER_PROGRAM_LUCRU: 'Normă întreagă de 8 ore/zi, 40 ore/săptămână, Luni - Vineri între 08:30 - 17:00',
  PLACEHOLDER_REPARTIZARE_PROGRAM: 'Repartizare uniformă: 8 ore/zi, 5 zile/săptămână (de luni până vineri)',
  PLACEHOLDER_CONDITII_ORE_SUPLIMENTARE: 'Se compensează cu ore libere plătite în următoarele 90 de zile calendaristice sau cu un spor la salariu de cel puțin 75% din salariul de bază conform Codului Muncii.',
  PLACEHOLDER_ORGANIZARE_SCHIMBURI: 'Nu este cazul / activitate de zi',
  PLACEHOLDER_SALARIU_BRUT: '6500 lei',
  PLACEHOLDER_DATA_PLATA: 'data de 15 a fiecărei luni pentru luna precedentă',
  PLACEHOLDER_METODA_PLATA: 'virament bancar în contul salariatului',
  PLACEHOLDER_ALTE_DREPTURI_SALARIALE: 'Tichete de masă conform Legii 165/2018, servicii medicale private',
  PLACEHOLDER_SPORURI_SALARIU: 'Nu este cazul',
  PLACEHOLDER_INDEMNIZATII_SALARIU: 'Nu este cazul',
  PLACEHOLDER_ALTE_ADAOSURI_BENEFICII: 'Tichete de masă conform Legii nr. 165/2018',
  PLACEHOLDER_ZILE_CONCEDIU: '21 de zile lucrătoare',
  PLACEHOLDER_ZILE_CONCEDIU_SUPLIMENTAR: 'Nu este cazul',
  PLACEHOLDER_ZILE_PROBA: '90 de zile calendaristice conform art. 31 alin. (1) din Legea 53/2003',
  PLACEHOLDER_CONDITII_PROBA: 'Verificarea aptitudinilor profesionale și a integrării la locul de muncă conform fișei postului',
  PLACEHOLDER_TIP_LOC_MUNCA: 'Loc de muncă stabil la adresa sediului angajatorului / punctului de lucru',
  PLACEHOLDER_DECONTARE_TRANSPORT: 'Nu este cazul / Asigurat conform regulamentului intern',
  PLACEHOLDER_ZILE_PREAVIZ_CONCEDIERE: '20 de zile lucrătoare conform art. 75 alin. (1) din Legea 53/2003',
  PLACEHOLDER_ZILE_PREAVIZ_DEMISIONARE: '20 de zile lucrătoare conform art. 81 alin. (4) din Legea 53/2003',
  PLACEHOLDER_PERIODICITATE_FORMARE: 'Cel puțin o dată la 2 ani conform art. 193 din Legea nr. 53/2003 - Codul Muncii',
  PLACEHOLDER_CONDITII_FORMARE: 'Cheltuielile cu participarea la formare profesională sunt suportate integral de angajator.',
  PLACEHOLDER_ASIGURARE_MEDICALA_PRIVATA: 'Abonament servicii medicale clinică privată suportat de angajator',
  PLACEHOLDER_PENSIE_FACULTATIVA: 'Nu este cazul',
  PLACEHOLDER_ALTE_BENEFICII_SOCIALE: 'Nu este cazul',
  PLACEHOLDER_CLAUZE_SPECIALE: 'Clauză de confidențialitate și protecție a datelor cu caracter personal',
  PLACEHOLDER_NUMAR_EXEMPLARE_CIM: '2',
  PLACEHOLDER_OBIECT_CONTRACT: 'Prestarea muncii în condițiile stabilite de prezentul contract și de fișa postului, cu plata salariului corespunzător de către angajator.',
  PLACEHOLDER_CASA_SANATATE: 'C.A.S. Municipiul București',
  PLACEHOLDER_TIP_PENSIE: 'Nu este cazul (nu beneficiază de pensie)',
};
```

2. **Adăugarea profilurilor statutare pentru Instruiri și Medicină în `resolver.ts`**:
```typescript
export const ROMANIAN_LEGAL_TRAINING_SHEETS = {
  PLACEHOLDER_DURATA_INSTRUIRE_INTRODUCTIV: '8 ore',
  PLACEHOLDER_DURATA_INSTRUIRE_LOC_MUNCA: '8 ore',
  PLACEHOLDER_DURATA_PSI_INTRODUCTIV: '8 ore',
  PLACEHOLDER_DURATA_PSI_LOC_MUNCA: '8 ore',
  PLACEHOLDER_GRUPA_SANGUINA: 'AII / Rh+',
  PLACEHOLDER_CALIFICARE_INSTRUCTOR_INTRODUCTIV: 'Specialist SSM abilitat conform HG 1425/2006',
};

export const ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH = {
  PLACEHOLDER_MEDIC_MEDICINA_MUNCII: 'Dr. Alexandrescu Victor (Medic Primar Medicina Muncii, Cabinet Atestat DSP)',
  PLACEHOLDER_TIP_EXAMEN_MEDICAL: 'la angajare',
  PLACEHOLDER_VECHIME_TOTALA: '5 ani',
  PLACEHOLDER_VECHIME_PROFESIE: '3 ani',
  PLACEHOLDER_ORE_VIDEOTERMINAL: '6-8 ore/zi',
  PLACEHOLDER_RISCURI_FIZICE: 'Zgomot sub LMA (65 dB), microclimat interior confortabil, iluminat artificial mixt',
  PLACEHOLDER_RISCURI_CHIMICE: 'Nu este cazul / Emisii reduse echipamente birotică (toner imprimantă)',
  PLACEHOLDER_RISCURI_BIOLOGICE: 'Nu este cazul',
  PLACEHOLDER_SARCINA_MUNCA: 'Poziție statică așezată preponderentă, efort vizual la videoterminale, solicitare neuropsihică la ritm ridicat',
  PLACEHOLDER_NORMATIV_EIP: 'Normativ intern aprobat conform HG 1048/2006 și Deciziei Angajatorului nr. 04/2026',
  PLACEHOLDER_ECHIPAMENT_LUCRU: 'Ținută de birou conform regulamentului intern',
  PLACEHOLDER_MATERIALE_IGIENICO_SANITARE: 'Săpun lichid, dezinfectanți, prosoape hârtie asigurate gratuit de angajator conform normelor sanitare',
  PLACEHOLDER_ALIMENTATIE_PROTECTIE: 'Nu este cazul',
};
```

3. **Includerea acestora în `ALL_ROMANIAN_LEGAL_FALLBACKS`**:
```typescript
export const ALL_ROMANIAN_LEGAL_FALLBACKS: Record<string, unknown> = {
  ...ROMANIAN_LEGAL_SSM_PROVIDER,
  ...ROMANIAN_LEGAL_DECIZII,
  ...ROMANIAN_LEGAL_IPSSM,
  ...ROMANIAN_LEGAL_TRAINING,
  ...ROMANIAN_LEGAL_TRAINING_SHEETS,
  ...ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH,
  ...ROMANIAN_LEGAL_HYGIENE,
  ...ROMANIAN_LEGAL_RISK,
  ...INCDPM_30_FACTORS,
  ...ROMANIAN_LEGAL_HR_CIM,
};
```

4. **Maparea dinamică a salariatului și angajatorului în `verifiedMap` din `resolveTemplateData`**:
```typescript
    // Date firmă suplimentare pentru CIM 2022
    PLACEHOLDER_COD_POSTAL_FIRMA: (prov?.postalCode as string) || '010001',
    PLACEHOLDER_CONT_BANCA_FIRMA: (client as any)?.bankAccount || 'RO49AAAA1B31007593840001',
    PLACEHOLDER_BANCA_FIRMA: (client as any)?.bankName || 'Banca Comercială Română',
    PLACEHOLDER_APELATIV_SALARIAT: detectRomanianSalutation(fullName, employee?.cnp),
    PLACEHOLDER_TELEFON_SALARIAT: (employee as any)?.phone || '0722123456',
    PLACEHOLDER_EMAIL_SALARIAT: (employee as any)?.email || 'salariat@client.ro',
    PLACEHOLDER_CONT_BANCA_SALARIAT: (employee as any)?.bankAccount || (employee as any)?.iban || 'RO98AAAA1B31007593840002',
    PLACEHOLDER_BANCA_SALARIAT: (employee as any)?.bankName || 'Banca Transilvania',
    PLACEHOLDER_DOMICILIU: addressFull || 'București, Sector 1, Str. Victoriei nr. 10',

    // Training Sheet Appointees
    PLACEHOLDER_NUME_INSTRUCTOR_INTRODUCTIV: ssmSpecialistName,
    PLACEHOLDER_CALIFICARE_INSTRUCTOR_INTRODUCTIV: 'Specialist SSM abilitat conform HG 1425/2006',
    PLACEHOLDER_NUME_VERIFICATOR_INTRODUCTIV: legalRepresentativeName,
    PLACEHOLDER_DATA_INSTRUIRE_INTRODUCTIV: hireDateRo,
    PLACEHOLDER_DATA_INSTRUIRE_LOC_MUNCA: hireDateRo,
    PLACEHOLDER_NUME_INSTRUCTOR_LOC_MUNCA: designatedWorker,
    PLACEHOLDER_NUME_SEF_IERARHIC: designatedWorker,
    PLACEHOLDER_DATA_ADMITERE_LUCRU: hireDateRo,
    PLACEHOLDER_NUME_AUTORIZATOR_ADMITERE: legalRepresentativeName,
    PLACEHOLDER_DATA_PSI_INTRODUCTIV: hireDateRo,
    PLACEHOLDER_DATA_PSI_LOC_MUNCA: hireDateRo,
    PLACEHOLDER_NUME_VERIFICATOR_PSI: legalRepresentativeName,
    PLACEHOLDER_DATA_SOLICITARE: hireDateRo,
    PLACEHOLDER_ACTIVITATI_POST: job?.mainActivities || 'Consultanță software, inginerie de sistem și dezvoltare de aplicații IT',
    PLACEHOLDER_ECHIPAMENTE_POST: job?.equipmentUsed || 'Laptop/stație de lucru, monitoare LED, periferice USB, imprimante de rețea',
    PLACEHOLDER_CONDITII_POST: job?.workConditions || 'Activitate de birou în spațiu climatizat, iluminat ergonomic conform normelor',
```

---

### 4.3. Actualizarea `prisma/seed.ts`

În `prisma/seed.ts`, la linia 10:
Modificați comentariul informativ pentru a reflecta oficial cele 31 de șabloane:
```typescript
  // =========================================================================
  // 0. CATALOG ȘABLOANE OFICIALE (31 ȘABLOANE STATUTARE)
  // =========================================================================
  console.log('0. Seeding Catalog Șabloane Oficiale (31 șabloane)...');
  await seedTemplates();
```

---

## 5. VERIFICATION METHOD (Metodă de Verificare Independentă)

Worker-ul va rula următoarele comenzi în terminal pentru a verifica independent implementarea:

### Pasul 1: Verificare integritate Catalog (31 șabloane)
```bash
npx tsx -e '
import { TEMPLATE_CATALOG } from "./src/lib/templates/definitions";
console.log("Total templates:", TEMPLATE_CATALOG.length);
if (TEMPLATE_CATALOG.length !== 31) {
  console.error("FAIL: Catalog does not have 31 templates!");
  process.exit(1);
} else {
  console.log("PASS: Exactly 31 templates configured.");
  const c2022 = TEMPLATE_CATALOG.find(t => t.code === "hr-cim-model-cadru-2022");
  if (!c2022) throw new Error("Missing hr-cim-model-cadru-2022!");
  console.log("PASS: hr-cim-model-cadru-2022 found with", c2022.fields.length, "fields.");
}
'
```

### Pasul 2: Verificare Seeding în PostgreSQL
```bash
npx tsx src/lib/templates/seed.ts
```
*Ieșire așteptată*:
```
Seeding 31 templates into PostgreSQL...
Successfully synced 31 templates in database.
```

### Pasul 3: Verificare Rezolvare Placeholder-e pentru `hr-cim-model-cadru-2022`
```bash
npx tsx -e '
import { prisma } from "./src/lib/prisma";
import { resolveTemplatePlaceholders } from "./src/lib/templates/resolver";

async function test() {
  const client = await prisma.client.findFirst({ where: { cui: "RO38765432" } });
  if (!client) throw new Error("Client missing");
  const res = await resolveTemplatePlaceholders({
    templateCode: "hr-cim-model-cadru-2022",
    clientId: client.id,
  });
  console.log("Template:", res.template.name);
  console.log("Resolved fields count:", res.fields.length);
  console.log("Sample CIM tokens:");
  console.log(" - PLACEHOLDER_CONDITII_PROBA:", res.resolvedData.PLACEHOLDER_CONDITII_PROBA);
  console.log(" - PLACEHOLDER_PERIODICITATE_FORMARE:", res.resolvedData.PLACEHOLDER_PERIODICITATE_FORMARE);
  console.log(" - PLACEHOLDER_METODA_PLATA:", res.resolvedData.PLACEHOLDER_METODA_PLATA);
  console.log(" - PLACEHOLDER_ASIGURARE_MEDICALA_PRIVATA:", res.resolvedData.PLACEHOLDER_ASIGURARE_MEDICALA_PRIVATA);
  console.log("SUCCESS!");
}
test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
'
```

### Pasul 4: Verificare Compilare TypeScript & Next.js Build
```bash
npm run build
```
*Criteriu de acceptare*: Build-ul Next.js 15 cu Turbopack se compilează cu 0 erori (`exit code 0`).
