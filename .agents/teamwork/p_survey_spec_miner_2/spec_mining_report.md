# Raport Tehnic de Specificație Legală și Arhitectură de Catalog: Cei 6 Piloni de Șabloane Noi (Pilonul 2 - Extindere de la 25 la 31 Șabloane)

**Data investigației:** 4 Noiembrie 2026  
**Agent:** `p_survey_spec_miner_2` (Teamwork Domain Specialist - Specification Miner)  
**Obiectiv:** Sondarea exhaustivă a specificațiilor legale românești autoritare și a cerințelor de integrare tehnică pentru adăugarea celor 6 noi șabloane statutare în catalogul aplicației SSM/HR.

---

## 1. Rezumat Executiv și Situația de Fapt din Codul Sursă

În conformitate cu mandatul primit din `DISPATCH.md`, `ORIGINAL_REQUEST.md` și `PLAN_STRATEGIC_SSM_IGIENA_HR.md`, a fost realizat un audit complet asupra:
1. Bazei de cod existente (`src/lib/templates/definitions.ts`, `src/lib/templates/generator.ts`, `src/lib/templates/resolver.ts`, `src/lib/templates/seed.ts`, `prisma/schema.prisma`).
2. Depozitelor de fișiere de referință (`handoff/`, `sabloane_ssm/`, `templates_registry/normalized/`, `templates_registry/manifests/`).
3. Cadrului legislativ românesc aplicabil (Legea 319/2006, HG 1425/2006, Legea 307/2006, OMAI 712/2005, HG 355/2007, HG 1048/2006, Ordinul MMSS 2171/2022, Legea 53/2003 Codul Muncii cu modificările Legii 283/2022).

### Constatări Cheie privind Fișierele de Referință:
- **Absența fișierelor draft în repo:** Niciunul dintre cele 6 șabloane noi (`ssm-fisa-instruire-individuala`, `psi-fisa-instructaj-individuala`, `med-fisa-solicitare-examen`, `med-fisa-identificare-riscuri`, `eip-fisa-acordare-individuala`, `hr-cim-model-cadru-2022`) nu există fizic ca fișier `.docx` sau `.doc` în directorul `handoff/ssm-template-placeholder-pack/templates/`, `sabloane_ssm/` sau `templates_registry/normalized/`.
- **Prezența contractului trunchiat (`hr-cim-2026`):** În prezent există `Contract individual munca 2026.docx` (`hr-cim-2026`), dar acesta conține doar 7 articole (A–G), ocluzionând capitolele obligatorii H–P din modelul-cadru oficial impus de Ordinul MMSS 2171/2022 și injectând un salariu fictiv static (`6500 lei`).
- **Capacitatea generatorului DOCX:** Motorul de randare `generator.ts` utilizează `PizZip` și `Docxtemplater` cu analiză multi-part pe toate fișierele XML din arhiva `.docx` (inclusiv `word/document.xml`, `header*.xml`, `footer*.xml` și `.rels`). Prin urmare, noile șabloane trebuie livrate ca fișiere `.docx` standardizate în `templates_registry/normalized/`, conținând tabele native Word (`<w:tbl>`) și tokenuri de tip `{PLACEHOLDER_*}`.

---

## 2. Sondarea Autoritară a Celor 6 Șabloane Statutare Noi

### 2.1. Șablonul 1: `ssm-fisa-instruire-individuala`
- **Denumire completă:** Fișa Individuală de Instruire privind Securitatea și Sănătatea în Muncă
- **Baza legală autoritară:** **HG nr. 1425/2006** (pentru aprobarea Normelor metodologice de aplicare a Legii 319/2006), Cap. V „Instruirea lucrătorilor în domeniul securităţii şi sănătăţii în muncă”, art. 74-100 și **Anexa nr. 11**.
- **Sancțiune contravențională la lipsă:** Amendă de la 3.000 lei la 6.000 lei per lucrător neinstruit (Legea 319/2006, art. 39 alin. (6) lit. a).
- **Format:** DOCX (A4, orientare portret, structură pliant/dosar cartonat standard).
- **Context Level:** `employee`.
- **Structură statutară obligatorie (Anexa 11 HG 1425/2006):**
  1. *Copertă / Frontispiciu:* Antet firmă, nume lucrător, CNP, domiciliu, grupa sanguină, calificare/funcție, punct de lucru, data angajării, număr CIM, traseul de deplasare la/de la serviciu (art. 15 lit. r din HG 1425/2006).
  2. *Secțiunea I: Instructajul introductiv-general:* Data efectuării, durata (ore - min. 8 ore conform art. 86), conținutul instruirii/tematica, numele și semnătura persoanei care a instruit (Specialist SSM), semnătura salariatului instruit, numele și semnătura persoanei care a verificat cunoștințele (Reprezentant legal / Conducător SEPP), rezultatul verificării (Admis/Respins).
  3. *Secțiunea II: Instructajul la locul de muncă:* Locul de muncă/postul, data, durata (min. 8 ore conform art. 92), tematica, persoana care a instruit (Conducător direct al locului de muncă), semnătura salariatului, numele și semnătura persoanei care a verificat cunoștințele (Șef ierarhic superior), rezultat testare.
  4. *Secțiunea III: Admiterea la lucru:* Numele și calitatea persoanei care aprobă admiterea (Administrator), data admiterii la lucru, semnătura.
  5. *Secțiunea IV: Instruirea periodică (Tabel multianual):* Cap de tabel standard (Nr. crt., Data instruirii, Durata în ore, Ocupația/funcția, Materialul predat, Numele instructorului, Semnătura instruit, Semnătura instructor, Semnătura verificator). Conține cel puțin 10-15 rânduri pentru evidența multianuală olografă.
  6. *Secțiunea V: Instruirea periodică suplimentară:* Absențe > 30 zile, accidente de muncă, schimbare tehnologie/echipament (art. 98).
  7. *Secțiunea VI: Rezultatele testărilor periodice anuale:* Data, calificativ, comisia de examinare.

---

### 2.2. Șablonul 2: `psi-fisa-instructaj-individuala`
- **Denumire completă:** Fișa Individuală de Instructaj în Domeniul Situațiilor de Urgență
- **Baza legală autoritară:** **Ordinul MAI nr. 712/2005** pentru aprobarea Dispoziţiilor generale privind instruirea salariaţilor în domeniul situaţiilor de urgenţă (modificat și completat prin OMAI nr. 786/2005), art. 27-54 și **Anexă**; coroborat cu **Legea nr. 307/2006** privind apărarea împotriva incendiilor.
- **Sancțiune contravențională la lipsă:** Amendă de la 2.500 lei la 5.000 lei (Legea 307/2006, art. 44).
- **Format:** DOCX (A4, orientare portret).
- **Context Level:** `employee`.
- **Structură statutară obligatorie (Anexa OMAI 712/2005):**
  1. *Antet & Date Identificare Salariat:* Operator economic, punct de lucru, nume și prenume, data nașterii, domiciliu, funcția/meseria, atelier/birou, data angajării.
  2. *Instructajul introductiv-general:* Durata instructajului (min. 8 ore conform deciziei interne), data instructajului, problemele principale prelucrate (norme PSI/SU, plan de evacuare, stingătoare), numele și prenumele persoanei care a efectuat instructajul (Cadru tehnic PSI / Responsabil PSI), semnătura instruitului, semnătura persoanei care a verificat.
  3. *Instructajul specific locului de muncă:* Durata (min. 8 ore), data, probleme prelucrate specifice atelierului/locului, conducătorul locului de muncă, semnături, admiterea la lucru (nume, dată, semnătură).
  4. *Instructajul periodic:* Tabel tipizat de consemnare (Data, Durata ore, Tematica prelucrată, Nume instructor, Semnătură salariat, Semnătură instructor, Semnătură verificator).
  5. *Instructajul la reluarea activității și exerciții de evacuare:* Evidența participării la exercițiile practice anuale/semestriale de simulare a evacuării în caz de incendiu (art. 37-43).

---

### 2.3. Șablonul 3: `med-fisa-solicitare-examen`
- **Denumire completă:** Fișa de Solicitare a Examenului Medical la Angajare / Periodic / Reluare
- **Baza legală autoritară:** **HG nr. 355/2007** privind supravegherea sănătăţii lucrătorilor (cu modificările ulterioare), art. 16 alin. (1) și **Anexa nr. 2**; coroborat cu **Codul Muncii (Legea 53/2003)** art. 27.
- **Sancțiune contravențională / juridică la lipsă:** Amendă de la 3.500 lei la 7.000 lei și **nulitatea absolută a contractului individual de muncă** încheiat fără aviz medical prealabil.
- **Format:** DOCX (A4, 1-2 pagini).
- **Context Level:** `employee`.
- **Structură statutară obligatorie (Anexa 2 HG 355/2007):**
  1. *Antet Angajator:* Societatea, CUI, Reg. Comerțului, sediu social, punct de lucru, telefon/email, număr înregistrare/ieșire.
  2. *Destinatar:* Serviciul de medicina muncii / Clinica medicală parteneră.
  3. *Date Salariat:* Nume, prenume, sex (M/F), data nașterii, CNP, act identitate (tip, serie, număr, emitent, dată emitere), domiciliu.
  4. *Date Profesionale:* Postul/funcția solicitată, cod COR, vechime totală în muncă, vechime în profesie.
  5. *Tipul Examenului Medical Solicitat (căsuțe bifabile):*
     - [ ] La angajare
     - [ ] Examen medical periodic
     - [ ] La reluarea activității (după concediu medical > 30 zile sau întrerupere > 6 luni)
     - [ ] La schimbarea locului de muncă / reconversie
     - [ ] Supraveghere specială
  6. *Descrierea Condițiilor de Muncă:* Descrierea activităților de bază, durată timp de muncă (ore/zi), lucru în schimburi (zi/noapte), utilaje/echipamente folosite, mențiune atașare Anexa 3 (Factori de risc).
  7. *Semnături:* Angajator (reprezentant legal), Serviciu SSM (specialist), Data emiterii.

---

### 2.4. Șablonul 4: `med-fisa-identificare-riscuri`
- **Denumire completă:** Fișa de Identificare a Factorilor de Risc Profesional
- **Baza legală autoritară:** **HG nr. 355/2007**, art. 16 alin. (2) și **Anexa nr. 3**.
- **Format:** DOCX (A4, formular tipizat cu grile de bife).
- **Context Level:** `employee`.
- **Structură statutară obligatorie (Anexa 3 HG 355/2007):**
  1. *Antet Angajator & Date Lucrător:* Unitate, CUI, sediu, punct de lucru, departament, nume și prenume lucrător, CNP, funcție, cod COR.
  2. *Descrierea Succintă a Postului:* Atribuții principale, utilaje/mașini acționate, timp de lucru.
  3. *Grila Factorilor de Risc Profesional (Secțiuni conform Anexei 3):*
     - *I. Factori de risc fizici:* Zgomot (sub/peste 80 dB, peste 85 dB), vibrații (mână-braț / corp), microclimat (temperaturi extreme, curenți), radiații (neionizante UV/laser/electromagnetice, ionizante), iluminat necorespunzător.
     - *II. Factori de risc chimici:* Pulberi (lemn, ciment, praf industrial), agenți chimici toxici (acizi, baze, solvenți, vopsele), agenți cancerigeni/mutageni, alergeni/sensibilizanți.
     - *III. Factori de risc biologici:* Grupe de risc 1-4, fluide biologice, deșeuri.
     - *IV. Suprasolicitare biomecanică & ergonomică:* Manipulare mase (< 10 kg, 10-25 kg, > 25 kg), ortostatism prelungit (> 50% din tură), mișcări repetitive, lucru la videoterminal / ecran calculator (> 4 ore/zi conform HG 1028/2006).
     - *V. Factori psihosenzoriali & organizare:* Muncă de noapte (art. 125 Codul Muncii), ritm impus, izolare, atenție concentrată.
     - *VI. Riscuri particulare de accidentare:* Lucru la înălțime (> 2m), conducere autovehicule societate, pericol de electrocutare.
     - *VII. EIP impus la post:* Încălțăminte protecție, mănuși, ochelari, cască etc.
  4. *Semnături:* Medic de medicina muncii (luat la cunoștință), Specialist SSM (întocmit), Conducător loc de muncă (verificat), Reprezentant legal (aprobat).

---

### 2.5. Șablonul 5: `eip-fisa-acordare-individuala`
- **Denumire completă:** Fișa Individuală de Dotare și Acordare a Echipamentului Individual de Protecție (EIP)
- **Baza legală autoritară:** **HG nr. 1048/2006** privind cerinţele minime de securitate şi sănătate pentru utilizarea de către lucrători a EIP la locul de muncă; **HG nr. 1425/2006**, art. 15 lit. d (elaborarea normativului intern de dotare); **Legea 319/2006** art. 13 lit. r și art. 23.
- **Sancțiune contravențională la lipsă:** Amendă de la 4.000 lei la 8.000 lei (Legea 319/2006, art. 39 alin. (4)).
- **Format:** DOCX (A4, orientare portret).
- **Context Level:** `employee`.
- **Structură statutară obligatorie:**
  1. *Antet Angajator & Date Lucrător:* Firmă, CUI, sediu, punct de lucru, nume lucrător, CNP, funcție, cod COR, departament/atelier.
  2. *Mărimi și Dimensiuni Salariat:* Mărime încălțăminte, talie salopetă/haină, mărime mănuși/cască.
  3. *Tabel de Acordare EIP (cap de tabel conform HG 1048/2006):*
     - Nr. crt.
     - Denumire sortiment EIP (ex: Încălțăminte de securitate S3, Ochelari protecție, Salopetă de lucru, Mănuși protecție mecanică, Vestă reflectorizantă, Antifoane, Cască)
     - Riscul profesional prevenit
     - Cantitate acordată (buc/perechi)
     - Data acordării
     - Durata normată de utilizare (luni / până la uzură)
     - Data restituirii / scoaterii din uz
     - Semnătură de primire a salariatului
     - Semnătură de predare (Magazioner / Responsabil EIP)
  4. *Angajamentul Salariatului:* Obligația de purtare permanentă la locul de muncă, întreținere în stare curată, interdicția modificării/înstrăinării și raportarea oricărei degradări (art. 23 din Legea 319/2006).
  5. *Semnături:* Salariat, Responsabil acordare EIP (conform Deciziei 04), Specialist SSM, Reprezentant legal.

---

### 2.6. Șablonul 6: `hr-cim-model-cadru-2022`
- **Denumire completă:** Contract Individual de Muncă Model-Cadru conform Ordinului MMSS nr. 2.171/2022
- **Baza legală autoritară:** **Ordinul MMSS nr. 2.171/2022** pentru aprobarea modelului-cadru al contractului individual de muncă (M. Of. nr. 1180 din 9.12.2022); **Legea nr. 53/2003 - Codul Muncii** cu modificările aduse prin **Legea nr. 283/2022**; **Directiva (UE) 2019/1152** privind transparența condițiilor de muncă.
- **Diferență critică față de `hr-cim-2026`:** Contractul existent conținea doar 7 articole (A-G), oprindu-se la salariu și ocluzionând capitolele H-P. Modelul 2022 conține integral Capitolele A–P, elimină salariul fictiv și integrează noile cerințe europene (dreptul de a munci la mai mulți angajatori, formare profesională suportată de angajator, procedură de conciliere amiabilă).
- **Format:** DOCX (A4, 4-6 pagini).
- **Context Level:** `employee`.
- **Structură statutară completă (Capitolele A – P conform Ordinului 2171/2022):**
  - *Părțile Contractante:* Angajator (date complete identificare + reprezentant) și Salariat (date CI, CNP, domiciliu, permis de muncă dacă este străin). Număr CIM și data semnării.
  - *Cap. A. Obiectul contractului:* Prestarea muncii și plata salariului.
  - *Cap. B. Durata contractului:* Nedeterminată (data începerii) sau determinată (temei art. 83 Codul Muncii, dată început, dată sfârșit).
  - *Cap. C. Locul de muncă:* Punct de lucru determinat sau muncă mobilă (teren/clienți) / telemuncă.
  - *Cap. D. Felul muncii:* Funcția/meseria conform COR și trimitere la fișa postului anexată.
  - *Cap. E. Criteriile de evaluare:* Criterii din Regulamentul Intern și obiective de performanță.
  - *Cap. F. Condiții de muncă:* Normale / deosebite / speciale (Legea 360/2023).
  - *Cap. G. Durata muncii:* Normă întreagă (8h/zi, 40h/săpt, repartizare, interval) sau fracțiune de normă (ore/zi, program, interdicție ore suplimentare); condițiile efectuării și compensării orelor suplimentare (compensare în 90 zile cu timp liber plătit sau spor min. 75%).
  - *Cap. H. Concediul:* Durata concediului de odihnă anual (min. 20 zile lucrătoare; implicit 21) și concediu suplimentar (dacă e cazul).
  - *Cap. I. Salariul:* Salariul de bază lunar brut, sporuri/alte adaosuri, data plății, modalitatea plății (cont bancar IBAN și bancă sau numerar).
  - *Cap. J. Drepturi și obligații SSM:* EIP gratuit, echipament individual de lucru, materiale igienico-sanitare, alimentație de protecție.
  - *Cap. K. Alte clauze:* Perioada de probă (max. 90 zile calendaristice execuție, max. 120 conducere conform art. 31), perioada de preaviz la concediere (min. 20 zile lucrătoare conform art. 75), perioada de preaviz la demisie (max. 20 zile lucrătoare execuție, max. 45 conducere conform art. 81 alin. 4), clauze facultative (formare, confidențialitate, neconcurență, mobilitate).
  - *Cap. L. Drepturi și obligații generale ale părților:* Drepturi și obligații art. 39 și 40 Codul Muncii + prevederile Legii 283/2022 (dreptul de cumul de funcții fără suprapunere de program, interdicția tratamentului nefavorabil).
  - *Cap. M. Formarea profesională suportată de angajator:* Dreptul la cursuri de formare conform art. 193-200 Codul Muncii suportate de angajator.
  - *Cap. N. Asigurări medicale private / Pensii facultative:* Beneficii suplimentare dacă sunt suportate de firmă.
  - *Cap. O. Procedura de soluționare amiabilă a conflictelor individuale de muncă:* Concilierea amiabilă conform art. 231^1 Codul Muncii cu consultant extern, competența teritorială a Tribunalului.
  - *Cap. P. Dispoziții finale:* CCM aplicabil, 2 exemplare originale, semnare Angajator și Salariat, mențiune olografă de primire a exemplarului original de către salariat cu dată și semnătură.

---

## 3. Schema Exactă a Tokenurilor și Definițiile de Catalog pentru `src/lib/templates/definitions.ts`

În conformitate cu interfața `TemplateDefinition`, `TemplateFieldDef` și `TEMPLATE_CATALOG`, cele 6 șabloane noi se adaugă la catalogul existent (mărind catalogul de la 25 la 31 șabloane):

```typescript
// ============================================================================
// 6 ȘABLOANE STATUTARE NOI PENTRU PILONUL 2 (EXTINDERE DE LA 25 LA 31)
// ============================================================================

export const NEW_STATUTORY_TEMPLATES: TemplateDefinition[] = [
  // 1. Fișa Individuală de Instruire SSM (Anexa 11 HG 1425/2006)
  {
    code: 'ssm-fisa-instruire-individuala',
    name: 'Fișa Individuală de Instruire SSM - Anexa 11 HG 1425/2006',
    family: 'training',
    originalFilename: 'Fisa Individuala de Instruire SSM.docx',
    normalizedFilename: 'Fisa Individuala de Instruire SSM.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Fișa individuală de instruire privind securitatea și sănătatea în muncă conform modelului oficial din Anexa nr. 11 la HG nr. 1425/2006 (instructaj introductiv general, la locul de muncă, admitere la lucru și consemnarea instruirilor periodice).',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod Unic de Înregistrare (CUI)', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NR_REG_COM', label: 'Nr. Reg. Comerțului (Jxx/xxx/xxxx)', source: 'client.regCom', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu social firmă', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant Legal / Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_NASTERII', label: 'Data nașterii salariat', source: 'employee.birthDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_LOCALITATE_NASTERII', label: 'Localitate naștere', source: 'employee.birthPlace', required: false, type: 'string' },
      { key: 'PLACEHOLDER_JUDET_NASTERII', label: 'Județ naștere', source: 'employee.birthCounty', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_DOMICILIU', label: 'Adresă completă domiciliu', source: 'residence.addressFull', required: true, type: 'string' },
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Ocupație', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR funcție (6 cifre)', source: 'job.corCode', required: true, type: 'string' },
      { key: 'PLACEHOLDER_PUNCT_LUCRU', label: 'Denumire punct de lucru', source: 'worksite.name', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă punct de lucru / loc muncă', source: 'worksite.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_ANGAJARII', label: 'Data angajării', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUMAR_CIM', label: 'Număr contract individual de muncă', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_SPECIALIST_SSM', label: 'Specialist / Serviciu Desemnat SSM', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_PRESTATOR_SSM', label: 'Prestator servicii SSM', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_DOCUMENT', label: 'Data documentului', source: 'meta.currentDateRo', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUMAR_FISA_SSM', label: 'Număr fișă instruire SSM', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_GRUPA_SANGUINA', label: 'Grupă sanguină și RH', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_TRASEU_DEPLASARE', label: 'Traseu deplasare la/de la serviciu', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_INSTRUIRE_INTRODUCTIV', label: 'Data instruirii introductiv-generale', source: 'employee.hireDate', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DURATA_INSTRUIRE_INTRODUCTIV', label: 'Durată instruire introductivă (ore)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_TEMATICA_INTRODUCTIV', label: 'Tematică instruire introductivă', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_INSTRUCTOR_INTRODUCTIV', label: 'Instructor instruire introductivă', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_VERIFICATOR_INTRODUCTIV', label: 'Verificator însușire cunoștințe introductiv', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_REZULTAT_TESTARE_INTRODUCTIV', label: 'Rezultat verificare cunoștințe introductiv', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_INSTRUIRE_LOC_MUNCA', label: 'Data instruirii la locul de muncă', source: 'employee.hireDate', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DURATA_INSTRUIRE_LOC_MUNCA', label: 'Durată instruire la locul de muncă (ore)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_TEMATICA_LOC_MUNCA', label: 'Tematică instruire la locul de muncă', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_INSTRUCTOR_LOC_MUNCA', label: 'Instructor la locul de muncă', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_VERIFICATOR_LOC_MUNCA', label: 'Verificator instruire la locul de muncă', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_ADMITERE_LUCRU', label: 'Data admiterii la lucru', source: 'employee.hireDate', required: false, type: 'string' },
      { key: 'PLACEHOLDER_NUME_ADMITERE_LUCRU', label: 'Persoană care autorizează admiterea la lucru', source: 'client.legalRepresentative', required: false, type: 'string' },
    ],
  },

  // 2. Fișa Individuală de Instructaj în Domeniul Situațiilor de Urgență (OMAI 712/2005)
  {
    code: 'psi-fisa-instructaj-individuala',
    name: 'Fișa Individuală de Instructaj în Domeniul Situațiilor de Urgență - OMAI 712/2005',
    family: 'training',
    originalFilename: 'Fisa Individuala de Instructaj SU PSI.docx',
    normalizedFilename: 'Fisa Individuala de Instructaj SU PSI.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Fișa individuală de instructaj în domeniul situațiilor de urgență conform modelului legal din Anexa la OMAI nr. 712/2005 (instructaj introductiv general, specific locului de muncă, periodic și exerciții de evacuare).',
    reviewer: 'Cadru Tehnic PSI',
    fields: [
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire operator economic / Angajator', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod Unic de Înregistrare (CUI)', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu / Punct de lucru', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant Legal / Conducător Unitate', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_NASTERII', label: 'Data nașterii salariat', source: 'employee.birthDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_LOCALITATE_NASTERII', label: 'Localitate naștere', source: 'employee.birthPlace', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_DOMICILIU', label: 'Adresă domiciliu salariat', source: 'residence.addressFull', required: true, type: 'string' },
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Meserie', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_PUNCT_LUCRU', label: 'Locul de muncă / Atelier', source: 'worksite.name', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_ANGAJARII', label: 'Data angajării', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_RESPONSABIL_PSI', label: 'Responsabil / Cadru Tehnic PSI', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_DOCUMENT', label: 'Data documentului', source: 'meta.currentDateRo', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUMAR_FISA_PSI', label: 'Număr fișă instructaj PSI', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_PSI_INTRODUCTIV', label: 'Data instructaj introductiv general PSI', source: 'employee.hireDate', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DURATA_PSI_INTRODUCTIV', label: 'Durată instructaj introductiv PSI (ore)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_TEMATICA_PSI_INTRODUCTIV', label: 'Tematică instructaj introductiv general PSI', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_INSTRUCTOR_PSI_INTRODUCTIV', label: 'Instructor introductiv general PSI', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_VERIFICATOR_PSI_INTRODUCTIV', label: 'Verificator instructaj introductiv PSI', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_PSI_LOC_MUNCA', label: 'Data instructaj specific locului de muncă PSI', source: 'employee.hireDate', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DURATA_PSI_LOC_MUNCA', label: 'Durată instructaj specific PSI (ore)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_TEMATICA_PSI_LOC_MUNCA', label: 'Tematică specifică loc de muncă PSI', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_INSTRUCTOR_PSI_LOC_MUNCA', label: 'Instructor la locul de muncă PSI', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_PSI_ADMITERE_LUCRU', label: 'Data admiterii la lucru PSI', source: 'employee.hireDate', required: false, type: 'string' },
    ],
  },

  // 3. Fișa de Solicitare a Examenului Medical (Anexa 2 HG 355/2007)
  {
    code: 'med-fisa-solicitare-examen',
    name: 'Fișa de Solicitare a Examenului Medical - Anexa 2 HG 355/2007',
    family: 'hr',
    originalFilename: 'Fisa Solicitare Examen Medical.docx',
    normalizedFilename: 'Fisa Solicitare Examen Medical.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Fișa oficială de trimitere a salariatului/candidatului la examenul medical de medicina muncii (angajare, periodic, reluare activitate) conform Anexei nr. 2 la HG nr. 355/2007.',
    reviewer: 'Operator HR',
    fields: [
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod Unic de Înregistrare (CUI)', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NR_REG_COM', label: 'Nr. Reg. Comerțului (Jxx/xxx/xxxx)', source: 'client.regCom', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu social firmă', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_TELEFON_CONTACT', label: 'Telefon contact firmă', source: 'client.contactPhone', required: false, type: 'string' },
      { key: 'PLACEHOLDER_EMAIL_CONTACT', label: 'Email contact firmă', source: 'client.contactEmail', required: false, type: 'string' },
      { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant Legal / Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME', label: 'Nume familie salariat', source: 'employee.lastName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_PRENUME', label: 'Prenume salariat', source: 'employee.firstName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_SEX', label: 'Sex salariat (M/F)', source: 'employee.sex', required: false, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_NASTERII', label: 'Data nașterii salariat', source: 'employee.birthDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_DOMICILIU', label: 'Adresă completă domiciliu', source: 'residence.addressFull', required: true, type: 'string' },
      { key: 'PLACEHOLDER_TIP_ACT', label: 'Tip act identitate (C.I./B.I./Pașaport)', source: 'identity.docType', required: true, type: 'string' },
      { key: 'PLACEHOLDER_SERIE_ACT', label: 'Serie act identitate', source: 'identity.series', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUMAR_ACT', label: 'Număr act identitate', source: 'identity.number', required: true, type: 'string' },
      { key: 'PLACEHOLDER_EMITENT_ACT', label: 'Autoritate emitentă act identitate', source: 'identity.issuedBy', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_EMITERII', label: 'Data eliberării actului', source: 'identity.issueDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Ocupație', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR funcție (6 cifre)', source: 'job.corCode', required: true, type: 'string' },
      { key: 'PLACEHOLDER_PUNCT_LUCRU', label: 'Denumire punct de lucru', source: 'worksite.name', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă punct de lucru / loc muncă', source: 'worksite.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_SPECIALIST_SSM', label: 'Specialist / Serviciu Desemnat SSM', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_DOCUMENT', label: 'Data documentului', source: 'meta.currentDateRo', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUMAR_SOLICITARE_MED', label: 'Număr de ieșire solicitare examen medical', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_CLINICA_MEDICINA_MUNCII', label: 'Clinica de Medicina Muncii', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_TIP_EXAMEN_MEDICAL', label: 'Tipul examenului solicitat', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_VECHIME_MUNCA', label: 'Vechime totală în muncă', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_VECHIME_POST', label: 'Vechime pe postul de lucru', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ACTIVITATI_POST', label: 'Activități principale desfășurate', source: 'job.mainActivities', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ECHIPAMENTE_POST', label: 'Echipamente/utilaje folosite', source: 'job.equipmentUsed', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ORE_PE_ZI', label: 'Număr ore de muncă pe zi', source: 'manual', required: false, type: 'number' },
      { key: 'PLACEHOLDER_PROGRAM_LUCRU', label: 'Interval program / schimburi', source: 'manual', required: false, type: 'string' },
    ],
  },

  // 4. Fișa de Identificare a Factorilor de Risc Profesional (Anexa 3 HG 355/2007)
  {
    code: 'med-fisa-identificare-riscuri',
    name: 'Fișa de Identificare a Factorilor de Risc Profesional - Anexa 3 HG 355/2007',
    family: 'risk',
    originalFilename: 'Fisa Identificare Factori Risc Profesional.docx',
    normalizedFilename: 'Fisa Identificare Factori Risc Profesional.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Fișa oficială de identificare a factorilor de risc profesional conform Anexei nr. 3 la HG nr. 355/2007 (factori fizici, chimici, biologici, ergonomici, psihosenzoriali și riscuri de accidentare asociate).',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod Unic de Înregistrare (CUI)', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu social firmă', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant Legal / Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Ocupație', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR funcție (6 cifre)', source: 'job.corCode', required: true, type: 'string' },
      { key: 'PLACEHOLDER_PUNCT_LUCRU', label: 'Denumire punct de lucru', source: 'worksite.name', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DEPARTAMENT', label: 'Departament / Atelier', source: 'worksite.activity', required: false, type: 'string' },
      { key: 'PLACEHOLDER_SPECIALIST_SSM', label: 'Specialist / Serviciu Desemnat SSM', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_DOCUMENT', label: 'Data documentului', source: 'meta.currentDateRo', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ACTIVITATI_POST', label: 'Activități principale desfășurate', source: 'job.mainActivities', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ECHIPAMENTE_POST', label: 'Echipamente/utilaje folosite', source: 'job.equipmentUsed', required: false, type: 'string' },
      { key: 'PLACEHOLDER_CONDITII_POST', label: 'Condiții de lucru relevante', source: 'job.workConditions', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ORE_PE_ZI', label: 'Număr ore de muncă pe zi', source: 'manual', required: false, type: 'number' },
      { key: 'PLACEHOLDER_PROGRAM_LUCRU', label: 'Interval program / schimburi', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_RISCURI_FIZICE_TEXT', label: 'Factori de risc fizici identificați', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_RISCURI_CHIMICE_TEXT', label: 'Factori de risc chimici identificați', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_RISCURI_BIOLOGICE_TEXT', label: 'Factori de risc biologici identificați', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_RISCURI_ERGONOMICE_TEXT', label: 'Factori de suprasolicitare ergonomică', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_RISCURI_PSIHOSOCIALE_TEXT', label: 'Factori de risc psihosenzoriali și organizare', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_RISCURI_ACCIDENTARE_TEXT', label: 'Riscuri de accidentare asociate postului', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_EIP_NECESAR_TEXT', label: 'Echipament individual de protecție obligatoriu', source: 'manual', required: false, type: 'string' },
    ],
  },

  // 5. Fișa Individuală de Dotare și Acordare EIP (HG 1048/2006)
  {
    code: 'eip-fisa-acordare-individuala',
    name: 'Fișa Individuală de Dotare și Acordare EIP - HG 1048/2006',
    family: 'risk',
    originalFilename: 'Fisa Individuala Dotare EIP.docx',
    normalizedFilename: 'Fisa Individuala Dotare EIP.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Fișa individuală de dotare și evidență a predării-primirii echipamentului individual de protecție (EIP) conform HG nr. 1048/2006 și art. 15 lit. d din HG 1425/2006.',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod Unic de Înregistrare (CUI)', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu social firmă', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant Legal / Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Ocupație', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR funcție (6 cifre)', source: 'job.corCode', required: true, type: 'string' },
      { key: 'PLACEHOLDER_PUNCT_LUCRU', label: 'Denumire punct de lucru', source: 'worksite.name', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DEPARTAMENT', label: 'Departament / Atelier', source: 'worksite.activity', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_ANGAJARII', label: 'Data angajării', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_SPECIALIST_SSM', label: 'Specialist / Serviciu Desemnat SSM', source: 'manual', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_DOCUMENT', label: 'Data documentului', source: 'meta.currentDateRo', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUMAR_FISA_EIP', label: 'Număr fișă individuală EIP', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_MARIME_INCALTAMINTE', label: 'Mărime încălțăminte de protecție', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_TALIE_SALOPETA', label: 'Talie salopetă / haină de protecție', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_MASURA_MANUSI', label: 'Măsură mănuși de protecție', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_RESPONSABIL_EIP', label: 'Responsabil distribuire EIP / Gestionar', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_ACORDARE_EIP', label: 'Data distribuirii echipamentului', source: 'meta.currentDateRo', required: false, type: 'string' },
    ],
  },

  // 6. Contract Individual de Muncă Model-Cadru 2022 (Ordin MMSS 2171/2022)
  {
    code: 'hr-cim-model-cadru-2022',
    name: 'Contract Individual de Muncă Model-Cadru conform Ordinului MMSS 2171/2022',
    family: 'hr',
    originalFilename: 'Contract Individual Munca Model-Cadru 2022.docx',
    normalizedFilename: 'Contract Individual Munca Model-Cadru 2022.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Modelul-cadru complet al contractului individual de muncă aprobat prin Ordinul MMSS nr. 2171/2022, incluzând Capitolele A-P, clauzele Directivei (UE) 2019/1152 și modificările Legii nr. 283/2022.',
    reviewer: 'Operator HR',
    fields: [
      { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator', source: 'client.name', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CUI', label: 'Cod Unic de Înregistrare (CUI)', source: 'client.cui', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NR_REG_COM', label: 'Nr. Reg. Comerțului (Jxx/xxx/xxxx)', source: 'client.regCom', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_FIRMA', label: 'Adresă sediu social firmă', source: 'client.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_TELEFON_CONTACT', label: 'Telefon contact firmă', source: 'client.contactPhone', required: false, type: 'string' },
      { key: 'PLACEHOLDER_EMAIL_CONTACT', label: 'Email contact firmă', source: 'client.contactEmail', required: false, type: 'string' },
      { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant Legal / Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CALITATE_REPREZENTANT', label: 'Calitate reprezentant legal', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_DOMICILIU', label: 'Adresă completă domiciliu', source: 'residence.addressFull', required: true, type: 'string' },
      { key: 'PLACEHOLDER_TIP_ACT', label: 'Tip act identitate (C.I./B.I./Pașaport)', source: 'identity.docType', required: true, type: 'string' },
      { key: 'PLACEHOLDER_SERIE_ACT', label: 'Serie act identitate', source: 'identity.series', required: true, type: 'string' },
      { key: 'PLACEHOLDER_NUMAR_ACT', label: 'Număr act identitate', source: 'identity.number', required: true, type: 'string' },
      { key: 'PLACEHOLDER_EMITENT_ACT', label: 'Autoritate emitentă act identitate', source: 'identity.issuedBy', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_EMITERII', label: 'Data eliberării actului', source: 'identity.issueDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_PERMIS_MUNCA', label: 'Permis de muncă (cetățeni străini)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Ocupație', source: 'job.title', required: true, type: 'string' },
      { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR funcție (6 cifre)', source: 'job.corCode', required: true, type: 'string' },
      { key: 'PLACEHOLDER_PUNCT_LUCRU', label: 'Denumire punct de lucru', source: 'worksite.name', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ADRESA_PUNCT_LUCRU', label: 'Adresă punct de lucru / loc muncă', source: 'worksite.address', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DEPARTAMENT', label: 'Departament / Atelier', source: 'worksite.activity', required: false, type: 'string' },
      { key: 'PLACEHOLDER_NUMAR_CIM', label: 'Număr contract individual de muncă', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_SEMNARE', label: 'Data semnării CIM', source: 'meta.currentDateRo', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_INCEPERE', label: 'Data începerii activității', source: 'employee.hireDate', required: true, type: 'string' },
      { key: 'PLACEHOLDER_DATA_SFARSIT', label: 'Data sfârșit CIM (durată determinată)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ARTICOL_DURATA_DETERMINATA', label: 'Temei durată determinată', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ORE_PE_ZI', label: 'Număr ore de muncă pe zi', source: 'manual', required: false, type: 'number' },
      { key: 'PLACEHOLDER_ORE_PE_SAPTAMANA', label: 'Număr ore de muncă pe săptămână', source: 'manual', required: false, type: 'number' },
      { key: 'PLACEHOLDER_PROGRAM_LUCRU', label: 'Interval program de lucru', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ZILE_CONCEDIU', label: 'Zile de concediu de odihnă anual', source: 'manual', required: false, type: 'number' },
      { key: 'PLACEHOLDER_SALARIU_BRUT', label: 'Salariu de bază lunar brut (lei)', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ALTE_DREPTURI_SALARIALE', label: 'Alte sporuri / drepturi salariale', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_DATA_PLATA', label: 'Data plății salariului', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_IBAN_SALARIAT', label: 'Cont IBAN salariat virare salariu', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_BANCA_SALARIAT', label: 'Banca deserventă a salariatului', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_ZILE_PROBA', label: 'Durată perioadă de probă (zile calendaristice)', source: 'manual', required: false, type: 'number' },
      { key: 'PLACEHOLDER_ZILE_PREAVIZ_CONCEDIERE', label: 'Zile lucrătoare preaviz concediere', source: 'manual', required: false, type: 'number' },
      { key: 'PLACEHOLDER_ZILE_PREAVIZ_DEMISIONARE', label: 'Zile lucrătoare preaviz demisie', source: 'manual', required: false, type: 'number' },
      { key: 'PLACEHOLDER_CCM_APLICABIL', label: 'Contractul colectiv de muncă aplicabil', source: 'manual', required: false, type: 'string' },
      { key: 'PLACEHOLDER_BENEFICII_EXTRA', label: 'Asigurare medicală privată / Pensie facultativă', source: 'manual', required: false, type: 'string' },
    ],
  },
];
```

---

## 4. Strategia Tehnică de Creare și Generare DOCX

### 4.1. Analiza Opțiunilor de Generare
În cadrul investigației am analizat cerințele tehnice pentru adăugarea fișierelor șablon în `templates_registry/normalized/`:

1. **Opțiunea 1: Generare Programatică a Șabloanelor DOCX prin biblioteca `docx` (Node.js)**
   - *Mecanism:* Un script utilitar (`scripts/generate-new-docx-templates.ts`) utilizează biblioteca npm `docx` pentru a construi documentele OpenXML native cu tabele adevărate (`Table`, `TableRow`, `TableCell`), borduri standard, celule centrate, antete cu logo/date firmă și tokenuri `{PLACEHOLDER_*}` inserate în paragrafe.
   - *Avantaje majore:*
     - Tabele Word 100% native (`<w:tbl> > 0`), rezolvând definitiv deficiența critică din audit unde fișierele anterioare aveau `<w:tbl> = 0`.
     - Fără erori de corupere binară sau reziduuri proprietare Word/RTF.
     - Diacritice românești native UTF-8 fără erori de codare.
     - Reproductibilitate automată în CI/CD dintr-o singură comandă.

2. **Opțiunea 2: Crearea Manuală a Fișierelor `.docx` în Microsoft Word / LibreOffice**
   - *Mecanism:* Salvarea șabloanelor în Word/LibreOffice și plasarea lor în `templates_registry/normalized/`.
   - *Risc:* Risc de reziduuri de formatare XML, splituiri de tokenuri între taguri XML (`<w:t>{PLACE</w:t><w:t>HOLDER}</w:t>`) dacă nu sunt normalizate cu `docxtemplater` sau scripturi speciale.

3. **Recomandare Strategică:**
   - Scriptul de autorare programatică (sau script bazat pe asamblarea curată a pachetelor OpenXML) este soluția optimă pentru a asigura că toate cele 6 fișiere au structură curată, fără split de taguri XML, gata pentru procesarea directă în `renderTemplateBuffer` prin `docxtemplater` și `pizzip`.

### 4.2. Fluxul de Integrare în Suita de Teste
Pentru ca extinderea de la 25 la 31 să fie validată complet:
1. `src/lib/templates/definitions.ts`: concatenarea celor 6 intrări noi la `TEMPLATE_CATALOG`.
2. `prisma/seed.ts` & `src/lib/templates/seed.ts`: sincronizarea celor 31 de șabloane în tabela `Template` din PostgreSQL (`prisma.template.upsert`).
3. `src/lib/templates/resolver.ts`: asigurarea că `resolveTemplateData` furnizează mapările din `Job` (`mainActivities`, `equipmentUsed`, `workConditions`) către noile tokenuri și fallback-uri statutare rezonabile (fără valori fictive pentru salariu!).
4. `scripts/test-all-25-templates.ts` $\rightarrow$ extins la `scripts/test-all-templates-generation.ts` / `test-all-31-templates.ts`: rularea generării pentru toate cele 31 de șabloane și verificarea că:
   - `fs.existsSync(gen.filePath)` este `true`.
   - `fileSizeBytes > 0`.
   - Toate tokenurile sunt rezolvate fără erori de template.

---

## 5. Tabelele Standard de Descoperire a Caracteristicilor și Cazurilor Limită

## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Training / SSM | `ssm-fisa-instruire-individuala` | Fișă individuală de instruire SSM tipizată conform Anexei 11 din HG 1425/2006 (Cap. I-VI, copertă, instructaj introductiv, la locul de muncă, admitere, tabel periodic multianual). | `clientId`, `employeeId`, `jobId`, tokenuri SSM | Document DOCX complet cu tabele native | Marchează `missing_data` dacă lipsesc nume salariat, CNP sau firmă | HG 1425/2006 Anexa 11, Plan Strategic §3.4, §7 Pilon 2 |
| 2 | Training / PSI | `psi-fisa-instructaj-individuala` | Fișă individuală de instructaj în situații de urgență conform Anexei la OMAI 712/2005 (introductiv general, specific postului, periodic, exerciții). | `clientId`, `employeeId`, `jobId`, responsabil PSI | Document DOCX conform cerințelor ISU | Marchează `missing_data` dacă lipsește responsabilul PSI sau datele de identitate | OMAI 712/2005, Legea 307/2006, Plan Strategic §7 Pilon 2 |
| 3 | HR / Medicina Muncii | `med-fisa-solicitare-examen` | Fișă de trimitere oficială a salariatului la clinica de medicina muncii conform Anexei 2 din HG 355/2007 (bife angajare, periodic, reluare). | `clientId`, `employeeId`, `jobId`, clinică medicală | Document DOCX de trimitere cu antet și bife | `missing_data` dacă lipsesc CNP, act identitate sau funcție/COR | HG 355/2007 Anexa 2, Codul Muncii art. 27, Plan Strategic §7 Pilon 2 |
| 4 | Risk / Medicina Muncii | `med-fisa-identificare-riscuri` | Fișă oficială de identificare a factorilor de risc profesional conform Anexei 3 din HG 355/2007 (riscuri fizice, chimice, biologice, ecran, noapte). | `clientId`, `employeeId`, `jobId`, activități/echipamente post | Document DOCX cu grilă detaliată de riscuri | `missing_data` dacă nu există post sau specialist SSM | HG 355/2007 Anexa 3, Plan Strategic §7 Pilon 2 |
| 5 | Risk / EIP | `eip-fisa-acordare-individuala` | Fișă individuală de dotare și predare-primire a echipamentului individual de protecție conform HG 1048/2006 și HG 1425/2006 art. 15 lit. d. | `clientId`, `employeeId`, `jobId`, mărimi salariat | Document DOCX cu tabel de distribuire și angajament | `missing_data` dacă lipsește salariatul sau semnatarul EIP | HG 1048/2006, Plan Strategic §7 Pilon 2 |
| 6 | HR / CIM | `hr-cim-model-cadru-2022` | Contract Individual de Muncă complet pe Capitolele A–P conform modelului-cadru aprobat prin Ordinul MMSS 2171/2022 (Legea 283/2022, UE 2019/1152). | `clientId`, `employeeId`, `jobId`, clauze CIM | Document DOCX statutar complet (4-6 pagini) | `missing_data` dacă salariul brut lipsește (oprire date fictive 6500 lei) | Ordin MMSS 2171/2022, Codul Muncii, Plan Strategic §7 Pilon 2 |
| 7 | Catalog / Seed | Extindere Catalog la 31 Șabloane | Suport în `definitions.ts`, `seed.ts` și baza de date PostgreSQL pentru toate cele 31 de șabloane statutare. | `TEMPLATE_CATALOG` actualizat | 31 înregistrări sincronizate în tabela `Template` | Eșec la seed dacă apar coduri duplicate sau manifest invalid | `definitions.ts`, `schema.prisma`, `seed.ts` |
| 8 | Resolver / Job Context | Conectare Atribute Reale Post | Maparea `job.mainActivities`, `job.equipmentUsed`, `job.workConditions` și `job.corCode` către tokenurile dinamice ale noilor fișe. | Obiect `Job` din PostgreSQL | Tokenuri populate automat în Anexa 2, Anexa 3, EIP și CIM | Fallback curat fără valori aberante | `resolver.ts`, `schema.prisma` model `Job` |

## Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | `ssm-fisa-instruire-individuala` | Salariat fără data angajării setată (`hireDate: null`) | Resolverul preia data curentă a sistemului formatată românește (`currentDateRo`), asigurând că fișa nu rămâne blocată la tipărire. |
| 2 | `psi-fisa-instructaj-individuala` | Client fără responsabil PSI definit în tabela `Client` (`psiResponder: null`) | Resolverul verifică deciziile interne sau aplică fallback-ul din profilul SEPP (`ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_PSI`). |
| 3 | `med-fisa-solicitare-examen` | Angajare nouă unde salariatul nu are încă buletin introdus (`identityDocument: null`) | Câmpurile de serie/număr/emitent act rămân vizibile ca `{PLACEHOLDER_*}` iar documentul este marcat `missing_data` conform standardului de siguranță. |
| 4 | `med-fisa-identificare-riscuri` | Post de lucru fără activități completate în `Job` (`mainActivities: null`) | Resolverul extrage activitățile implicite din profilul de risc CAEN (`CaenRiskProfile`) al clientului, prevenind transmiterea unei fișe goale către medic. |
| 5 | `eip-fisa-acordare-individuala` | Mărimi salariat nespecificate (pantofi, talie) | Câmpurile de mărimi sunt configurate ca opționale (`required: false`); tabelul de EIP este pre-populat cu dotarea standard a postului. |
| 6 | `hr-cim-model-cadru-2022` | Salariu brut necompletat | Se elimină injectarea forțată de `6500 lei`; documentul semnalează lipsa salariului ca cerință obligatorie (`missing_data`), prevenind tipărirea unui CIM ilegal. |
| 7 | `hr-cim-model-cadru-2022` | Contract pe durată determinată cu dată de sfârșit | Se populează corect clauza de la Cap. B cu temeiul legal (art. 83 Codul Muncii), data de început și data de încheiere. |
| 8 | Toate cele 6 șabloane | Generare în flux de onboarding fără salariat salvat anterior | Suportă pasarea de `customOverrides` sau generarea pe un salariat temporar/draft înainte de commit-ul final în registrul de personal. |

---

## 6. Recomandări pentru Pașii Următori de Implementare

1. **Generarea Fișierelor DOCX Șablon în `templates_registry/normalized/`:**
   Implementarea scriptului de autorare automatizată a fișierelor Word cu tabele native OpenXML (`<w:tbl>`) și stilizare profesională (font Calibri/Arial, margini 2 cm, antet și subsol cu număr de pagină) pentru cele 6 șabloane noi.
2. **Actualizarea `src/lib/templates/definitions.ts`:**
   Adăugarea celor 6 definiții complete de șabloane și exportul lor în `TEMPLATE_CATALOG` (total 31).
3. **Actualizarea Resolverului (`src/lib/templates/resolver.ts`):**
   Conectarea noilor tokenuri la atributele reale din tabelele `Job`, `Worksite`, `Employee` și `Client`, eliminarea salariului fictiv fix și prioritatea specialistului implicit (`isDefault: true`).
4. **Sincronizarea Bazei de Date:**
   Rularea `npx tsx src/lib/templates/seed.ts` pentru a sincroniza cele 31 de șabloane în baza PostgreSQL.
5. **Rularea Suitei de Verificare E2E:**
   Actualizarea suitei de teste `test-all-25-templates.ts` la 31 de șabloane pentru a garanta generarea 100% de succes și integritatea documentelor produse.
