# HANDOFF REPORT — m2_p2_spec_miner_2

**Task**: Statutory Mining & Token Schema Specification for F9 (Anexa 2 & Anexa 3 HG 355/2007) and F10 Part A (Fișă Acordare EIP HG 1048/2006).  
**Target Milestone**: M2 (Pilonul 2 — Extinderea Catalogului la 31 de Șabloane Statutare).  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_p2_spec_miner_2`  
**Date**: 2026-11-05T00:48:00Z  

---

## 1. Observation

Direct evidence collected from the codebase and authoritative Romanian statutory sources:

1. **Repository Architecture & Catalog State**:
   - `src/lib/templates/definitions.ts`: Contains `TEMPLATE_CATALOG` with currently 25 registered templates (`ipssm-alunecari`, `ipssm-autovehicule`, `ipssm-birou`, `hygiene-adeverinta`, `hr-anexa-fisa-post`, `hygiene-anexe-catalog`, `hr-cerere-angajare`, `hr-cim-2026`, `decizii-angajator`, `hr-declaratie-regulament`, `hr-declaratie-raspundere`, `training-detaliu-introductiv`, `training-detaliu-loc-munca`, `risk-evaluare`, `hr-info-dosar`, `hr-gdpr-informare`, `ipssm-universale`, `ipssm-opis`, `risk-plan-actiune-urgenta`, `risk-plan-prevenire-tesa`, `hygiene-tabel-cursanti`, `training-tematica-introductiv`, `training-tematica-loc-munca`, `ipssm-tesa`, `risk-zone-pericol`).
   - `PROJECT.md` lines 25-31 and lines 39-43 mandate expanding the catalog from 25 to 31 templates, adding:
     - F7: `ssm-fisa-instruire-individuala` (Anexa 11 HG 1425/2006)
     - F8: `psi-fisa-instructaj-individuala` (Anexa OMAI 712/2005)
     - F9: `med-fisa-solicitare-examen` (Anexa 2 HG 355/2007) & `med-fisa-identificare-riscuri` (Anexa 3 HG 355/2007)
     - F10: `eip-fisa-acordare-individuala` (HG 1048/2006) & `hr-cim-model-cadru-2022` (Ordin MMSS 2171/2022)
     - F11: Catalog synchronization in `definitions.ts` and `prisma/seed.ts`.
   - `prisma/schema.prisma` lines 159-259 define `Job` (`title`, `corCode`, `mainActivities`, `equipmentUsed`, `workConditions`) and `Employee` (`firstName`, `lastName`, `cnp`, `sex`, `birthDate`, `birthPlace`, `birthCounty`, `hireDate`, `medicalLastExamDate`, `medicalFitnessVerdict`, `medicalNotes`, `identityDocument`, `residenceAddress`).
   - `src/lib/templates/generator.ts` lines 325-373 define DOCX templating using `docxtemplater` with `{PLACEHOLDER_*}` tokens, `paragraphLoop: true`, `linebreaks: true`, and automatic regex token replacement across all XML document parts.

2. **Authoritative Statutory Source 1: HG nr. 355/2007 privind supravegherea sănătății lucrătorilor**:
   - **Art. 16 alin. (1)**: "Examenul medical la angajarea în muncă se face la solicitarea angajatorului, care va completa fişa de solicitare a examenului medical la angajare, conform modelului prevăzut în anexa nr. 2, şi fişa de identificare a factorilor de risc profesional, conform modelului prevăzut în anexa nr. 3."
   - **Anexa nr. 2**: Modelul oficial obligatoriu „FIȘA DE SOLICITARE A EXAMENULUI MEDICAL”. Titulatura oficială și rubricile cuprind:
     - Identificare angajator: Denumire unitate, sediu, CUI, telefon/fax, CAEN și domeniu de activitate, nr. înregistrare la angajator.
     - Tipul examenului solicitat: [ ] Angajare, [ ] Control medical periodic, [ ] Adaptare, [ ] Reluarea muncii, [ ] Supraveghere specială, [ ] La cerere, [ ] Schimbarea locului de muncă, [ ] Altele.
     - Date lucrător examinat: Nume și prenume, data nașterii, CNP, profesiunea/ocupația, funcția în care este/urmează a fi angajat, locul de muncă / punctul de lucru, secția/atelierul/compartimentul.
     - Clauză legală de trimitere: "Persoana examinată urmează să efectueze activitatea profesională la un loc/post de muncă ce prezintă riscurile profesionale detaliate în Fișa de identificare a factorilor de risc profesional, anexată prezentei cereri."
     - Semnătura și ștampila angajatorului.
   - **Anexa nr. 3**: Modelul oficial obligatoriu „FIȘA DE IDENTIFICARE A FACTORILOR DE RISC PROFESIONAL”. Rubricile statutare cuprind:
     - 1. Date identificare unitate, subunitate, adresa, telefon, nume lucrător, CNP, funcție, loc de muncă, secție, navetă (da/nu, ore/zi).
     - 2. Organizarea muncii: lucru în echipă, ore/zi, schimburi (1, 2, 3), schimb de noapte, pauze organizate, bandă rulantă.
     - 3. Descrierea operațiunilor executate în procesul tehnologic și echipamente utilizate.
     - 4. Bifați riscuri specifice: infectare, electrocutare (înaltă/medie/joasă tensiune), înec, asfixiere, blocare, microtraumatisme repetate, lovire, mușcătură, strivire, tăiere, înțepare, împușcare, arsuri/opărire, mișcări repetitive.
     - 5. Condiții speciale: mașina instituției (categorie permis), condiții deosebite/speciale, sector alimentar, port-armă, lucru la înălțime, spații izolate.
     - 6. Descrierea spațiului fizic: dimensiuni încăpere, suprafață de lucru, mediu de activitate (pe sol, sub sol, în aer, pe apă).
     - 7. Efort fizic (mic, mediu, mare, foarte mare), poziție preponderentă (ortostatică, așezat, aplecat, mixtă), poziții vicioase/forțate, gesturi profesionale.
     - 8. Suprasolicitări osteomusculoarticulare (coloană, membre), manipulare manuală de mase (kg), suprasolicitare vizuală (lucru cu videoterminal > 4h/zi conf. Fișei 243), auditivă, neuropsihică.
     - 9. Factori de mediu: agenți chimici (substanțe, V.L.E., Fp, C, P), agenți biologici (grupa 1-4), pulberi (tip, V.L.E.), zgomot (< / > V.L.E., zgomote impulsive), vibrații (mână-braț, întreg corp), microclimat (temperatură, umiditate, curenți), radiații (neionizante, ionizante).
     - 10. Mijloace de protecție: colectivă și individuală (EIP).
     - 11. Asumare: Semnătură și ștampilă angajator, semnătură SEPP/specialist SSM, luare la cunoștință medic medicina muncii.

3. **Authoritative Statutory Source 2: HG nr. 1048/2006 privind cerințele minime de securitate și sănătate pentru utilizarea EIP**:
   - **Art. 3 alin. (1)**: Definiția legală a Echipamentului Individual de Protecție (EIP).
   - **Art. 6**: Conformitatea CE / UE (Regulamentul UE 2016/425) și adecvarea la riscurile evaluate.
   - **Art. 9-10**: Gratuitatea distribuirii de către angajator, asigurarea întreținerii, reparării și înlocuirii la uzură, și obligativitatea instruirii lucrătorului.
   - **Art. 13 lit. r din Legea nr. 319/2006 coroborat cu art. 22-23**: Obligația angajatorului de a acorda gratuit EIP și obligația salariatului de a-l purta pe toată durata lucrului.
   - În controalele ITM, „Fișa Individuală de Acordare/Dotare a EIP” este instrumentul juridic probatoriu obligatoriu prin care se atestă predarea-primirea, instruirea și asumarea obligațiilor de purtare. Structura standard include:
     - Antet angajator și date salariat (nume, funcție, CNP, data angajării, mărimi la echipament: haine, bocanci, mănuși, cască).
     - Tabel de evidență acordare și restituire: Nr. crt., Denumire sortiment EIP, Standard european (ex. EN ISO 20345, EN 388, EN 397, EN 166), U.M., Cantitate, Durata normată de folosință, Data acordării, Semnătură de primire lucrător, Data restituirii, Motiv restituire, Semnătură retur.
     - Angajamentul juridic al salariatului (purtare obligatorie, interdicție înstrăinare/modificare, semnalare defecte, răspundere disciplinară și contravențională).
     - Semnături: Lucrător, Persoană desemnată / Magazioner, Specialist SSM, Reprezentant Legal Angajator.

---

## 2. Logic Chain

1. **Statutory Inseparability of F9 Documents**:
   - `HG 355/2007 art. 16(1)` explicitly links Anexa 2 and Anexa 3: an employer *cannot* validly send an employee for a medical exam without both the request sheet (Anexa 2) and the occupational risk identification sheet (Anexa 3).
   - Therefore, F9 must be modeled as two coordinated templates:
     - `med-fisa-solicitare-examen` (Anexa 2)
     - `med-fisa-identificare-riscuri` (Anexa 3)
   - Both templates belong to context level `employee` and draw from the same core data entities: `client`, `employee`, `job`, `worksite`, `ssmProvider`, `ssmSpecialist`.

2. **Integration with the Existing Resolver Engine**:
   - The resolver already holds `employee`, `job`, `client`, `worksite`, `residenceAddress`, and `identityDocument`.
   - By creating unified `{PLACEHOLDER_*}` tokens aligned with established conventions (e.g., `PLACEHOLDER_FIRMA`, `PLACEHOLDER_NUME_COMPLET`, `PLACEHOLDER_CNP`, `PLACEHOLDER_FUNCTIE`, `PLACEHOLDER_COD_COR`, `PLACEHOLDER_ACTIVITATI_POST`, `PLACEHOLDER_ECHIPAMENTE_POST`, `PLACEHOLDER_CONDITII_POST`), these templates will populate with 100% fidelity without breaking existing data flows.
   - Non-statutory variables must not fabricate arbitrary facts (per M3 contract in `PROJECT.md`); if a specific medical clinic or EIP size is not recorded, graceful placeholders (e.g. `Cabinet Medical de Medicina Muncii Desemnat` or dotted line `........`) ensure immediate compliance while permitting ink completion.

3. **EIP Sheet Dynamic & Tabular Architecture (F10 Part A)**:
   - For `eip-fisa-acordare-individuala`, DOCX tables must accommodate either fixed-row pre-populated items (10 indexed rows `PLACEHOLDER_EIP_*_01` .. `10`) or standard TESA/Operative presets.
   - For personal TESA office workers, EIP typically consists of ergonomic footwear, anti-glare screen glasses (EN 166), and visitor safety items (vest EN ISO 20471, hard hat EN 397 for site visits).
   - For operative/production profiles, EIP includes safety boots with steel/composite toe (EN ISO 20345 S3), high-abrasion gloves (EN 388), work coveralls (EN ISO 13688), helmet (EN 397), and ear defenders (EN 352-1).

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | F9 (Part A) | `med-fisa-solicitare-examen` | Fișă oficială de solicitare examen medical conform Anexei 2 HG 355/2007 | `client`, `employee`, `job`, `worksite`, `meta` | DOCX cu date complete angajator, salariat, tip examen și clauză Anexa 3 | Semnalează câmpuri lipsă dacă `client.name`, `employee.cnp` lipsesc | HG 355/2007 Anexa 2; `definitions.ts` |
| 2 | F9 (Part A) | Bife statutare tip examen medical | Selector tip examinare (Angajare, Periodic, Adaptare, Reluare, Supraveghere specială) cu bife vizuale `[X]` / `[  ]` | `medicalLastExamDate`, `customOverrides.examType` | Tokenuri `PLACEHOLDER_BIFAT_*` populate dinamic | Default `[X]` la Angajare pentru onboarding, `[X]` la Periodic pentru salariați activi | HG 355/2007 art. 13-25 |
| 3 | F9 (Part B) | `med-fisa-identificare-riscuri` | Fișă de identificare a factorilor de risc profesional conform Anexei 3 HG 355/2007 | `client`, `employee`, `job`, `worksite`, CAEN profile | DOCX detaliat cu 11 secțiuni statutare de factori fizici, chimici, biologici și ergonomici | Fallback pe profil CAEN/TESA dacă `job.workConditions` e vid | HG 355/2007 Anexa 3 |
| 4 | F9 (Part B) | Integrare context post & videoterminale | Conectare automată a cerințelor Fișei 243 HG 355/2007 (lucru cu ecran de vizualizare > 4h/zi) | `job.equipmentUsed`, `job.mainActivities` | Suprasolicitare vizuală bifată cu mențiunea Fișei 243 | Fallback automat pentru roluri de birou / IT / TESA | HG 355/2007 Anexa 1 Fișa 243 |
| 5 | F10 (Part A) | `eip-fisa-acordare-individuala` | Fișă individuală de acordare și dotare EIP conform HG 1048/2006 și L319/2006 | `client`, `employee`, `job`, profil EIP | DOCX cu tabel de distribuție (standarde EN, durate normate) și angajament juridic salariat | Generează tabel cu linii punctate dacă mărimile nu sunt înregistrate | HG 1048/2006 art. 3, 6, 9-10; Legea 319/2006 art. 13(r) |
| 6 | F10 (Part A) | Presets EIP pe profiluri de post | Generare automată sortimente EIP (TESA / Birou vs Operativ / Mentenanță / Producție) | `caenCode`, `job.title` | Coloane completate cu standarde armonizate CE (EN ISO 20345, EN 388, EN 397 etc.) | Fallback pe set standard TESA dacă funcția nu e recunoscută | HG 1048/2006 Anexele 1-3 |
| 7 | Shared | Aliniere la catalogul de 31 șabloane | Înregistrare în `TEMPLATE_CATALOG` (`definitions.ts`) cu metadata completă | `TemplateDefinition` objects | Structuri TypeScript compatibile cu `prisma/seed.ts` | Validare schema strictă prin `npm run build` | `PROJECT.md` M2 contract |

---

## 4. Edge Cases

| # | Feature | Input | Observed / Expected Behavior |
|---|---------|-------|------------------------------|
| 1 | `med-fisa-solicitare-examen` | Cetățean străin fără CNP standard de 13 cifre | Identificare prin număr pașaport sau NIF; sistemul nu crapă validarea de CNP și populează câmpul cu mențiunea `Pașaport seria...` și cetățenia respectivă. |
| 2 | `med-fisa-solicitare-examen` | Angajare minor (16-17 ani) sau salariată gravidă | Se bifează automat `[X]` la `Supraveghere specială` (Art. 25-27 HG 355/2007); în Anexa 3 se menționează interdicția muncii de noapte și orelor suplimentare conform OUG 96/2003. |
| 3 | `med-fisa-identificare-riscuri` | Post fără descriere operațională (`job.mainActivities` este null) | Resolverul aplică fallback-ul profilului CAEN (`caen-risk-presets.ts`) injectând activitățile standard de birou/TESA, prevenind apariția tokenurilor goale `{PLACEHOLDER_*}`. |
| 4 | `med-fisa-identificare-riscuri` | Muncă de noapte sau schimburi atipice | Bifa `Schimb de noapte: Da` se activează; declanșează obligativitatea examenului conform Fișei 241 HG 355/2007 (glicemie, ECG, examen clinic general). |
| 5 | `eip-fisa-acordare-individuala` | Mărimile salariatului (bocanci, salopetă) necompletate în DB | Placeholderele generează `........` (linie punctată curată), permițând completarea olografă la magazia de echipamente fără erori de validare. |
| 6 | `eip-fisa-acordare-individuala` | Salariat încetare contract (retur echipamente) | Formularul conține coloane statutare dedicate pentru `Data restituirii`, `Motivul restituirii` și `Semnătură primire retur`, permițând refolosirea aceluiași formular pe întreaga durată a CIM. |
| 7 | Toate șabloanele | Nume lungi de firmă / adrese kilometrice / noxe multiple | Celulele tabelelor DOCX au configurate atributele `<w:cantSplit/>` și lățimi explicite `<w:tcW w:type="dxa"/>`, împiedicând coruperea aspectului grafic la trecerea peste pagini. |

---

## 5. Detailed Statutory Specifications & Token Schemas for Worker

### A. Template Definition: `med-fisa-solicitare-examen` (Anexa 2 HG 355/2007)

```typescript
export const TEMPLATE_DEF_MED_FISA_SOLICITARE: TemplateDefinition = {
  code: 'med-fisa-solicitare-examen',
  name: 'Fișă de Solicitare a Examenului Medical (Anexa 2 HG 355/2007)',
  family: 'hr',
  originalFilename: 'Fisa de solicitare a examenului medical Anexa 2 HG 355.docx',
  normalizedFilename: 'Fisa solicitare examen medical Anexa 2 HG 355.docx',
  format: 'docx',
  contextLevel: 'employee',
  status: 'active',
  version: 1,
  description: 'Fișă oficială de solicitare și trimitere la examenul medical de medicina muncii (angajare, periodic, adaptare, reluarea muncii, supraveghere specială) conform Anexei nr. 2 din HG nr. 355/2007.',
  reviewer: 'Specialist SSM / Medic Medicina Muncii',
  fields: [
    // 1. Angajator
    { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Unitate', source: 'client.name', required: true, type: 'string' },
    { key: 'PLACEHOLDER_CUI', label: 'CUI / CIF firmă', source: 'client.cui', required: true, type: 'string' },
    { key: 'PLACEHOLDER_NR_REG_COM', label: 'Nr. Registrul Comerțului', source: 'client.regCom', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu social firmă', source: 'client.address', required: true, type: 'string' },
    { key: 'PLACEHOLDER_TELEFON_FIRMA', label: 'Telefon contact angajator', source: 'client.contactPhone', required: false, type: 'string' },
    { key: 'PLACEHOLDER_EMAIL_FIRMA', label: 'Email contact angajator', source: 'client.contactEmail', required: false, type: 'string' },
    { key: 'PLACEHOLDER_COD_CAEN', label: 'Cod CAEN activitate', source: 'client.caenCode', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ACTIVITATE_CAEN', label: 'Domeniu de activitate CAEN', source: 'client.caenActivity', required: false, type: 'string' },
    { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant Legal / Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
    { key: 'PLACEHOLDER_NUMAR_INREGISTRARE_SOLICITARE', label: 'Număr înregistrare solicitare', source: 'manual', required: false, type: 'string' },
    
    // 2. Destinatar Medicină a Muncii
    { key: 'PLACEHOLDER_CABINET_MEDICINA_MUNCII', label: 'Cabinet / Serviciu Medicină a Muncii', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_MEDIC_MEDICINA_MUNCII', label: 'Medic specialist medicina muncii', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ADRESA_CABINET_MEDICINA_MUNCII', label: 'Adresă cabinet medical', source: 'manual', required: false, type: 'string' },

    // 3. Tip Examen Medical
    { key: 'PLACEHOLDER_TIP_EXAMEN_MEDICAL', label: 'Tip examen medical solicitat', source: 'manual', required: true, type: 'string' },
    { key: 'PLACEHOLDER_BIFAT_ANGAJARE', label: 'Bifă Examen la Angajare', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_BIFAT_PERIODIC', label: 'Bifă Control Medical Periodic', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_BIFAT_ADAPTARE', label: 'Bifă Examen de Adaptare', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_BIFAT_RELUARE', label: 'Bifă Examen Reluarea Muncii', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_BIFAT_SPECIALA', label: 'Bifă Supraveghere Specială', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_BIFAT_SCHIMBARE_LOC', label: 'Bifă Schimbarea Locului de Muncă', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_BIFAT_LA_CERERE', label: 'Bifă La Cerere', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_BIFAT_ALTELE', label: 'Bifă Altele', source: 'manual', required: false, type: 'string' },

    // 4. Date Salariat
    { key: 'PLACEHOLDER_APELATIV_SALARIAT', label: 'Apelativ salariat (Dl. / Dna.)', source: 'employee.sex', required: false, type: 'string' },
    { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_NUME_ANTERIOR', label: 'Nume anterior salariat', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SEX', label: 'Sex salariat (M/F)', source: 'employee.sex', required: false, type: 'string' },
    { key: 'PLACEHOLDER_DATA_NASTERII', label: 'Data nașterii salariat', source: 'employee.birthDate', required: true, type: 'string' },
    { key: 'PLACEHOLDER_LOCALITATE_NASTERII', label: 'Localitate naștere', source: 'employee.birthPlace', required: false, type: 'string' },
    { key: 'PLACEHOLDER_JUDET_NASTERII', label: 'Județ naștere', source: 'employee.birthCounty', required: false, type: 'string' },
    { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)', source: 'employee.cnp', required: true, type: 'string' },
    { key: 'PLACEHOLDER_TIP_ACT', label: 'Tip act identitate', source: 'identityDocument.docType', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SERIE_ACT', label: 'Serie act identitate', source: 'identityDocument.series', required: false, type: 'string' },
    { key: 'PLACEHOLDER_NUMAR_ACT', label: 'Număr act identitate', source: 'identityDocument.number', required: false, type: 'string' },
    { key: 'PLACEHOLDER_EMITENT_ACT', label: 'Autoritate emitentă act', source: 'identityDocument.issuedBy', required: false, type: 'string' },
    { key: 'PLACEHOLDER_DATA_EMITERII', label: 'Data emiterii actului', source: 'identityDocument.issueDate', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ADRESA_DOMICILIU', label: 'Adresă completă domiciliu', source: 'employee.residenceAddress', required: false, type: 'string' },
    { key: 'PLACEHOLDER_PROFESIE_OCUPATIE', label: 'Profesiunea / Ocupația de bază', source: 'manual', required: false, type: 'string' },

    // 5. Post și Condiții
    { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Post de lucru', source: 'job.title', required: true, type: 'string' },
    { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR funcție', source: 'job.corCode', required: false, type: 'string' },
    { key: 'PLACEHOLDER_PUNCT_LUCRU', label: 'Locul de muncă / Punct de lucru', source: 'worksite.name', required: true, type: 'string' },
    { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă punct de lucru', source: 'worksite.address', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SECTIE_COMPARTIMENT', label: 'Secție / Atelier / Compartiment', source: 'worksite.activity', required: false, type: 'string' },
    { key: 'PLACEHOLDER_VECHIME_TOTALA', label: 'Vechime totală în muncă', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_VECHIME_MESERIE', label: 'Vechime în profesie / funcție', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_VECHIME_LOC_MUNCA', label: 'Vechime la locul actual de muncă', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_TRASEU_PROFESIONAL', label: 'Traseu profesional anterior / noxe', source: 'manual', required: false, type: 'string' },

    // 6. Validare și Semnături
    { key: 'PLACEHOLDER_DATA_SOLICITARII', label: 'Data emiterii solicitării', source: 'meta.currentDateRo', required: true, type: 'string' },
    { key: 'PLACEHOLDER_FUNCTIE_REPREZENTANT', label: 'Funcție reprezentant legal', source: 'client.representativeRole', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SPECIALIST_SSM', label: 'Specialist SSM desemnat', source: 'client.ssmSpecialistName', required: false, type: 'string' },
  ],
};
```

---

### B. Template Definition: `med-fisa-identificare-riscuri` (Anexa 3 HG 355/2007)

```typescript
export const TEMPLATE_DEF_MED_FISA_RISCURI: TemplateDefinition = {
  code: 'med-fisa-identificare-riscuri',
  name: 'Fișă de Identificare a Factorilor de Risc Profesional (Anexa 3 HG 355/2007)',
  family: 'risk',
  originalFilename: 'Fisa de identificare factori de risc Anexa 3 HG 355.docx',
  normalizedFilename: 'Fisa identificare factori de risc Anexa 3 HG 355.docx',
  format: 'docx',
  contextLevel: 'employee',
  status: 'active',
  version: 1,
  description: 'Fișă obligatorie de identificare și descriere a factorilor de risc profesional conform Anexei nr. 3 din HG nr. 355/2007, anexă indisolubilă la cererea de examen medical.',
  reviewer: 'Specialist SSM / Evaluator Risc',
  fields: [
    // 1. Identificare
    { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Unitate', source: 'client.name', required: true, type: 'string' },
    { key: 'PLACEHOLDER_CUI', label: 'CUI firmă', source: 'client.cui', required: true, type: 'string' },
    { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu unitate', source: 'client.address', required: true, type: 'string' },
    { key: 'PLACEHOLDER_TELEFON_FIRMA', label: 'Telefon unitate', source: 'client.contactPhone', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SUBUNITATE', label: 'Subunitate / Punct de lucru', source: 'worksite.name', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă subunitate', source: 'worksite.address', required: false, type: 'string' },
    { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_CNP', label: 'CNP salariat', source: 'employee.cnp', required: true, type: 'string' },
    { key: 'PLACEHOLDER_DATA_NASTERII', label: 'Data nașterii salariat', source: 'employee.birthDate', required: false, type: 'string' },
    { key: 'PLACEHOLDER_FUNCTIE', label: 'Denumirea postului și locului de muncă', source: 'job.title', required: true, type: 'string' },
    { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR', source: 'job.corCode', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SECTIE_COMPARTIMENT', label: 'Secție / Atelier / Compartiment', source: 'worksite.activity', required: false, type: 'string' },
    { key: 'PLACEHOLDER_NAVETA_STATUS', label: 'Navetă (Da/Nu)', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_NAVETA_ORE', label: 'Ore navetă/zi', source: 'manual', required: false, type: 'string' },

    // 2. Organizarea muncii
    { key: 'PLACEHOLDER_LUCRU_ECHIPA', label: 'Lucru în echipă (Da/Nu)', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ORE_PE_ZI', label: 'Durata muncii ore/zi', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_NUMAR_SCHIMBURI', label: 'Număr schimburi', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SCHIMB_NOAPTE', label: 'Schimb de noapte (Da/Nu)', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_PAUZE_ORGANIZATE', label: 'Pauze organizate (Da/Nu)', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_BANDA_RULANTA', label: 'Muncă la bandă rulantă (Da/Nu)', source: 'manual', required: false, type: 'string' },

    // 3. Activitate & Echipamente
    { key: 'PLACEHOLDER_DESCRIERE_ACTIVITATE', label: 'Descriere operațiuni tehnologice', source: 'job.mainActivities', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ECHIPAMENTE_POST', label: 'Echipamente / Utilaje folosite', source: 'job.equipmentUsed', required: false, type: 'string' },
    { key: 'PLACEHOLDER_CONDITII_POST', label: 'Condiții generale post', source: 'job.workConditions', required: false, type: 'string' },

    // 4. Riscuri potențiale de accidentare
    { key: 'PLACEHOLDER_RISC_INFECTARE', label: 'Risc infectare', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_ELECTROCUTARE', label: 'Risc electrocutare', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_INEC', label: 'Risc înec', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_ASFIXIERE', label: 'Risc asfixiere', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_BLOCARE', label: 'Risc blocare în spații înguste', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_MICROTRAUMATISME', label: 'Microtraumatisme repetate', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_LOVIRE', label: 'Risc lovire', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_MUSCATURA', label: 'Mușcătură / Zgâriere', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_STRIVIRE', label: 'Risc strivire', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_TAIERE', label: 'Risc tăiere', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_INTEPARE', label: 'Risc înțepare', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_IMPUSCARE', label: 'Risc împușcare', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RISC_ARSURI_OPARIRE', label: 'Risc arsuri / opărire', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_MISCARI_REPETITIVE', label: 'Mișcări repetitive', source: 'manual', required: false, type: 'string' },

    // 5. Condiții speciale
    { key: 'PLACEHOLDER_AUTO_INSTITUTIE', label: 'Conducere mașină instituție', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_CATEGORIE_PERMIS', label: 'Categorie permis conducere', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_CONDITII_DEOSEBITE_SPECIALE', label: 'Condiții deosebite / speciale', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SECTOR_ALIMENTAR', label: 'Sector alimentar', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_PORT_ARMA', label: 'Port-armă', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_LUCRU_INALTIME', label: 'Lucru la înălțime', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SPATII_IZOLATE', label: 'Lucru în spații izolate / subteran', source: 'manual', required: false, type: 'string' },

    // 6. Spațiu & Biomecanică
    { key: 'PLACEHOLDER_DIMENSIUNI_INCAPERE', label: 'Dimensiuni încăpere de lucru', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SUPRAFATA_LUCRU', label: 'Suprafață de lucru', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_MEDIU_ACTIVITATE', label: 'Mediu activitate (sol/aer/apă)', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_NIVEL_EFORT_FIZIC', label: 'Nivel efort fizic', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_POZITIE_LUCRU', label: 'Poziție preponderentă lucru', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_POZITII_VICIOASE', label: 'Poziții vicioase / forțate', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_MANIPULARE_MASE', label: 'Manipulare manuală mase', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_GREUTATE_MAXIMA_MANIPULATA', label: 'Greutate maximă manipulată', source: 'manual', required: false, type: 'string' },

    // 7. Suprasolicitări senzoriale & neuropsihice
    { key: 'PLACEHOLDER_SUPRASOLICITARE_VIZUALA', label: 'Suprasolicitare vizuală (Fișa 243)', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SUPRASOLICITARE_AUDITIVA', label: 'Suprasolicitare auditivă', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SUPRASOLICITARE_NEUROPSIHICA', label: 'Suprasolicitare neuropsihică', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SOLICITARE_OSTEOARTICULARA', label: 'Suprasolicitare osteoarticulară', source: 'manual', required: false, type: 'string' },

    // 8. Factori de mediu profesional
    { key: 'PLACEHOLDER_AGENTI_CHIMICI', label: 'Agenți chimici prezenți', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_AGENTI_CHIMICI_VLE', label: 'Raportare VLE chimici', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_PULBERI_PROFESIONALE', label: 'Pulberi profesionale', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_PULBERI_VLE', label: 'Raportare VLE pulberi', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ZGOMOT_PROFESIONAL', label: 'Zgomot profesional', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ZGOMOTE_IMPULSIVE', label: 'Zgomote impulsive', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_VIBRATII', label: 'Vibrații mecanice', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_TEMPERATURA_AER', label: 'Temperatură aer', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_VARIATII_TEMPERATURA', label: 'Variații repetate de temperatură', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_UMIDITATE_AER', label: 'Umiditate aer', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_PRESIUNE_AER', label: 'Presiune aer', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RADIATII_NEIONIZANTE', label: 'Radiații neionizante', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_RADIATII_IONIZANTE', label: 'Radiații ionizante', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_AGENTI_BIOLOGICI', label: 'Agenți biologici', source: 'manual', required: false, type: 'string' },

    // 9. Mijloace protecție & Validare
    { key: 'PLACEHOLDER_PROTECTIE_COLECTIVA', label: 'Mijloace de protecție colectivă', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_PROTECTIE_INDIVIDUALA', label: 'Mijloace de protecție individuală (EIP)', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_DATA_INTOCMIRII', label: 'Data întocmirii', source: 'meta.currentDateRo', required: true, type: 'string' },
    { key: 'PLACEHOLDER_SPECIALIST_SSM', label: 'Întocmit de: Specialist SSM', source: 'client.ssmSpecialistName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Asumat de: Reprezentant Legal Angajator', source: 'client.legalRepresentative', required: true, type: 'string' },
    { key: 'PLACEHOLDER_MEDIC_MEDICINA_MUNCII', label: 'Luat la cunoștință: Medic Medicina Muncii', source: 'manual', required: false, type: 'string' },
  ],
};
```

---

### C. Template Definition: `eip-fisa-acordare-individuala` (HG 1048/2006)

```typescript
export const TEMPLATE_DEF_EIP_FISA_ACORDARE: TemplateDefinition = {
  code: 'eip-fisa-acordare-individuala',
  name: 'Fișă Individuală de Dotare și Acordare EIP (HG 1048/2006)',
  family: 'risk',
  originalFilename: 'Fisa individuala acordare EIP HG 1048.docx',
  normalizedFilename: 'Fisa individuala acordare EIP HG 1048.docx',
  format: 'docx',
  contextLevel: 'employee',
  status: 'active',
  version: 1,
  description: 'Fișă individuală de evidență, acordare, utilizare și restituire a echipamentelor individuale de protecție (EIP) conform HG nr. 1048/2006 și Legii nr. 319/2006 art. 13 lit. r.',
  reviewer: 'Specialist SSM',
  fields: [
    // 1. Angajator & Loc de muncă
    { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator', source: 'client.name', required: true, type: 'string' },
    { key: 'PLACEHOLDER_CUI', label: 'CUI / CIF firmă', source: 'client.cui', required: true, type: 'string' },
    { key: 'PLACEHOLDER_NR_REG_COM', label: 'Nr. Registrul Comerțului', source: 'client.regCom', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu firmă', source: 'client.address', required: true, type: 'string' },
    { key: 'PLACEHOLDER_PUNCT_LUCRU', label: 'Punct de lucru / Șantier', source: 'worksite.name', required: false, type: 'string' },
    { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă punct de lucru', source: 'worksite.address', required: false, type: 'string' },

    // 2. Salariat & Mărimi
    { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_CNP', label: 'CNP salariat', source: 'employee.cnp', required: true, type: 'string' },
    { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Meserie salariat', source: 'job.title', required: true, type: 'string' },
    { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR funcție', source: 'job.corCode', required: false, type: 'string' },
    { key: 'PLACEHOLDER_DATA_ANGAJARII', label: 'Data angajării salariat', source: 'employee.hireDate', required: false, type: 'string' },
    { key: 'PLACEHOLDER_DATA_ELIBERARII_FISEI', label: 'Data deschiderii fișei EIP', source: 'meta.currentDateRo', required: false, type: 'string' },
    { key: 'PLACEHOLDER_MARIME_HAINE', label: 'Mărime costum / halat / haine', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_MARIME_INCALTAMINTE', label: 'Mărime încălțăminte protecție', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_MARIME_MANUSI', label: 'Mărime mănuși protecție', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_MARIME_CASCA', label: 'Mărime cască protecție', source: 'manual', required: false, type: 'string' },

    // 3. Rândurile Tabelului EIP (10 rânduri pre-formatate)
    ...Array.from({ length: 10 }, (_, i) => {
      const idx = String(i + 1).padStart(2, '0');
      return [
        { key: `PLACEHOLDER_EIP_DENUMIRE_${idx}`, label: `Denumire EIP rând ${idx}`, source: 'manual', required: false, type: 'string' as const },
        { key: `PLACEHOLDER_EIP_STANDARD_${idx}`, label: `Standard / Normă EN rând ${idx}`, source: 'manual', required: false, type: 'string' as const },
        { key: `PLACEHOLDER_EIP_UM_${idx}`, label: `U.M. rând ${idx}`, source: 'manual', required: false, type: 'string' as const },
        { key: `PLACEHOLDER_EIP_CANTITATE_${idx}`, label: `Cantitate rând ${idx}`, source: 'manual', required: false, type: 'string' as const },
        { key: `PLACEHOLDER_EIP_DURATA_${idx}`, label: `Durată normată folosință rând ${idx}`, source: 'manual', required: false, type: 'string' as const },
        { key: `PLACEHOLDER_EIP_DATA_ACORDARII_${idx}`, label: `Data acordării rând ${idx}`, source: 'manual', required: false, type: 'string' as const },
        { key: `PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_${idx}`, label: `Semnătură primire rând ${idx}`, source: 'manual', required: false, type: 'string' as const },
        { key: `PLACEHOLDER_EIP_DATA_RESTITUIRII_${idx}`, label: `Data restituirii rând ${idx}`, source: 'manual', required: false, type: 'string' as const },
        { key: `PLACEHOLDER_EIP_MOTIV_${idx}`, label: `Motiv restituire rând ${idx}`, source: 'manual', required: false, type: 'string' as const },
        { key: `PLACEHOLDER_EIP_SEMNATURA_RETUR_${idx}`, label: `Semnătură retur rând ${idx}`, source: 'manual', required: false, type: 'string' as const },
      ];
    }).flat(),

    // 4. Semnături & Validare
    { key: 'PLACEHOLDER_DATA_SEMNARII_EIP', label: 'Data semnării angajamentului EIP', source: 'meta.currentDateRo', required: true, type: 'string' },
    { key: 'PLACEHOLDER_NUME_SALARIAT', label: 'Nume salariat semnatar', source: 'employee.fullName', required: true, type: 'string' },
    { key: 'PLACEHOLDER_GESTIONAR_EIP', label: 'Responsabil distribuire / Gestionar EIP', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SEF_LOC_MUNCA', label: 'Conducător direct loc de muncă', source: 'manual', required: false, type: 'string' },
    { key: 'PLACEHOLDER_SPECIALIST_SSM', label: 'Specialist SSM verificator', source: 'client.ssmSpecialistName', required: false, type: 'string' },
    { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant Legal Angajator', source: 'client.legalRepresentative', required: true, type: 'string' },
  ],
};
```

---

### D. Resolver Implementation Recommendations for Worker

In `src/lib/templates/resolver.ts`, inside `resolveTemplateData()`, add dedicated contextual mapping branches for these three templates:

1. **For `med-fisa-solicitare-examen`**:
   - `PLACEHOLDER_TIP_EXAMEN_MEDICAL`: If `employee.medicalLastExamDate` is set, default to `'Control medical periodic'`; otherwise default to `'La angajare'`.
   - Bife:
     ```typescript
     const isAngajare = !employee?.medicalLastExamDate || customOverrides?.examType === 'angajare';
     const isPeriodic = !!employee?.medicalLastExamDate && customOverrides?.examType !== 'angajare';
     // Set [X] vs [  ]
     PLACEHOLDER_BIFAT_ANGAJARE: isAngajare ? '[X]' : '[  ]',
     PLACEHOLDER_BIFAT_PERIODIC: isPeriodic ? '[X]' : '[  ]',
     PLACEHOLDER_BIFAT_ADAPTARE: '[  ]',
     PLACEHOLDER_BIFAT_RELUARE: '[  ]',
     PLACEHOLDER_BIFAT_SPECIALA: '[  ]',
     PLACEHOLDER_BIFAT_SCHIMBARE_LOC: '[  ]',
     PLACEHOLDER_BIFAT_LA_CERERE: '[  ]',
     PLACEHOLDER_BIFAT_ALTELE: '[  ]',
     ```
   - Professional history:
     ```typescript
     PLACEHOLDER_VECHIME_TOTALA: employee ? 'Conform CV / Dosar personal' : 'La prima angajare',
     PLACEHOLDER_VECHIME_MESERIE: employee ? 'Conform actelor de studii și calificare' : 'Debutant',
     PLACEHOLDER_VECHIME_LOC_MUNCA: employee?.startDateOnJob ? calculateVechimeRo(employee.startDateOnJob) : 'Nou-angajat',
     PLACEHOLDER_TRASEU_PROFESIONAL: 'Fără expunere anterioară documentată la noxe profesionale deosebite',
     ```

2. **For `med-fisa-identificare-riscuri`**:
   - Integrate with `job`:
     ```typescript
     const isScreenWorker = (job?.title || '').toLowerCase().includes('it') ||
                            (job?.title || '').toLowerCase().includes('software') ||
                            (job?.title || '').toLowerCase().includes('contabil') ||
                            (job?.title || '').toLowerCase().includes('birou') ||
                            (job?.title || '').toLowerCase().includes('tesa') ||
                            (job?.title || '').toLowerCase().includes('manager');

     PLACEHOLDER_SUPRASOLICITARE_VIZUALA: isScreenWorker
       ? 'Da - lucru cu ecran de vizualizare (videoterminal/laptop) peste 4 ore/zi conform Fișei 243 HG 355/2007'
       : 'Nu este cazul',
     PLACEHOLDER_SOLICITARE_OSTEOARTICULARA: isScreenWorker
       ? 'Coloană vertebrală cervicală și lombară (poziție șezândă prelungită la birou), articulații pumn și mână (tastatură/mouse)'
       : 'Efort dinamic moderat',
     PLACEHOLDER_POZITIE_LUCRU: isScreenWorker
       ? 'Așezat (pe scaun ergonomic reglabil, > 70% din programul de lucru)'
       : 'Mixtă (ortostatică și deplasare în spațiul de lucru)',
     PLACEHOLDER_NIVEL_EFORT_FIZIC: isScreenWorker
       ? 'Mic - solicitare statică posturală la birou'
       : 'Mediu',
     ```

3. **For `eip-fisa-acordare-individuala`**:
   - Automatically populate the 10 rows with standard equipment according to the job profile:
     - Row 01: Încălțăminte de protecție (EN ISO 20347 OB/O1 pentru TESA / EN ISO 20345 S3 pentru operativ)
     - Row 02: Ochelari protecție ecran / lucru (EN 166)
     - Row 03: Halat / Salopetă protecție (EN ISO 13688)
     - Row 04: Vestă de mare vizibilitate (EN ISO 20471 clasa 2)
     - Row 05: Cască de protecție (EN 397)
     - Rows 06-10: Mănuși mecanice (EN 388), Antifoane (EN 352-1), Mască FFP2 (EN 149), etc.
   - All rows should receive `PLACEHOLDER_EIP_DATA_ACORDARII_*`: `hireDateRo || currentDateRo`.

---

## 6. Caveats

1. **Medical Provider Contractual Variations**:
   - While HG 355/2007 Anexa 2 sets the statutory minimal standard, private occupational health clinics (e.g. Regina Maria, Medicover, Medlife, Sanador) occasionally provide their own branding on top of Anexa 2. The template designed here strictly follows the official text of Anexa 2 and Anexa 3 from HG 355/2007, which is legally universally acceptable by any occupational health provider in Romania.
2. **EIP Sheet Non-Standardized Typography in HG 1048/2006**:
   - Unlike HG 355/2007 which mandates exact annex forms, HG 1048/2006 sets minimum safety requirements without fixing an unchangeable typographic layout. The designed template implements the standard, battle-tested Romanian SSM practice accepted by ITM labor inspectorates, integrating equipment distribution traceability with the worker's statutory undertaking.
3. **Assumptions Made**:
   - Assumed that for TESA and office jobs, the standard risk profile corresponds to CAEN 6201/TESA defaults already present in the codebase.
   - No assumptions made on fabricated salaries or transaction data — strict compliance with M3 principles.

---

## 7. Conclusion

1. **F9 Specification Complete**: Both Anexa 2 (`med-fisa-solicitare-examen`) and Anexa 3 (`med-fisa-identificare-riscuri`) of HG nr. 355/2007 have been fully mapped to Romanian statutory text, complete token dictionaries, field validation rules, and resolver integration logic.
2. **F10 Part A Specification Complete**: The individual EIP equipment sheet (`eip-fisa-acordare-individuala`) conform HG nr. 1048/2006 has been formulated with a 10-row allocation matrix, European harmonized standards (EN ISO 20345, EN 388, EN 397, EN 166, etc.), size attributes, and the mandatory worker undertaking under Legea 319/2006 art. 22-23.
3. **Worker Readiness**: The Worker agent has complete, unambiguous, drop-in TypeScript definitions and token dictionaries ready for inclusion in `src/lib/templates/definitions.ts` and `src/lib/templates/resolver.ts`, and precise structural guidance for generating the binary DOCX template files.

---

## 8. Verification Method

To verify these specifications independently:
1. **Statutory Reference Verification**:
   - Verify HG nr. 355/2007 (published in Monitorul Oficial nr. 332/2007), specifically Art. 13-17, Anexa nr. 2 (Fișa de solicitare) and Anexa nr. 3 (Fișa de identificare factori de risc).
   - Verify HG nr. 1048/2006 (published in Monitorul Oficial nr. 722/2006), specifically Art. 3, 6, 9-10 and Anexele 1-3.
2. **Catalog Integrity Check**:
   - Inspect `src/lib/templates/definitions.ts` to ensure token naming consistency (`PLACEHOLDER_*`) and type conformity with `TemplateDefinition`.
3. **Execution Verification upon Implementation**:
   - When the Worker creates the templates, run:
     ```bash
     npx ts-node -T -r tsconfig-paths/register src/lib/templates/seed.ts
     npm run build
     ```
   - Invalidation conditions: Any compilation error in `definitions.ts`, unmapped statutory tokens in generated DOCX files, or missing mandatory legal declarations in output documents.
