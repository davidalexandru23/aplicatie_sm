# HANDOFF REPORT — m2_p2_explorer_1

**Milestone**: M2 (Extinderea Catalogului la 31 Șabloane Statutare)  
**Task Scope**: F7 (`ssm-fisa-instruire-individuala`) & F8 (`psi-fisa-instructaj-individuala`)  
**Target Recipient**: Orchestrator (`d4389872-2ec2-44c4-b4b6-52d9b0f4a82d`) and M2 Worker Agent  
**Date**: 2026-11-05

---

## 1. Observation

### 1.1 Statutory Legal Framework
1. **F7: Fișă de Instruire Individuală SSM**
   - **Baza legală**: Legea securității și sănătății în muncă nr. 319/2006 (art. 20) și Normele metodologice aprobate prin **Hotărârea Guvernului nr. 1425/2006** (art. 74–100, modificată prin HG 955/2010 și HG 259/2022).
   - **Formular oficial**: **Anexa nr. 11 la Normele metodologice** („Fișă de instruire individuală privind securitatea și sănătatea în muncă”).
   - **Secțiuni statutare obligatorii**:
     1. *Antet și identificare angajator*: Denumire firmă, adresă, CUI/CIF, Nr. Reg. Com.
     2. *Date de identificare ale lucrătorului*: Nume, prenume, legitimație/marcă, grupă sanguină, domiciliu, data și locul nașterii, act de identitate (tip, serie, număr, CNP), calificare, funcție/meserie (cod COR), locul de muncă (punct de lucru / atelier / departament), autorizații speciale deținute (ISCIR/ANRE), traseul de deplasare la/de la serviciu (itinerar, mijloace transport, durată estimată – cerință directă conform art. 30 alin. (1) lit. g din Legea 319/2006 pentru accidente de traseu).
     3. *Instruirea introductiv-generală*: Data, durata (minim 8 ore sau durata stabilită prin decizie internă), persoana care a efectuat instruirea (Specialist SSM / Serviciu Extern abilitat), conținutul instruirii (tematica), semnătura celui instruit, semnătura instructorului, semnătura verificatorului însușirii cunoștințelor.
     4. *Instruirea la locul de muncă*: Data, durata (minim 8 ore), locul de muncă / postul, persoana care a efectuat instruirea (conducătorul locului de muncă), conținutul instruirii (IPSSM specifice, riscuri, EIP, echipamente), semnătura celui instruit, semnătura instructorului, semnătura verificatorului.
     5. *Admiterea la lucru*: Nume și prenume conducător ierarhic superior / administrator, data admiterii, semnătura conducătorului.
     6. *Instruirea periodică (tabel multianual)*: Coloane: Nr. crt., Data instruirii, Durata (ore), Ocupația/funcția, Materialul predat/tematica parcursă, Semnătura celui instruit, Semnătura celui care a efectuat instruirea, Semnătura celui care a verificat instruirea.
     7. *Instruirea periodică suplimentară*: Cazuri speciale conform art. 98 HG 1425/2006 (după ITM > 30 zile, după accident de muncă, modificări tehnologice).
     8. *Rezultatele verificării cunoștințelor / Testări*: Data testării, tip testare, tematică examinată, calificativ/notă, semnătură examinator, semnătură lucrător.
     9. *Evidență accidente de muncă / boli profesionale*.
     10. *Sancțiuni aplicate pe linie de SSM*.
     11. *Evidență control medical periodic de medicina muncii* (data, unitate medicală, concluzie fișă aptitudine).

2. **F8: Fișă Individuală de Instructaj în Domeniul Situațiilor de Urgență (PSI/SU)**
   - **Baza legală**: Legea nr. 307/2006 privind apărarea împotriva incendiilor (art. 19 lit. e) și **Ordinul Ministrului Administrației și Internelor nr. 712/2005** pentru aprobarea Dispozițiilor generale privind instruirea salariaților în domeniul situațiilor de urgență (art. 15–50, modificat și completat prin OMAI nr. 786/2005).
   - **Formular oficial**: **Anexa la Dispozițiile generale (OMAI 712/2005)**.
   - **Secțiuni statutare obligatorii**:
     1. *Antet și identificare*: Operator economic / Instituție, Nume și prenume salariat, Data și locul nașterii, Domiciliul, Locul de muncă, Funcția/ocupația (cod COR).
     2. *Instructajul introductiv general*: Data, durata (minim 8 ore conform art. 27 OMAI 712/2005), persoana care a efectuat instructajul (Cadru tehnic cu atribuții PSI / Responsabil SU), conținutul instructajului (Legea 307/2006, OMAI 163/2007, reguli generale PSI, evacuare), semnătura salariatului, semnătura instructorului, semnătura verificatorului.
     3. *Instructajul specific locului de muncă*: Data, durata (minim 8 ore), locul de muncă, persoana care a efectuat instructajul (conducătorul locului de muncă), tematica predată (măsuri PSI specifice, surse aprindere, stingătoare, căi evacuare), semnătura salariatului, semnătura instructorului, semnătura verificatorului.
     4. *Admiterea la lucru*: Nume conducător, data, semnătură.
     5. *Instructajul periodic (tabel multianual)*: Coloane: Nr. crt., Data instructajului, Durata (ore - minim 2 ore conform art. 36 OMAI 712/2005), Tema predată / materialul parcurs, Semnătura persoanei instruite, Semnătura persoanei care a instruit, Semnătura persoanei care a verificat.
     6. *Exerciții practice și aplicații privind situațiile de urgență (Simulări)*: Data, tipul exercițiului (evacuare / intervenție stingere), scenariul/tema, calificativ obținut, semnătură salariat, semnătură conducător exercițiu.
     7. *Instructajul special pentru lucrări periculoase*: Lucrări cu foc deschis / Permis de lucru cu foc, data, măsuri speciale, semnături.
     8. *Verificarea anuală a cunoștințelor PSI*: Data, tematica verificată, calificativ/notă, examinator, semnătură salariat.

### 1.2 Codebase & Engine Observations
1. **`src/lib/templates/definitions.ts`**:
   - Conține interfețele `TemplateFieldDef`, `TemplateCollectionDef` și `TemplateDefinition`.
   - În prezent catalogul conține 25 de șabloane. M2 adaugă 6 șabloane (F7-F11) pentru a atinge 31 de șabloane.
   - `collections?: TemplateCollectionDef[]` este definit ca tip, dar nu a fost încă utilizat de primele 25 de șabloane. F7 și F8 sunt primele șabloane care utilizează tabele multianuale dinamice.

2. **`src/lib/templates/generator.ts`**:
   - Liniile 70-76: `collectUnresolvedPlaceholders` extrage `/PLACEHOLDER_[A-Z0-9_]+/g`. Dacă un token din fișierul generat se potrivește cu acest regex și nu a fost înlocuit, suita de teste îl marchează ca unmapped și eșuează testul (`unmapped.length > 0`).
   - Liniile 328-333: `new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: (part) => (part.value ? '{' + part.value + '}' : '') })`.
   - Liniile 335-339:
     ```typescript
     const renderData = Object.fromEntries(
       Object.entries(data).filter(([key, value]) =>
         !key.startsWith('PLACEHOLDER_') || (value !== undefined && value !== null && String(value).trim() !== '')
       )
     );
     ```
     Dacă o proprietate din `data` NU începe cu `PLACEHOLDER_` (de ex. `instruiriPeriodiceSSM` sau `instructajePeriodicePSI`), este inclusă în `renderData` chiar dacă este un array de obiecte.
   - Liniile 193-228: `validateMissingFields(t.fields, mergedData)` verifică câmpurile marcate cu `required: true`.

3. **`scripts/test-all-templates-generation.ts` & `scripts/verify-all.ts`**:
   - Suitele testează generarea automată a fiecărui șablon din `TEMPLATE_CATALOG`.
   - Reguli de aur de validare:
     - `repLegalOk`: Dacă șablonul include `PLACEHOLDER_REPREZENTANT_LEGAL`, acesta trebuie să fie Munteanu Cristian (reprezentantul legal al clientului) și **NICIODATĂ** salariatul (Stan Alexandru).
     - `missingDataStatus === 'approved_for_print'`: Toate câmpurile `required: true` trebuie să aibă valori nevide.
     - `unmappedInFile.length === 0`: Niciun token `PLACEHOLDER_*` rezidual nu are voie să rămână în documentul generat.

---

## 2. Logic Chain

```
[Statutory Annexes HG 1425/2006 Anexa 11 & OMAI 712/2005 Anexa]
                           │
                           ▼
[Physical Reality: Training sheets are multi-year physical booklets kept by managers]
                           │
                           ▼
[Requirement: Printable blank rows for pen-signing + Dynamic pre-fill for existing events]
                           │
                           ▼
[Docxtemplater Engine Architecture: Loop tags `{#rows}` in <w:tc> 1 to `{/rows}` in <w:tc> N]
                           │
                           ▼
[Zero-Unmapped-Token Rule: Loop inner variables use camelCase (e.g. `{nr}`, `{data}`),
 avoiding `/PLACEHOLDER_[A-Z0-9_]+/` regex match if a cell is blank]
                           │
                           ▼
[Resolver Padding Strategy: Resolver guarantees 16-20 rows by pre-filling recorded events
 and padding remainder with clean blank strings, ensuring flawless grid output]
```

### Justificare pas cu pas:
1. **De ce abordare hibridă (Tokenuri `{PLACEHOLDER_*}` + Tabele de tip Loop `{#...}`)**:
   Dacă s-ar folosi tokenuri statice numerotate (de ex. `{PLACEHOLDER_DATA_PERIODIC_01}` până la `_20`), un salariat nou ar avea rândurile 1-20 necompletate. Deoarece `generator.ts` filtrează valorile vide și păstrează tokenurile nerezolvate, fișierul generat ar conține 140 de tokenuri `{PLACEHOLDER_...}` vizibile pe foaie, iar suita de teste ar eșua instantaneu (`unmappedInFile.length = 140 > 0`).
2. **De ce buclele docxtemplater `{#instruiriPeriodiceSSM}` rezolvă problema**:
   Docxtemplater suportă duplicarea rândurilor de tabel dacă tag-ul de deschidere `{#instruiriPeriodiceSSM}` se află în prima celulă a rândului, iar tag-ul de închidere `{/instruiriPeriodiceSSM}` se află în ultima celulă a aceluiași rând. Variabilele din celule (`{nr}`, `{data}`, `{durata}`, `{ocupatia}`, `{tematica}`, `{semnaturaInstruit}`, `{semnaturaInstructor}`, `{semnaturaVerificator}`) nu se potrivesc cu regexul `/PLACEHOLDER_[A-Z0-9_]+/g`. Când celulele sunt goale (pentru completare ulterioară cu pixul), docxtemplater le înlocuiește cu șiruri vide, lăsând căsuțele goale și curate, cu chenar Word.
3. **De ce resolverul trebuie să facă padding la 16–20 de rânduri**:
   Dacă resolverul ar transmite un array gol `[]` pentru un salariat nou, docxtemplater ar șterge rândul tabelului, lăsând doar antetul tabelului. În practică, un carnet de protecția muncii tipărit fără rânduri goale este inutilizabil și neconform la controlul ITM/ISU. Prin urmare, `resolver.ts` va transmite întotdeauna cel puțin 16 rânduri (evenimente din DB + rânduri de completare).

---

## 3. Caveats

1. **Durate minime statutare**:
   - Conform HG 1425/2006 art. 85, durata instruirii introductiv-generale și la locul de muncă este de cel puțin 8 ore fiecare (pentru personal operativ) sau conform deciziei interne (minim 1 oră). În resolver setăm default-ul la `8 ore` pentru a asigura conformitate maximă la inspecție.
   - Conform OMAI 712/2005 art. 27 & 36, durata instructajului introductiv general PSI este de minim 8 ore, iar a instructajului periodic PSI este de minim 2 ore.
2. **Semnături olografe vs electronice**:
   - Deși HG 259/2022 permite fișe de instruire în format electronic cu semnătură electronică calificată, marea majoritate a companiilor românești tipăresc fișa din sistem și o semnează olograf cu pixul. Documentul generat trebuie să fie perfect lizibil la tipărire, cu spații generoase pentru semnături olografe.
3. **Amplasare fișiere**:
   - Conform arhitecturii proiectului, fișierele DOCX trebuie plasate atât în `templates_registry/normalized/`, cât și în `handoff/ssm-template-placeholder-pack/templates/`.

---

## 4. Conclusion & Actionable Blueprints for Worker

Worker-ul M2 trebuie să implementeze următoarele 3 livrabile:
1. Crearea fișierelor DOCX:
   - `templates_registry/normalized/ssm-fisa-instruire-individuala.docx`
   - `templates_registry/normalized/psi-fisa-instructaj-individuala.docx`
   (și oglindirea lor în `handoff/ssm-template-placeholder-pack/templates/`).
2. Adăugarea definițiilor TypeScript complete în `src/lib/templates/definitions.ts`.
3. Adăugarea rezoluției datelor și generării tabelelor padded în `src/lib/templates/resolver.ts`.

Mai jos sunt specificațiile tehnice complete, gata de copiat/implementat de către Worker.

### 4.1 Schema TypeScript pentru `definitions.ts`

```typescript
// ============================================================================
// F7: Fișă Individuală de Instruire SSM (Anexa 11 HG 1425/2006)
// ============================================================================
{
  code: 'ssm-fisa-instruire-individuala',
  name: 'Fișă Individuală de Instruire SSM (Anexa 11 HG 1425/2006)',
  family: 'training',
  originalFilename: 'ssm-fisa-instruire-individuala.docx',
  normalizedFilename: 'ssm-fisa-instruire-individuala.docx',
  format: 'docx',
  contextLevel: 'employee',
  status: 'mapped',
  version: 1,
  description: 'Fișa individuală de instruire în domeniul securității și sănătății în muncă conform modelului legal din Anexa 11 la HG 1425/2006. Conține datele de identificare ale lucrătorului, traseul de deplasare, instruirea introductiv-generală, instruirea la locul de muncă, admiterea la lucru și tabelul multianual pentru instruirile periodice și testări.',
  reviewer: 'Specialist SSM',
  fields: [
    // 1. Antet & Angajator
    { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator', source: 'client.name', required: true, type: 'string' },
    { key: 'PLACEHOLDER_CUI', label: 'CUI / CIF firmă', source: 'client.cui', required: true, type: 'string' },
    { key: 'PLACEHOLDER_NR_REG_COM', label: 'Nr. Registrul Comerțului', source: 'client.regCom', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Sediu social angajator', source: 'client.address', required: true, type: 'string' },
    { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant Legal / Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },

    // 2. Lucrător (Date de identificare)
    { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume lucrător', source: 'employee.fullName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_NUME', label: 'Nume lucrător', source: 'employee.lastName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_PRENUME', label: 'Prenume lucrător', source: 'employee.firstName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_MARCA', label: 'Marca / Legitimația / Nr. dosar', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_GRUPA_SANGUINA', label: 'Grupa sanguină', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_DOMICILIU', label: 'Adresă domiciliu lucrător', source: 'employee.residenceAddress', required: true, type: 'string' },
    { key: 'PLACEHOLDER_DATA_NASTERII', label: 'Data nașterii lucrător', source: 'employee.birthDate', required: true, type: 'string' },
    { key: 'PLACEHOLDER_LOCALITATE_NASTERII', label: 'Localitate naștere', source: 'employee.birthPlace', required: true, type: 'string' },
    { key: 'PLACEHOLDER_JUDET_NASTERII', label: 'Județ / sector naștere', source: 'employee.birthCounty', required: false, type: 'string' },
    { key: 'PLACEHOLDER_TIP_ACT', label: 'Tip act de identitate', source: 'employee.identityDocument.docType', required: true, type: 'string' },
    { key: 'PLACEHOLDER_SERIE_ACT', label: 'Serie act identitate', source: 'employee.identityDocument.series', required: true, type: 'string' },
    { key: 'PLACEHOLDER_NUMAR_ACT', label: 'Număr act identitate', source: 'employee.identityDocument.number', required: true, type: 'string' },
    { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)', source: 'employee.cnp', required: true, type: 'string' },
    { key: 'PLACEHOLDER_CALIFICARE', label: 'Calificarea / Pregătirea profesională', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcția / Ocupația', source: 'job.title', required: true, type: 'string' },
    { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR funcție', source: 'job.corCode', required: false, type: 'string' },
    { key: 'PLACEHOLDER_LOC_MUNCA', label: 'Locul de muncă / Punctul de lucru', source: 'worksite.name', required: true, type: 'string' },
    { key: 'PLACEHOLDER_AUTORIZATII', label: 'Autorizații deținute (ISCIR, taloane)', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_TRASEU_DEPLASARE', label: 'Traseul normal de deplasare la/de la serviciu', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_DURATA_TRASEU', label: 'Durata estimată deplasare traseu', source: 'manual', required: false, type: 'string' },

    // 3. Instruirea Introductiv-Generală (IG)
    { key: 'PLACEHOLDER_DATA_INSTRUIRE_IG', label: 'Data instruirii introductiv-generale', source: 'employee.hireDate', required: true, type: 'string' },
    { key: 'PLACEHOLDER_DURATA_INSTRUIRE_IG', label: 'Durata instruirii introductiv-generale', source: 'manual', required: true, type: 'string' },
    { key: 'PLACEHOLDER_INSTRUCTOR_IG', label: 'Instructor SSM (Nume și funcție)', source: 'client.ssmSpecialistName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_TEMATICA_IG', label: 'Conținutul instruirii IG (materialul predat)', source: 'manual', required: true, type: 'string' },
    { key: 'PLACEHOLDER_VERIFICATOR_IG', label: 'Verificator însușire cunoștințe IG', source: 'client.ssmSpecialistName', required: true, type: 'string' },

    // 4. Instruirea la Locul de Muncă (LM)
    { key: 'PLACEHOLDER_DATA_INSTRUIRE_LM', label: 'Data instruirii la locul de muncă', source: 'employee.hireDate', required: true, type: 'string' },
    { key: 'PLACEHOLDER_DURATA_INSTRUIRE_LM', label: 'Durata instruirii la locul de muncă', source: 'manual', required: true, type: 'string' },
    { key: 'PLACEHOLDER_LOC_MUNCA_LM', label: 'Locul de muncă / Postul instruit', source: 'worksite.name', required: true, type: 'string' },
    { key: 'PLACEHOLDER_INSTRUCTOR_LM', label: 'Conducătorul locului de muncă care a instruit', source: 'manual', required: true, type: 'string' },
    { key: 'PLACEHOLDER_TEMATICA_LM', label: 'Conținutul instruirii LM (material predat)', source: 'manual', required: true, type: 'string' },
    { key: 'PLACEHOLDER_VERIFICATOR_LM', label: 'Persoana care a verificat instruirea LM', source: 'client.ssmSpecialistName', required: true, type: 'string' },

    // 5. Admiterea la Lucru
    { key: 'PLACEHOLDER_DATA_ADMITERE', label: 'Data admiterii la lucru', source: 'employee.hireDate', required: true, type: 'string' },
    { key: 'PLACEHOLDER_ADMITERE_NUME', label: 'Conducător ierarhic care a aprobat admiterea', source: 'client.legalRepresentative', required: true, type: 'string' },
  ],
  collections: [
    {
      key: 'instruiriPeriodiceSSM',
      label: 'Evidența Instruirilor Periodice SSM',
      source: 'trainingEvents',
      fields: [
        { key: 'nr', label: 'Nr. crt.', source: 'index', required: false, type: 'number' },
        { key: 'data', label: 'Data instruirii', source: 'event.eventDate', required: false, type: 'string' },
        { key: 'durata', label: 'Durata (ore)', source: 'event.durationHours', required: false, type: 'string' },
        { key: 'ocupatia', label: 'Ocupația / Funcția', source: 'employee.job.title', required: false, type: 'string' },
        { key: 'tematica', label: 'Materialul predat', source: 'event.materialOrTopic', required: false, type: 'string' },
        { key: 'semnaturaInstruit', label: 'Semnătură instruit', source: 'manual', required: false, type: 'string' },
        { key: 'semnaturaInstructor', label: 'Semnătură instructor', source: 'event.instructorName', required: false, type: 'string' },
        { key: 'semnaturaVerificator', label: 'Semnătură verificator', source: 'event.verifierName', required: false, type: 'string' },
      ],
    },
    {
      key: 'instruiriSuplimentareSSM',
      label: 'Instruiri Periodice Suplimentare SSM',
      source: 'trainingEvents',
      fields: [
        { key: 'nr', label: 'Nr. crt.', source: 'index', required: false, type: 'number' },
        { key: 'data', label: 'Data', source: 'event.eventDate', required: false, type: 'string' },
        { key: 'durata', label: 'Durata (ore)', source: 'event.durationHours', required: false, type: 'string' },
        { key: 'cauza', label: 'Motivul / Cauza instruirii suplimentare', source: 'manual', required: false, type: 'string' },
        { key: 'tematica', label: 'Materialul predat', source: 'event.materialOrTopic', required: false, type: 'string' },
        { key: 'semnaturaInstruit', label: 'Semnătură instruit', source: 'manual', required: false, type: 'string' },
        { key: 'semnaturaInstructor', label: 'Semnătură instructor', source: 'event.instructorName', required: false, type: 'string' },
        { key: 'semnaturaVerificator', label: 'Semnătură verificator', source: 'event.verifierName', required: false, type: 'string' },
      ],
    },
    {
      key: 'testariSSM',
      label: 'Rezultatele Testărilor Periodice SSM',
      source: 'manual',
      fields: [
        { key: 'data', label: 'Data testării', source: 'manual', required: false, type: 'string' },
        { key: 'tipTestare', label: 'Tipul testării (anuală / la reluare)', source: 'manual', required: false, type: 'string' },
        { key: 'tematica', label: 'Materialul examinat', source: 'manual', required: false, type: 'string' },
        { key: 'rezultat', label: 'Calificativ / Notă', source: 'manual', required: false, type: 'string' },
        { key: 'examinator', label: 'Examinator (Nume și funcție)', source: 'manual', required: false, type: 'string' },
        { key: 'semnaturaLucrator', label: 'Semnătură lucrător', source: 'manual', required: false, type: 'string' },
      ],
    },
  ],
}

// ============================================================================
// F8: Fișă Individuală de Instructaj PSI/SU (Anexa OMAI 712/2005)
// ============================================================================
{
  code: 'psi-fisa-instructaj-individuala',
  name: 'Fișă Individuală de Instructaj PSI/SU (Anexa OMAI 712/2005)',
  family: 'training',
  originalFilename: 'psi-fisa-instructaj-individuala.docx',
  normalizedFilename: 'psi-fisa-instructaj-individuala.docx',
  format: 'docx',
  contextLevel: 'employee',
  status: 'mapped',
  version: 1,
  description: 'Fișa individuală de instructaj în domeniul situațiilor de urgență conform modelului stabilit prin Anexa la OMAI 712/2005 (modificat prin OMAI 786/2005). Include instructajul introductiv general, specific locului de muncă, admiterea la lucru, instructajul periodic, exerciții practice/simulări și verificarea cunoștințelor.',
  reviewer: 'Cadru Tehnic PSI',
  fields: [
    // 1. Antet & Angajator
    { key: 'PLACEHOLDER_FIRMA', label: 'Operator economic / Angajator', source: 'client.name', required: true, type: 'string' },
    { key: 'PLACEHOLDER_CUI', label: 'CUI / CIF firmă', source: 'client.cui', required: true, type: 'string' },
    { key: 'PLACEHOLDER_NR_REG_COM', label: 'Nr. Registrul Comerțului', source: 'client.regCom', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Sediul operatorului economic', source: 'client.address', required: true, type: 'string' },
    { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant Legal / Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },

    // 2. Date Lucrător
    { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_NUME', label: 'Nume salariat', source: 'employee.lastName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_PRENUME', label: 'Prenume salariat', source: 'employee.firstName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_CNP', label: 'CNP salariat', source: 'employee.cnp', required: true, type: 'string' },
    { key: 'PLACEHOLDER_DATA_NASTERII', label: 'Data nașterii', source: 'employee.birthDate', required: true, type: 'string' },
    { key: 'PLACEHOLDER_LOCALITATE_NASTERII', label: 'Localitate naștere', source: 'employee.birthPlace', required: true, type: 'string' },
    { key: 'PLACEHOLDER_JUDET_NASTERII', label: 'Județ naștere', source: 'employee.birthCounty', required: false, type: 'string' },
    { key: 'PLACEHOLDER_DOMICILIU', label: 'Adresă domiciliu salariat', source: 'employee.residenceAddress', required: true, type: 'string' },
    { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcția / Ocupația', source: 'job.title', required: true, type: 'string' },
    { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR funcție', source: 'job.corCode', required: false, type: 'string' },
    { key: 'PLACEHOLDER_LOC_MUNCA', label: 'Locul de muncă / Obiectivul', source: 'worksite.name', required: true, type: 'string' },

    // 3. Instructajul Introductiv General PSI/SU
    { key: 'PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI', label: 'Data instructajului introductiv general PSI', source: 'employee.hireDate', required: true, type: 'string' },
    { key: 'PLACEHOLDER_DURATA_INSTRUCTAJ_IG_PSI', label: 'Durata instructajului introductiv general PSI', source: 'manual', required: true, type: 'string' },
    { key: 'PLACEHOLDER_INSTRUCTOR_IG_PSI', label: 'Persoana care a efectuat instructajul IG PSI', source: 'client.psiResponder', required: true, type: 'string' },
    { key: 'PLACEHOLDER_TEMATICA_IG_PSI', label: 'Tematica instructajului introductiv general PSI', source: 'manual', required: true, type: 'string' },
    { key: 'PLACEHOLDER_VERIFICATOR_IG_PSI', label: 'Persoana care a verificat cunoștințele IG PSI', source: 'client.psiResponder', required: true, type: 'string' },

    // 4. Instructajul Specific Locului de Muncă PSI/SU
    { key: 'PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI', label: 'Data instructajului specific locului de muncă PSI', source: 'employee.hireDate', required: true, type: 'string' },
    { key: 'PLACEHOLDER_DURATA_INSTRUCTAJ_LM_PSI', label: 'Durata instructajului specific locului de muncă PSI', source: 'manual', required: true, type: 'string' },
    { key: 'PLACEHOLDER_LOC_MUNCA_LM_PSI', label: 'Locul de muncă instruit PSI', source: 'worksite.name', required: true, type: 'string' },
    { key: 'PLACEHOLDER_INSTRUCTOR_LM_PSI', label: 'Conducătorul locului de muncă care a instruit PSI', source: 'manual', required: true, type: 'string' },
    { key: 'PLACEHOLDER_TEMATICA_LM_PSI', label: 'Tematica instructajului specific LM PSI', source: 'manual', required: true, type: 'string' },
    { key: 'PLACEHOLDER_VERIFICATOR_LM_PSI', label: 'Persoana care a verificat cunoștințele LM PSI', source: 'client.psiResponder', required: true, type: 'string' },

    // 5. Admiterea la Lucru PSI
    { key: 'PLACEHOLDER_DATA_ADMITERE_PSI', label: 'Data admiterii la lucru PSI', source: 'employee.hireDate', required: true, type: 'string' },
    { key: 'PLACEHOLDER_ADMITERE_NUME_PSI', label: 'Conducătorul care a aprobat admiterea la lucru PSI', source: 'client.legalRepresentative', required: true, type: 'string' },
  ],
  collections: [
    {
      key: 'instructajePeriodicePSI',
      label: 'Evidența Instructajelor Periodice în Domeniul Situațiilor de Urgență',
      source: 'trainingEvents',
      fields: [
        { key: 'nr', label: 'Nr. crt.', source: 'index', required: false, type: 'number' },
        { key: 'data', label: 'Data instructajului', source: 'event.eventDate', required: false, type: 'string' },
        { key: 'durata', label: 'Durata (ore)', source: 'event.durationHours', required: false, type: 'string' },
        { key: 'tema', label: 'Tema predată / Materialul predat', source: 'event.materialOrTopic', required: false, type: 'string' },
        { key: 'semnaturaInstruit', label: 'Semnătură instruit', source: 'manual', required: false, type: 'string' },
        { key: 'semnaturaInstructor', label: 'Semnătură instructor', source: 'event.instructorName', required: false, type: 'string' },
        { key: 'semnaturaVerificator', label: 'Semnătură verificator', source: 'event.verifierName', required: false, type: 'string' },
      ],
    },
    {
      key: 'exercitiiPracticePSI',
      label: 'Evidența Exercițiilor Practice și Aplicațiilor de Evacuare/Intervenție',
      source: 'manual',
      fields: [
        { key: 'nr', label: 'Nr. crt.', source: 'index', required: false, type: 'number' },
        { key: 'data', label: 'Data', source: 'manual', required: false, type: 'string' },
        { key: 'tipExercitiu', label: 'Tipul exercițiului', source: 'manual', required: false, type: 'string' },
        { key: 'tema', label: 'Tema / Scenariul exercițiului', source: 'manual', required: false, type: 'string' },
        { key: 'calificativ', label: 'Calificativ / Concluzii', source: 'manual', required: false, type: 'string' },
        { key: 'semnaturaParticipant', label: 'Semnătură participant', source: 'manual', required: false, type: 'string' },
        { key: 'semnaturaConducator', label: 'Semnătură conducător exercițiu', source: 'manual', required: false, type: 'string' },
      ],
    },
  ],
}
```

---

### 4.2 Blueprint Rezolvare Date în `src/lib/templates/resolver.ts`

Worker-ul va introduce în `resolveTemplatePlaceholders` din `src/lib/templates/resolver.ts`:

1. **Pentru `ssm-fisa-instruire-individuala`**:
```typescript
// 1. Valori implicite statutare pentru instruire SSM
const hireDateRo = employee?.hireDate ? formatDateRo(employee.hireDate) : currentDateRo;
const ssmInstructor = client?.ssmSpecialistName || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SPECIALIST_SSM;
const ssmVerifier = client?.legalRepresentative || ssmInstructor;
const defaultTematicaIG = "Legislația de securitate și sănătate în muncă (Legea nr. 319/2006, HG nr. 1425/2006); Drepturile și obligațiile lucrătorilor; Riscuri generale de accidentare și îmbolnăvire profesională specifice activității; Măsuri generale de prevenire și protecție; Acordarea primului ajutor în caz de accidentare; Conduita în caz de pericol grav și iminent.";
const defaultTematicaLM = `Instrucțiuni proprii de securitate a muncii specifice postului de ${job?.title || 'Personal TESA'}; Riscuri specifice locului de muncă; Măsuri concrete de prevenire la postul de lucru; Exploatarea în condiții de siguranță a echipamentelor de muncă; Dotarea, păstrarea și utilizarea echipamentului individual de protecție (EIP); Planul de prevenire și protecție.`;

// 2. Mapare tabel periodic multianual (minim 16 rânduri garantate)
const ssmEvents = (client?.trainingEvents || []).filter(e => e.type === 'periodic' || e.type === 'ssm');
const TARGET_SSM_ROWS = 16;
const instruiriPeriodiceSSM = [];

for (let i = 0; i < TARGET_SSM_ROWS; i++) {
  const ev = ssmEvents[i];
  if (ev) {
    instruiriPeriodiceSSM.push({
      nr: i + 1,
      data: formatDateRo(ev.eventDate),
      durata: `${ev.durationHours || 2} ore`,
      ocupatia: job?.title || 'Personal TESA',
      tematica: ev.materialOrTopic || 'Instruire periodică SSM conform tematicii anuale aprobate',
      semnaturaInstruit: '',
      semnaturaInstructor: ev.instructorName || ssmInstructor,
      semnaturaVerificator: ev.verifierName || ssmVerifier,
    });
  } else {
    // Padded blank row for pen signing
    instruiriPeriodiceSSM.push({
      nr: i + 1,
      data: '',
      durata: '',
      ocupatia: '',
      tematica: '',
      semnaturaInstruit: '',
      semnaturaInstructor: '',
      semnaturaVerificator: '',
    });
  }
}

// 3. Instruiri suplimentare și testări
const instruiriSuplimentareSSM = Array.from({ length: 4 }, (_, i) => ({
  nr: i + 1, data: '', durata: '', cauza: '', tematica: '', semnaturaInstruit: '', semnaturaInstructor: '', semnaturaVerificator: '',
}));
const testariSSM = Array.from({ length: 4 }, () => ({
  data: '', tipTestare: '', tematica: '', rezultat: '', examinator: '', semnaturaLucrator: '',
}));
```

2. **Pentru `psi-fisa-instructaj-individuala`**:
```typescript
const psiInstructor = client?.psiResponder || ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_PSI;
const psiVerifier = client?.legalRepresentative || psiInstructor;
const defaultTematicaIG_PSI = "Legislația specifică apărării împotriva incendiilor și protecției civile (Legea nr. 307/2006, OMAI nr. 712/2005, OMAI nr. 163/2007); Reguli generale de prevenire a incendiilor; Procedura de alertare și evacuare în caz de incendiu; Utilizarea mijloacelor de primă intervenție (stingătoare de incendiu cu pulbere P6 și CO2); Căi de evacuare și salvare.";
const defaultTematicaLM_PSI = `Instrucțiuni de apărare împotriva incendiilor specifice postului de ${job?.title || 'Personal TESA'}; Surse potențiale de aprindere și măsuri de prevenire; Exploatarea sigură a echipamentelor electrice și de birou; Localizarea stingătoarelor și a hidranților interiori; Schema și traseele de evacuare; Reguli la terminarea programului de lucru.`;

// Tabel periodic multianual PSI (minim 16 rânduri garantate)
const psiEvents = (client?.trainingEvents || []).filter(e => e.type === 'psi' || e.type === 'su');
const TARGET_PSI_ROWS = 16;
const instructajePeriodicePSI = [];

for (let i = 0; i < TARGET_PSI_ROWS; i++) {
  const ev = psiEvents[i];
  if (ev) {
    instructajePeriodicePSI.push({
      nr: i + 1,
      data: formatDateRo(ev.eventDate),
      durata: `${ev.durationHours || 2} ore`,
      tema: ev.materialOrTopic || 'Instructaj periodic PSI conform tematicii anuale',
      semnaturaInstruit: '',
      semnaturaInstructor: ev.instructorName || psiInstructor,
      semnaturaVerificator: ev.verifierName || psiVerifier,
    });
  } else {
    instructajePeriodicePSI.push({
      nr: i + 1,
      data: '',
      durata: '',
      tema: '',
      semnaturaInstruit: '',
      semnaturaInstructor: '',
      semnaturaVerificator: '',
    });
  }
}

const exercitiiPracticePSI = Array.from({ length: 4 }, (_, i) => ({
  nr: i + 1, data: '', tipExercitiu: '', tema: '', calificativ: '', semnaturaParticipant: '', semnaturaConducator: '',
}));
```

---

### 4.3 Structură Tabele OpenXML pentru Generarea Fișierelor DOCX

Pentru a asigura că docxtemplater expandează tabelele fără nicio eroare de parsare sau corupere a documentului:

1. **Rândul repetat în tabelul de Instruire Periodică SSM**:
```xml
<w:tr>
  <w:tc>
    <w:tcPr><w:tcW w:w="450" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{#instruiriPeriodiceSSM}{nr}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{data}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="700" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{durata}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1600" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t>{ocupatia}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t>{tematica}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1100" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{semnaturaInstruit}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1100" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{semnaturaInstructor}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1100" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{semnaturaVerificator}{/instruiriPeriodiceSSM}</w:t></w:r></w:p>
  </w:tc>
</w:tr>
```

2. **Rândul repetat în tabelul de Instructaj Periodic PSI**:
```xml
<w:tr>
  <w:tc>
    <w:tcPr><w:tcW w:w="500" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{#instructajePeriodicePSI}{nr}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1300" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{data}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{durata}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="4250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t>{tema}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{semnaturaInstruit}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{semnaturaInstructor}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{semnaturaVerificator}{/instructajePeriodicePSI}</w:t></w:r></w:p>
  </w:tc>
</w:tr>
```

---

## 5. Verification Method

Worker-ul va verifica implementarea prin următorii pași preciși:

1. **Verificarea integrității fișierelor pe disc**:
   ```bash
   ls -la templates_registry/normalized/ssm-fisa-instruire-individuala.docx
   ls -la templates_registry/normalized/psi-fisa-instructaj-individuala.docx
   ls -la handoff/ssm-template-placeholder-pack/templates/ssm-fisa-instruire-individuala.docx
   ls -la handoff/ssm-template-placeholder-pack/templates/psi-fisa-instructaj-individuala.docx
   ```

2. **Rularea suitei de testare a generării documentelor**:
   ```bash
   npx tsx scripts/test-all-templates-generation.ts
   ```
   *Criteriu de trecere*:
   - Șabloanele `ssm-fisa-instruire-individuala` și `psi-fisa-instructaj-individuala` obțin statusul `PASS` cu `approved_for_print`.
   - `unmappedInFile.length === 0`.
   - Reprezentantul legal este corect disociat de salariat (`Munteanu Cristian` ca administrator, `Stan Alexandru` ca salariat instruit).

3. **Verificarea unificată a întregului sistem**:
   ```bash
   npx tsx scripts/verify-all.ts
   ```
   *Criteriu de trecere*:
   - Toate suitele trec cu 100% PASS.
   - Build-ul Next.js compilează curat (`npm run build`).
