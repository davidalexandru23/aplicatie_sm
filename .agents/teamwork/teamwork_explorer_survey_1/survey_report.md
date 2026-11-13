# Raport Tehnic de Investigare și Diagnoză: Cerințele R1, R2 și R3
**Proiect**: SSM, Igienă & Resurse Umane  
**Data investigației**: 10 noiembrie 2026  
**Agent investigator**: `teamwork_explorer_survey_1`  
**Workspace**: `/Users/davidalexandru/Documents/Proiect_SSM`  
**Stare Build & Schema**: `npm run build` PASS (Next.js 16.4.3 / Turbopack), `npx prisma validate` PASS  

---

## 1. Rezumat Executiv

Investigația a scanat și auditat sursele autoritare ale aplicației (schema Prisma, rutele API Next.js, logica de rezolvare a șabloanelor, generatorul de documente și componentele UI React). 

Principalele concluzii ale auditului pentru cele 3 cerințe:
1. **R1 (Date Fabricate & Integritate Documente)**:
   - În `src/lib/templates/resolver.ts`, există **8 dicționare și blocuri masive de fallback hardcodat** (`ROMANIAN_LEGAL_SSM_PROVIDER`, `ROMANIAN_LEGAL_DECIZII`, `ROMANIAN_LEGAL_TRAINING_SHEETS`, `ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH`, `ROMANIAN_LEGAL_EIP`, `ROMANIAN_LEGAL_HR_CIM`, `ROMANIAN_LEGAL_HYGIENE` și fallback-ul direct din `verifiedMap`). Acestea injectează date fictive („Munteanu Cristian”, „S.C. CLIENT TEST S.R.L.”, „RO12345678”, „RX 123456”, „15.03.1988”, „0I(Rh+)”, mărimi „42/L/9”, decizii statice „01-11/15.01.2026”, etc.).
   - Flag-ul `isAutocompleted` (l. 2097–2113) marchează aceste date fictive drept „preluate automat din BD” (`hasValue = true`), transformându-le în interfață în carduri verzi doar-pentru-citire și blocând operatorul de la completarea lor manuală.
   - Statusul `approved_for_print` (generator.ts:589) este acordat eronat tuturor documentelor deoarece valorile fabricate maschează lipsa datelor reale, făcând ca `finalMissingFields.length === 0` să fie întotdeauna adevărat.
   - În `src/app/documents/generate/page.tsx:1222`, există o limitare arbitrară `manualFields.slice(0, 20)`, ascunzând toate câmpurile manuale de la indexul 20 în sus.
   - În `src/lib/templates/generator.ts:353-370`, scanarea post-procesare face `text.replaceAll(curly, strVal)` direct în XML fără escaparea caracterelor speciale XML (`&`, `<`, `>`), ceea ce duce la coruperea fișierelor DOCX generate (de ex. la denumiri cu `&` sau concluzii cu `<=`).

2. **R2 (Medicină a Muncii – HG 355/2007)**:
   - În schema Prisma (`Employee`), există câmpurile scalare: `medicalLastExamDate`, `medicalIntervalMonths`, `medicalFitnessVerdict` și `medicalNotes`. Nu există un model separat `MedicalExam`.
   - **Nu există niciun endpoint API** în întreaga aplicație pentru înregistrarea unei fișe de aptitudine sau actualizarea datelor de medicină a muncii. Singura modalitate de scriere a fost importul inițial Excel (`importer.ts`) sau seed-ul.
   - Când `medicalLastExamDate` este expirat sau lipsește, `compliance.ts` setează statusul `OVERDUE` / `MISSING`, blocând butonul de generare în `generate/page.tsx:1292` și respingând generarea colectivă în `generate-batch/route.ts:160`. Din cauza lipsei rutei API și a modalei UI, operatorul este complet blocat.

3. **R3 (Ciclul de Viață al Angajaților – CRUD și Plecări / Demisii)**:
   - **Nu există rute API CRUD pentru salariați**: nu există `POST /api/employees`, `PUT /api/employees/[id]`, nici endpoint de încetare (`status: "PLECAT"`). Singura rută este `GET /api/clients/[id]/employees`.
   - În UI (`/employees` și `/clients/[id]`), interfața este 100% de vizualizare (read-only), fără modale de adăugare manuală, editare completă sau încetare contract.
   - Câmpurile statutare (`cimNumber`, `grossSalary`, `workNorm`, `bankIban`, adrese, mărimi EIP) sunt deja modelate în Prisma (`Employee`, `IdentityDocument`, `ResidenceAddress`), dar nu pot fi introduse sau modificate din aplicație.
   - Angajații cu status `PLECAT` **nu sunt filtrați** în:
     * `src/lib/compliance.ts` (`calculateCompanyMetrics` include toți salariații);
     * `src/app/employees/page.tsx` (calculează metricele pe `employeesRaw`);
     * `src/app/api/clients/[id]/employees/route.ts` (returnează toți salariații);
     * `src/app/documents/generate/page.tsx` (afișează salariații plecați în selector);
     * `src/app/api/documents/generate-batch/route.ts` (nu filtrează salariații plecați);
     * `src/lib/templates/resolver.ts:2054-2056` (la lipsa `employeeId`, poate alege un salariat plecat ca `client.employees[0]`);
     * `src/lib/packages/bulk-packages.ts:189` (`generateClientDossierZip` include toți salariații fără filtru de status).

---

## 2. Investigare Detaliată R1: Eliminare Date Fabricate & Asigurarea Integrității Documentelor

### 2.1. Catalogul Complet al Fallback-urilor și Valorilor Mock din `src/lib/templates/resolver.ts`

În `resolver.ts`, s-au identificat următoarele blocuri de date fabricate ce trebuie eliminate sau transformate în date opționale/goale:

| Fișier / Linii | Constanta / Obiect | Câmpuri / Token-uri | Valori Mock Hardcodate | Impact Business / Problemă |
|---|---|---|---|---|
| `resolver.ts:54-80` | `ROMANIAN_LEGAL_SSM_PROVIDER` | `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_FURNIZOR_SSM`, `PLACEHOLDER_CUI_PRESTATOR`, `PLACEHOLDER_CERTIFICAT_FURNIZOR`, `PLACEHOLDER_STRADA_FURNIZOR` etc. | `"EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L."`, `"RO34567890"`, `"Certificat abilitare... 4812/2021"`, `"Str. Agricultori nr. 35"`, `"Ing. Mihai Popescu"` | Injectează datele unei firme prestatoare terțe chiar dacă clientul nu are prestator configurat în BD. |
| `resolver.ts:86-129` | `ROMANIAN_LEGAL_DECIZII` | `PLACEHOLDER_NUMAR_DECIZIE_01` .. `_11`, `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM`, `PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR`, `PLACEHOLDER_RESPONSABIL_PSI`, `PLACEHOLDER_MEMBRU_COMISIE`, `PLACEHOLDER_NUMAR_PERMIS_FOC`, `PLACEHOLDER_EXECUTANT_LUCRARE` etc. | `"01/15.01.2026"` .. `"11/15.01.2026"`, `"Ing. Mihai Popescu"`, `"Ioana-Raluca Dumitru"`, `"Gheorghe Barbu"`, `"Elena Vasilescu, Alexandru Stan"`, `"Vasile Ionescu (Sudor autorizat)"`, `"15.01.2026"` | Atribuie decizii cu numere și date statice și nume de persoane complet inventate, fără bază legală în organigrama clientului. |
| `resolver.ts:298-336` | `ROMANIAN_LEGAL_TRAINING_SHEETS` | `PLACEHOLDER_DOMICILIU`, `PLACEHOLDER_CALIFICARE`, `PLACEHOLDER_TRASEU_DEPLASARE`, `PLACEHOLDER_INSTRUCTOR_IG`, `PLACEHOLDER_VERIFICATOR_IG`, `PLACEHOLDER_ADMITERE_NUME` etc. | `"București, Sector 1, Str. Victoriei nr. 10"`, `"Inginer IT"`, `"Domiciliu - Metrou - Sediul Central"`, `"Munteanu Cristian"`, `"15.01.2026"` | Inventează adrese, calificări și instructori pe fișele individuale de instruire SSM și PSI. |
| `resolver.ts:341-434` | `ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH` | `PLACEHOLDER_CABINET_MEDICINA_MUNCII`, `PLACEHOLDER_MEDIC_MEDICINA_MUNCII`, `PLACEHOLDER_ADRESA_CABINET_MEDICINA_MUNCII`, `PLACEHOLDER_NUMAR_INREGISTRARE_SOLICITARE`, `PLACEHOLDER_VECHIME_TOTALA`, `PLACEHOLDER_DATA_SOLICITARII` | `"CENTRU MEDICAL DE MEDICINA MUNCII S.R.L."`, `"Dr. Alexandrescu Victor"`, `"București, Bd. Aviatorilor nr. 15"`, `"SOL-MED-042/2026"`, `"5 ani"`, `"15.01.2026"` | Inventează cabinetul medical, medicul și numărul de înregistrare al fișei de solicitare medicina muncii. |
| `resolver.ts:440-560` | `ROMANIAN_LEGAL_EIP` | `PLACEHOLDER_MARIME_HAINE`, `PLACEHOLDER_MARIME_INCALTAMINTE`, `PLACEHOLDER_MARIME_MANUSI`, `PLACEHOLDER_NUME_SALARIAT`, `PLACEHOLDER_GESTIONAR_EIP`, `PLACEHOLDER_EIP_DENUMIRE_01..10`, `PLACEHOLDER_EIP_DATA_ACORDARII_01..10` | `"M / 48"`, `"42"`, `"9 (L)"`, `"Stan Alexandru"`, `"Ion Ionescu"`, 10 rânduri de dotare statică cu data `"15.01.2026"` și semnătura `"Semnat salariat"` | Inventează mărimi și acordarea a 10 echipamente EIP cu date și semnături fictive pe fișa individuală EIP. |
| `resolver.ts:565-636` | `ROMANIAN_LEGAL_HR_CIM` | `PLACEHOLDER_DOMICILIU`, `PLACEHOLDER_DATA_INCEPUT`, `PLACEHOLDER_DATA_INCEPERE`, `PLACEHOLDER_COD_POSTAL_FIRMA` | `"București, Sector 1, Str. Victoriei nr. 10"`, `"15.01.2026"`, `"010001"` | Injectează date fictive de început și domiciliu. |
| `resolver.ts:1088` | `legalRepresentativeName` | `client?.legalRepresentative` fallback | `'Munteanu Cristian'` | Administrator generic inventat când firma nu are reprezentant configurat în BD. |
| `resolver.ts:1450-1460` | `verifiedMap` (Client) | `PLACEHOLDER_FIRMA`, `PLACEHOLDER_CUI`, `PLACEHOLDER_NR_REG_COM`, `PLACEHOLDER_ADRESA_FIRMA`, `PLACEHOLDER_TELEFON_CONTACT`, `PLACEHOLDER_EMAIL_CONTACT` | `'S.C. CLIENT TEST S.R.L.'`, `'RO12345678'`, `'J40/1000/2021'`, `'București, Sector 1'`, `'0722334455'`, `'contact@client.ro'` | Dacă clientul are câmpuri goale în BD, resolverul fabrică o firmă test și date de contact fictive. |
| `resolver.ts:1568-1594` | `verifiedMap` (Employee parțial) | `PLACEHOLDER_DATA_NASTERII`, `PLACEHOLDER_LOCALITATE_NASTERII`, `PLACEHOLDER_SERIE_ACT`, `PLACEHOLDER_NUMAR_ACT`, `PLACEHOLDER_EMITENT_ACT`, `PLACEHOLDER_DATA_EMITERII`, `PLACEHOLDER_DATA_EXPIRARII`, `PLACEHOLDER_ADRESA_DOMICILIU`, `PLACEHOLDER_STRADA_DOMICILIU`, `PLACEHOLDER_NUMAR_DOMICILIU`, `PLACEHOLDER_BLOC`, `PLACEHOLDER_SCARA`, `PLACEHOLDER_ETAJ`, `PLACEHOLDER_APARTAMENT` | `'15.03.1988'`, `'București'`, `'RX'`, `'123456'`, `'SPCLEP Sector 1'`, `'10.05.2020'`, `'10.05.2030'`, `'Str. Victoriei nr. 10'`, `'Str. Victoriei'`, `'10'`, `'A1'`, `'1'`, `'2'`, `'5'` | Dacă salariatul există în BD dar nu are CI sau adresă completă, resolverul inventează date de buletin RX 123456 și domiciliu fictiv. |
| `resolver.ts:1601-1636` | `verifiedMap` (Employee null) | Toate câmpurile de salariat | Salariat complet fictiv: „Stan Alexandru”, CNP 1880315410127, C.I. seria RX nr. 123456, născut 15.03.1988 în București, domiciliat în Str. Victoriei nr. 10 | Generează documente de salariat pentru un om inexistent dacă nu este selectat un angajat. |
| `resolver.ts:1640-1660` | `verifiedMap` (Post & CIM) | `PLACEHOLDER_FUNCTIE`, `PLACEHOLDER_COD_COR`, `PLACEHOLDER_GRUPA_SANGUINA`, `PLACEHOLDER_TRASEU_DEPLASARE`, `PLACEHOLDER_DURATA_DEPLASARE`, `PLACEHOLDER_MARIME_INCALTAMINTE`, `PLACEHOLDER_MARIME_IMBRACAMINTE`, `PLACEHOLDER_MARIME_MANUSI` | `'Personal TESA / Inginer Sisteme Software'`, `'251201'`, `'0I (Rh +)'`, `'Deplasare urbană domiciliu - sediu'`, `'30 minute'`, `'42'`, `'L'`, `'9'` | Atribuie grupă sanguină 0I(Rh+), mărimi arbitrare și post generic când lipsesc din profilul angajatului. |
| `resolver.ts:1883-1908` | `verifiedMap` (Hygiene fallback) | `participants` fallback array | Roster fictiv cu un cursant „Stan Alexandru”, CNP 1880315410127, certificat „0042”, nota 10 | Generează cataloage de examen de igienă fictive când sesiunea nu are participanți reali. |

### 2.2. Analiza Mecanismului `isAutocompleted` (resolver.ts:2097–2113)

**Mecanismul actual**:
```typescript
const resolvedFields: ResolvedPlaceholderItem[] = template.fields
  .filter((def: TemplateFieldDef) => !/_\d{2,3}$/.test(def.key))
  .map((def: TemplateFieldDef) => {
    const rawVal = resolutionResult.data[def.key];
    const hasValue = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';

    return {
      key: def.key,
      label: def.label,
      source: def.source,
      type: def.type,
      required: def.required,
      value: hasValue ? (rawVal as string | number | boolean) : '',
      isAutocompleted: hasValue,
    };
  });
```

**Problema identificată**:
`resolutionResult.data` este compus din `...ALL_ROMANIAN_LEGAL_FALLBACKS` unit cu `...verifiedMap`. Deoarece dicționarele de fallback au un șir de caractere nenul pentru aproape orice cheie, `hasValue` se evaluează la `true` chiar și pentru datele inexistente în baza de date!
Rezultatul:
1. `isAutocompleted` devine `true` pentru câmpuri precum `cimNumber`, `grossSalary`, `shoeSize`, `bloodType`, `identityDocument`, `legalRepresentative`.
2. În `src/app/documents/generate/page.tsx:569-571`:
   - `manualFields = cleanFields.filter((f) => !f.isAutocompleted);`
   - `autoFields = cleanFields.filter((f) => f.isAutocompleted);`
3. În UI (l. 1248-1256), `autoFields` sunt randate exclusiv ca `<div>` ne-editabile cu badge verde. Utilizatorul NU POATE edita valorile, iar documentul este generat cu valorile inventate!

**Logica corectă ce trebuie implementată**:
- `isAutocompleted` trebuie să fie `true` **numai și numai dacă valoarea provine dintr-o entitate reală din baza de date** (de ex. `client.cui`, `employee.cimNumber`, `employee.identityDocument.series`, `ssmProvider.name`).
- Dacă valoarea nu există în baza de date (este `null` sau `undefined` în entitatea Prisma), câmpul:
  * Trebuie să aibă `isAutocompleted: false`;
  * Trebuie să aibă `value: customOverrides[key] || ''`;
  * Trebuie să fie direcționat în `manualFields`, permițând operatorului să introducă datele manual în formularul de generare.

### 2.3. Analiza Flag-ului `approved_for_print` (generator.ts:554, 584–591)

**Mecanismul actual**:
```typescript
const missingFields = new Set(validateMissingFields(fieldDefs, params.data));
...
for (const token of await collectUnresolvedPlaceholders(outputBuffer, templateFormat)) {
  missingFields.add(placeholderLabel(token));
}
const finalMissingFields = [...missingFields];
const status: 'draft' | 'missing_data' | 'approved_for_print' =
  finalMissingFields.length === 0 ? 'approved_for_print' : 'missing_data';
```

**Problema identificată**:
Deoarece resolverul injecta valori fallback nenule pentru absolut orice cheie (inclusiv stringuri precum `........ / ............` sau `15.01.2026`), funcția `validateMissingFields` găsea `params.data[f.key] !== ''`, deci 0 câmpuri lipsă.
De asemenea, documentul DOCX/PDF randat nu mai conținea `{PLACEHOLDER_*}` neînlocuite, astfel că `finalMissingFields.length` era întotdeauna `0`.
Prin urmare, **fiecare document generat primea automat statusul `approved_for_print`**, chiar dacă salariatul nu avea număr de CIM, nu avea salariu, nu avea acte de identitate valide sau examen medical efectuat.

**Logica corectă ce trebuie implementată**:
- Câmpurile obligatorii statutare (`required: true` în definiția șablonului sau regulile de conformitate) ce nu au valoare reală în DB și nici valoare furnizată manual de operator în `customFields` trebuie să rămână goale sau nerezolvate.
- `validateMissingFields` va detecta aceste chei și le va adăuga în `missingFields`.
- Dacă există chiar și un singur câmp obligatoriu lipsă (de ex. `PLACEHOLDER_SALARIU_BRUT`, `PLACEHOLDER_NUMAR_CIM`, `PLACEHOLDER_CNP`), statusul documentului generat va fi **strict `missing_data`** (sau `draft`), niciodată `approved_for_print`.

### 2.4. Trunchierea Câmpurilor Manuale la 20 în UI (generate/page.tsx:1222)

**Observație în cod**:
În `src/app/documents/generate/page.tsx:1222`:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {manualFields.slice(0, 20).map((field) => (
    <div key={field.key} className="space-y-1">
...
```
**Problema identificată**:
Metoda `.slice(0, 20)` taie lista la primele 20 de câmpuri manuale. Șabloane complexe precum:
- `hr-cim-model-cadru-2022` (are peste 35 de câmpuri de clauze, sporuri, formare, beneficii);
- `med-fisa-solicitare-examen` și `med-fisa-identificare-riscuri` (Anexele 2 și 3 din HG 355/2007, cu zeci de factori de risc profesional);
- `DECIZII.docx` (pachetul de 11 decizii de numire a responsabililor);
au câmpuri care nu apar niciodată pe ecran. Operatorul nu le poate vizualiza și nu poate introduce date pentru ele.

**Remediere**:
Eliminarea apelului `.slice(0, 20)` și randarea integrală a tuturor câmpurilor din `manualFields`, eventual organizate pe secțiuni logice sau într-o grilă responsive cu posibilitate de căutare / pliere dacă lista este lungă.

### 2.5. Escaparea Caracterelor Speciale XML în DOCX (`generator.ts:353–370`)

**Observație în cod**:
În `src/lib/templates/generator.ts:345-373`:
```typescript
for (const [relativePath, file] of Object.entries(docZip.files)) {
  if (
    (relativePath.startsWith('word/') || relativePath.startsWith('customXml/')) &&
    (relativePath.endsWith('.xml') || relativePath.endsWith('.rels'))
  ) {
    let text = file.asText();
    let changed = false;

    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const strVal = String(v);
        const curly = `{${k}}`;
        if (text.includes(curly)) {
          text = text.replaceAll(curly, strVal); // <-- VULNERABILITATE: Text brut inserat în XML!
          changed = true;
        }
        if (relativePath.endsWith('.rels') && text.includes(k)) {
          text = text.replaceAll(k, strVal);
          changed = true;
        }
      }
    }

    if (changed) {
      docZip.file(relativePath, text);
    }
  }
}
```

**Problema identificată**:
În formatul DOCX (OpenXML), fișierele din `word/*.xml` sunt documente XML standard. 
Dacă `strVal` conține caractere speciale XML:
- `&` (de ex. în denumiri de firme precum „BAR & RESTAURANT S.R.L.”, „EXPERT SSM & PSI”, „ALIMENTAȚIE & COMERȚ”);
- `<` sau `>` (de ex. în concluzii de evaluare de risc: `Nrg <= 3,50`, `suprafață < 6 mp`);
- `"` sau `'` (în atribute sau texte XML);
înlocuirea directă fără escapare produce XML invalid (`<w:t>BAR & RESTAURANT</w:t>`). Când utilizatorul încearcă să deschidă documentul în Microsoft Word, aplicația raportează eroare de fișier corupt („Word encountered an error and could not open the document”).

**Remediere necesară**:
Implementarea unei funcții dedicate de escapare XML pentru orice înlocuire în fișiere `.xml` și `.rels`:
```typescript
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```
La linia 358:
`text = text.replaceAll(curly, escapeXml(strVal));`
iar la linia 362 (pentru `.rels`):
`text = text.replaceAll(k, escapeXml(strVal));`

---

## 3. Investigare Detaliată R2: Medicină a Muncii – Înregistrare Examen și Deblocare Flux

### 3.1. Modelarea în Schema Prisma (`prisma/schema.prisma`)

În `prisma/schema.prisma:234-239`, modelul `Employee` conține:
```prisma
  // 1. Supravegherea sănătății (HG 355/2007 - Medicină a Muncii)
  medicalLastExamDate          DateTime? // Data ultimului examen medical (angajare sau periodic)
  medicalIntervalMonths        Int       @default(12) // Periodicitate în luni (standard 12 luni TESA, 6 luni riscuri)
  medicalFitnessVerdict        String?   @default("APT") // APT, APT_CONDITIONAT, INAPT_TEMPORAR, INAPT
  medicalNotes                 String?   // Restricții sau recomandări medicale din fișa de aptitudine
```

**Constatări**:
1. Nu există un model relațional separat `MedicalExam` (cum există `TrainingParticipant` pentru instruiri sau `HygieneParticipant` pentru igienă).
2. Toată evidența este menținută direct la nivel de salariat prin cele 4 coloane:
   - `medicalLastExamDate` (Data examenului)
   - `medicalIntervalMonths` (Periodicitatea, standard 12 luni)
   - `medicalFitnessVerdict` (Verdict: `APT`, `APT_CONDITIONAT`, `INAPT_TEMPORAR`, `INAPT`)
   - `medicalNotes` (Restricții/observații din fișa de aptitudine)
3. Această structură este simplă și suficientă pentru fluxul operațional curent, dar nu păstra un istoric al examenelor anterioare dacă acestea nu sunt înregistrate ca fișier atașat sau tabel separat. Dacă se dorește păstrarea istoricului, se poate adăuga un model `MedicalExamRecord` opțional, dar actualizarea directă a câmpurilor de pe `Employee` este cerința minimă critică care deblochează fluxul.

### 3.2. Rute API Existente vs Lipsă

- **Rute API existente**: NICIUNA. Nu există niciun endpoint `POST`, `PUT` sau `PATCH` pentru a actualiza `medicalLastExamDate` sau parametrii asociați.
- **Ruta necesară**:
  `POST /api/employees/[id]/medical-exam` (sau `PATCH /api/employees/[id]`):
  * **Payload primit**:
    ```json
    {
      "examDate": "2026-11-10T00:00:00.000Z",
      "intervalMonths": 12,
      "verdict": "APT", // APT, APT_CONDITIONAT, INAPT_TEMPORAR, INAPT
      "restrictions": "Cu ochelari de corecție la ecran conform Fișei 243",
      "clinicName": "Centrul Medical Unirea",
      "doctorName": "Dr. Popescu Elena"
    }
    ```
  * **Acțiuni efectuate de endpoint**:
    1. Validare existență salariat în BD;
    2. Actualizare `Employee`:
       - `medicalLastExamDate = new Date(examDate)`
       - `medicalIntervalMonths = intervalMonths || 12`
       - `medicalFitnessVerdict = verdict`
       - `medicalNotes = restrictions`
    3. Înregistrare eveniment în `AuditEvent`:
       - `action: "record_medical_exam"`, `entityType: "Employee"`, `entityId: id`
    4. Returnare profil salariat actualizat cu conformitatea recalculată.

### 3.3. Traseul Conformității și Deblocarea Generării Documentelor

1. **Calcul conformitate**:
   În `src/lib/compliance.ts:193-203`:
   ```typescript
   const medicalLastExam = (employee?.medicalLastExamDate as Date | string | null | undefined) ?? null;
   const medicalInterval = typeof employee?.medicalIntervalMonths === 'number'
     ? employee.medicalIntervalMonths
     : COMPLIANCE_CONSTANTS.DEFAULT_MEDICAL_INTERVAL;

   const occupationalMedicine = calculateItemCompliance(
     medicalLastExam,
     medicalInterval,
     'Medicină a Muncii',
     referenceDate
   );
   ```
   Dacă `medicalLastExamDate` este `null`, statusul este `MISSING`. Dacă data este mai veche decât `intervalMonths`, `daysRemaining < 0` și statusul devine `OVERDUE`.

2. **Blocajul din Generare**:
   În `src/app/documents/generate/page.tsx:140-153`:
   ```typescript
   if (code.includes('med-') || code.includes('medical')) {
     const med = employee.compliance.occupationalMedicine;
     if (med && med.status === 'OVERDUE') {
       return {
         isExpired: true,
         badgeText: `Expirat (${days} zile)`,
         reason: `Examen Medicină a Muncii depășit la data de ...`,
       };
     }
   }
   ```
   Iar la linia 1292: `isSingleModeExpired` devine `true`, iar proprietatea `disabled={isGenerateDisabled}` dezactivează complet butonul albastru „Generare Document”.
   În mod similar, în generarea în lot (`generate-batch/route.ts:151-160`), orice salariat cu medicina muncii expirată blochează procesul prin aruncarea unei erori HTTP 400.

3. **Deblocarea automată**:
   De îndată ce `POST /api/employees/[id]/medical-exam` scrie o dată recentă în `medicalLastExamDate`, funcția `calculateItemCompliance` va calcula `daysRemaining = 365 > 0` și statusul va deveni instantaneu `VALID`.
   La următoarea reîncărcare a listei de salariați în UI (`fetch /api/clients/${id}/employees`), `isExpired` va fi `false`, iar butonul de generare se va reactiva imediat.

### 3.4. Starea Componentelor UI

- În `src/app/employees/employee-registry-client.tsx`, coloana „Medicină a Muncii” afișează badge-ul de status și avizul medical (l. 180-188), dar **nu există niciun buton de acțiune sau modală** pentru a adăuga o examinare nouă.
- În `src/app/clients/[id]/page.tsx`, tabelul de salariați (l. 427-565) afișează de asemenea doar date statice, fără opțiune de actualizare medicală.
- **Cerință UI**:
  Adăugarea unui buton cu iconiță medicală (de ex. `Stethoscope` sau `Activity`) pe fiecare rând de angajat, care deschide `RecordMedicalExamModal`.

---

## 4. Investigare Detaliată R3: Ciclul de Viață al Angajaților – CRUD și Plecări / Demisii

### 4.1. Auditul Capacităților Curente CRUD

1. **Adăugare salariat (`CREATE`)**:
   - UI: **Inexistentă**. Singurul mesaj prezent în `clients/[id]/page.tsx:423` este:  
     *„Niciun angajat înregistrat. Importă fișierul Model_date_client_SSM.xlsx.”*
   - API: **Inexistentă**. Nu există rută `POST /api/employees`.
2. **Editare salariat (`UPDATE`)**:
   - UI: **Inexistentă**. Niciun buton de editare pe rândurile de tabel.
   - API: **Inexistentă**. Nu există rută `PUT / PATCH /api/employees/[id]`.
3. **Încetare contract / Demisie (`TERMINATE / PLECAT`)**:
   - UI: **Inexistentă**. Nicio modală sau acțiune de setare a datei de plecare.
   - API: **Inexistentă**.

### 4.2. Câmpurile Statutare din Schema Prisma Disponibile pentru Formulare

Toate câmpurile cerute de legislația românească sunt deja definite în schema Prisma pe modelele `Employee`, `IdentityDocument` și `ResidenceAddress`:

- **Date de identificare**: `firstName`, `lastName`, `cnp`, `sex`, `birthDate`, `birthPlace`, `birthCounty`, `citizenship`;
- **Act de identitate** (`IdentityDocument`): `docType` (CI/CEI/Pașaport), `series`, `number`, `issuedBy`, `issueDate`, `expiryDate`;
- **Domiciliu** (`ResidenceAddress`): `county`, `locality`, `street`, `number`, `building`, `entrance`, `floor`, `apartment`, `postalCode`;
- **Încadrare & Contact**: `clientId`, `currentJobId`, `currentWorksiteId`, `startDateOnJob`, `hireDate`, `phone`, `email`;
- **Statutar HR & CIM (Ord. 2171/2022)**: `cimNumber`, `cimDate`, `grossSalary`, `workNorm`, `probationDays`, `annualLeaveDays`, `bankIban`, `bankName`;
- **SSM & EIP (HG 1425/2006, HG 1048/2006)**: `bloodType`, `rhFactor`, `qualification`, `commuteRoute`, `commuteDurationMinutes`, `shoeSize`, `clothingSize`, `gloveSize`;
- **Status & Încetare**: `status` (`ACTIV` / `PLECAT`), `leaveDate` (DateTime).

### 4.3. Tratarea Statusului „PLECAT” în Aplicație și Punctele Critice de Filtrare

S-au localizat toate fișierele și liniile unde salariații cu status `PLECAT` afectează negativ calculele sau apar eronat în fluxuri:

| Fișier / Linii | Logica Curentă | Consecință Negativă | Modificare Necesară |
|---|---|---|---|
| `src/lib/compliance.ts:286-335` (`calculateCompanyMetrics`) | Iterează prin întreg tabloul `employees` primit fără verificare de status. | Dacă o companie are 5 salariați activi și 5 foști angajați plecați ale căror instruiri au expirat, scorul de conformitate scade la 50%! | Adăugare filtru: `const activeEmployees = employeeList.filter(e => e.status !== 'PLECAT');` și calculul metricilor exclusiv pe acest subset. |
| `src/app/employees/page.tsx:50` | `const metrics = calculateCompanyMetrics(employeesRaw);` | Indicatorii din panoul de sus al paginii „Registru Salariați” includ salariații plecați în numărul total și în calculul scadențelor depășite. | Modificare în: `calculateCompanyMetrics(employeesRaw.filter(e => e.status !== 'PLECAT'));`. |
| `src/app/api/clients/[id]/employees/route.ts:11-13` | `findMany({ where: { clientId: id } })` | Endpoint-ul returnează toți angajații (inclusiv plecați) către generatorul de documente. | Adăugare parametru de filtrare: `where: { clientId: id, status: statusParam ? statusParam : { not: 'PLECAT' } }` sau filtrare implicită pe activi. |
| `src/app/documents/generate/page.tsx:302-306` & selector salariat | `employees` conține toți angajații aduși de API; dropdown-ul și selecția multiplă le permit selectarea. | Operatorul poate genera fișe de instruire sau CIM-uri pentru angajați plecați; salariații plecați pot bloca generarea batch dacă au instruiri expirate. | Filtrare în UI: afișarea în liste a salariaților cu `emp.status !== 'PLECAT'` sau permiterea doar a generării retroactive explicite. |
| `src/app/api/documents/generate-batch/route.ts:127-137` | `findMany({ where: { id: { in: employeeIds }, clientId } })` | Nu verifică dacă vreunul dintre ID-urile primite aparține unui salariat cu `status: 'PLECAT'`. | Adăugare clauză: `where: { id: { in: employeeIds }, clientId, status: { not: 'PLECAT' } }` și aruncare eroare dacă un angajat plecat este inclus în lot. |
| `src/lib/templates/resolver.ts:2054-2056` | `const employee = ctx.employeeId ? ... : client.employees[0];` | Dacă `employeeId` nu este specificat, resolverul alege primul salariat al firmei din BD, care poate avea status `PLECAT`. | Înlocuire cu: `client.employees.find(e => e.status !== 'PLECAT') || client.employees[0] || null`. |
| `src/lib/packages/bulk-packages.ts:189-195` (`generateClientDossierZip`) | `employees: { include: ... }` fără `where` de status | Dosarul SSM al firmei (Start-up Dossier) include fișe individuale pentru foști angajați plecați. | Adăugare clauză: `employees: { where: { status: { not: 'PLECAT' } }, include: ... }`. |
| `src/app/employees/employee-registry-client.tsx:106-118` | `tabCounts` numără toți salariații în tab-uri, indiferent dacă sunt `PLECAT`. | Angajații plecați apar în tab-ul „Expirate” (`OVERDUE`) și cresc artificial numărul de alerte active. | Tab-urile de conformitate (`VALID`, `UPCOMING`, `OVERDUE`, `MISSING`) trebuie să contorizeze doar salariații activi. Ar trebui adăugat un tab dedicat „Plecați” sau un filtru de stare. |

---

## 5. Recomandări și Etape de Implementare

### Faza 1: Curățarea Resolverului și a Generatorului (Cerința R1)
1. **Refactorizare `src/lib/templates/resolver.ts`**:
   - Eliminarea datelor inventate din `verifiedMap` (înlocuirea fallback-urilor `Munteanu Cristian`, `S.C. CLIENT TEST S.R.L.`, `RO12345678`, `RX 123456`, `15.03.1988`, `0I (Rh+)`, `42/L/9` cu date reale din DB sau string gol `""`).
   - Înlocuirea `ROMANIAN_LEGAL_SSM_PROVIDER`: dacă firma nu are asociat un prestator SSM și nici în BD nu există un furnizor marcat cu `isDefault: true`, câmpurile rămân goale și se marchează ca `isAutocompleted: false`.
   - Modificarea mapării `resolvedFields` (l. 2097–2113): determinarea `isAutocompleted` se va face pe baza provenienței reale a valorii (prezentă în obiectul `client`, `employee`, `job`, `worksite` sau `provider`), NU pe baza prezenței unui text nenul din fallback.
2. **Corectare `src/lib/templates/generator.ts`**:
   - Adăugarea funcției utilitare `escapeXml(str)` pentru caracterele `&`, `<`, `>`, `"`, `'`.
   - Înlocuirea `text.replaceAll(curly, strVal)` cu `text.replaceAll(curly, escapeXml(strVal))` la linia 358 și 362.
   - Refinarea condiției de atribuire a statusului `approved_for_print`: un document primește `approved_for_print` **numai dacă** toate câmpurile cu `required: true` au valori valide (nenule și fără placeholder).
3. **Corectare UI `src/app/documents/generate/page.tsx`**:
   - Eliminarea limitării `.slice(0, 20)` la linia 1222 pentru afișarea completă a tuturor câmpurilor manuale.

### Faza 2: Implementare Endpoint-uri și Modale Medicină a Muncii (Cerința R2)
1. **Creare Rută API**:
   - Creare `src/app/api/employees/[id]/medical-exam/route.ts` (metoda `POST`).
   - Validare body cu Zod: `examDate` (ISO Date), `intervalMonths` (int, default 12), `verdict` (`APT` \| `APT_CONDITIONAT` \| `INAPT_TEMPORAR` \| `INAPT`), `restrictions` (opțional string).
   - Actualizare atomică pe `prisma.employee.update`.
   - Înregistrare în `AuditEvent`.
2. **Creare Modală UI**:
   - Creare componentă `src/components/employees/record-medical-exam-modal.tsx`.
   - Formular clar cu selecție tip aviz, dată examen, termen valabilitate (luni), restricții medicale.
   - Integrare buton declanșator în `employee-registry-client.tsx` și `src/app/clients/[id]/page.tsx`.
   - Deblocare instantanee a generării în interfață după salvare.

### Faza 3: Implementare CRUD Salariați & Filtrare „PLECAT” (Cerința R3)
1. **Creare Rute API CRUD**:
   - `POST /api/employees`: creează salariatul, `IdentityDocument` și `ResidenceAddress` într-o tranzacție Prisma.
   - `PUT /api/employees/[id]` (sau `PATCH`): actualizează oricare dintre câmpurile salariatului, inclusiv buletin și adresă.
   - `POST /api/employees/[id]/terminate`: primește `leaveDate`, setează `status: "PLECAT"` și consemnează data încetării.
2. **Izolarea și Filtrarea Statusului „PLECAT”**:
   - Actualizare `src/lib/compliance.ts:calculateCompanyMetrics`: filtrare explicită `e.status !== 'PLECAT'` înainte de calculul scorului și al numărului total de salariați.
   - Actualizare `src/app/employees/page.tsx`: calcul metrici doar pe salariați activi.
   - Actualizare `src/app/api/clients/[id]/employees/route.ts`: excludere implicită salariați plecați (sau suport parametru `includeInactive=true`).
   - Actualizare `src/app/documents/generate/page.tsx`: ascundere salariați plecați din lista de selecție.
   - Actualizare `src/app/api/documents/generate-batch/route.ts`: respingere generare lot pentru salariați cu status `PLECAT`.
   - Actualizare `src/lib/packages/bulk-packages.ts`: excludere din dosarul firmei a angajaților plecați.
   - Actualizare `src/lib/templates/resolver.ts:2054`: fallback pe primul angajat ACTIV, niciodată pe un angajat plecat.
3. **Creare Componente UI**:
   - Creare `src/components/employees/add-employee-modal.tsx` (adăugare salariat cu toate datele statutare).
   - Creare `src/components/employees/edit-employee-modal.tsx` (editare completă).
   - Creare `src/components/employees/terminate-employee-modal.tsx` (înregistrare demisie/plecare).
   - Adăugare butoane în tabelul din `src/app/employees/employee-registry-client.tsx` și `src/app/clients/[id]/page.tsx`.

---

## 6. Verificare și Validare

- `npm run build`: Confirmă că tipurile TypeScript, rutele Next.js dinamice și componentele client/server compilează fără erori.
- `npx prisma validate`: Confirmă validitatea schemei bazei de date.
- Testare manuală și automată după implementare pentru asigurarea lipsei de regresii.
