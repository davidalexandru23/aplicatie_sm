# Specificație de implementare pentru agentul LLM

## 0. Context și ordine de citire

Implementează o aplicație web hosted, internă, pentru firma prestatoare de servicii SSM și cursuri de igienă. Obiectivul complet este ca echipa să poată importa date de client, menține istoricul și precompleta toate cele 25 de fișiere din `sabloane_ssm/`.

Citește:
1. această specificație;
2. `PLAN_IMPLEMENTARE.md` pentru analiza de piață/legislație, inventarul și mappingul obligatoriu al celor 25 de fișiere;
3. `../outputs/ssm-client-template/Model_date_client_SSM.xlsx` pentru schema de input.

Nu implementa funcționalități în afara scopului și nu considera inventarul complet până când fiecare fișier din tabelul planului are template versionat, mapping, rezultat verificat și stare explicită.

## 1. Produsul

**Include:** registru central, import XLSX cu preview/comparare, posturi și context de lucru, istoric instruiri, sesiuni de igienă, catalog template-uri, generare DOCX/PDF/XLSX, revizie și arhivă.

**Exclude:** portal sau conturi pentru clienți/angajați, autoinstruire, semnătură electronică, CRM/facturare/payroll, roluri complexe, AI în runtime, evaluare de risc sau completarea răspunsurilor prin AI.

O persoană internă generează draftul, verifică lipsurile, cere revizie unde este cazul, apoi îl aprobă pentru tipărire. Semnarea este olografă în afara aplicației; scanul se poate atașa ulterior. Generarea documentului nu este dovada instruirii, predării sau examinării.

## 2. Tehnologie și structură

- Django (versiune stabilă curentă la momentul implementării), PostgreSQL, Django ORM și migrații.
- Monolit într-un repo; HTML randat server-side, Bootstrap minimal, HTMX doar pentru căutare/filtre/acțiuni parțiale. Fără SPA.
- Dezvoltare locală prin Docker Compose. Producție inițială: un VPS în UE, HTTPS prin Caddy, container Django, PostgreSQL și fișiere în storage privat separat. Backup criptat zilnic în altă locație și procedură de restaurare.
- Biblioteci puține: `docxtpl` pentru DOCX; `openpyxl` pentru XLSX; bibliotecă PDF numai după identificarea formularelor și necesarului de overlay/AcroForm. LibreOffice se folosește la normalizarea inițială, nu în fiecare generare.
- Nu pune documentele în PostgreSQL; păstrează fișierele în storage privat și metadatele/relațiile în DB.

Structură orientativă Django apps: `clients`, `people`, `risk`, `training`, `documents`, `imports`, `core`. Nu introduce serviciu separat sau coadă în MVP.

## 3. Model de date minim

Folosește FK-uri, unique constraint-uri scoped la client și UUID intern. Excelul nu furnizează coduri de angajat/post/punct.

- `Client`: denumire, CUI, nr. registrul comerțului, sediu, reprezentant, contact, stare.
- `Worksite`: client, denumire, adresă, activitate, activ.
- `Job`: client, denumire, COR opțional, descriere activități, echipamente, condiții relevante, activ.
- `Employee`: client, nume, prenume, sex opțional, CNP, data/locul nașterii, cetățenie, contact, job/worksit curent, stare.
- `IdentityDocument`: employee, tip, serie, număr, emitent, dată emitere/expirare.
- `ResidenceAddress`: employee, județ/sector, localitate, stradă, număr, bloc, scară, etaj, apartament, cod poștal.
- `EmploymentHistory`: employee, job, worksite, valid_from/to; nu suprascrie perioadele vechi la transfer.
- `RiskAssessment`: client, worksite/job, metodă și versiune, evaluator, date/concluzii, stare. `RiskItem` păstrează pericol, situație, consecință, scoruri/metoda de calcul aprobate, măsuri existente și scor rezidual.
- `PreventionMeasure`: assessment/risk item, descriere, categorie, responsabil, termen, status.
- `TrainingMaterial`: tip, titlu, fișier, versiune, job/activitate, aprobare.
- `TrainingEvent`: client, tip/fază, dată, durată, material/tematică, instruire practică consemnată, instruor, verificator, locație, stare.
- `TrainingParticipant`: eveniment, angajat, rezultat, dată consemnare, copie scanată opțională.
- `HygieneSession`, `HygieneParticipant`, `ExamResult`: sesiune, modul/nivel, date participant, prezență, rezultat, serie/număr document și registru.
- `Template`, `TemplateVersion`, `TemplateMapping`: fișier original/normalizat, familie, versiune, schemă de input, mapări, status, revizor și dată aprobare.
- `GeneratedDocument`: client și context opțional (employee/job/event), versiune template, output privat, stare, creat de, revizuit de, timestamp și sursa de date snapshot.
- `ImportBatch`: client, fișier, versiune schemă, raport validare, operator, stare și diferențe înainte/după.
- `AuditEvent`: cine, ce acțiune, când, asupra cărei înregistrări; fără CNP sau text de CI în detaliile logului.

Nu șterge înregistrări cu istoric/documente; dezactivează și păstrează relațiile.

## 4. Input client și import

Fișierul standard curent are foile `Instrucțiuni`, `Firmă și angajați`, `Context posturi`:
- Datele firmei sus, angajații dedesubt, un rând per persoană; include CNP, datele CI/CEI/pașaportului și domiciliu.
- `Context posturi`: un rând per combinație relevantă post/punct, cu activități, echipamente și condiții pentru specialist.
- Nu există coduri externe pentru persoană/post/punct; COR este opțional.

Flux import:
1. Operatorul selectează clientul și încarcă XLSX.
2. Verifică tipul fișierului, dimensiunea, foile, antetele, tipurile, formulele, duplicatele și referințele de post/punct. Nu executa macro-uri sau formule.
3. Arată preview cu `nou`, `modificat`, `identitate ambiguă`, `post/punct nou`, `eroare` și motive pe rând/câmp.
4. Potrivește întâi pe CNP exact în același client; dacă nu există, poate sugera email + nume/prenume. Nu unește automat după nume; operatorul confirmă ambiguitățile.
5. Nu considera absent din snapshot drept plecat; plecarea necesită stare explicită și dată.
6. Salvează doar după confirmare; păstrează originalul și raportul importului cu acces restricționat.

CNP-ul se maschează implicit UI (dezvăluire la nevoie), nu apare în URL, log, nume fișier sau raport exportat. Transferul inițial este prin canal securizat convenit. Înainte de producție documentează scopul/baza, informarea și retenția cu responsabilul de protecția datelor.

## 5. Catalog și generator de documente

Fiecare dintre cele 25 de fișiere din plan primește un manifest cu:
- ID tehnic intern, nume, familie, versiune, tip sursă/output, nivel de context;
- câmpuri cu tip, sursă, formatter, condiție, cerință și validare;
- colecții repetabile (tabele/paragrafe), filtre și ordonare;
- dependențe (ex. măsurile din evaluare → plan; instrucțiuni selectate → OPIS);
- stare `inventory`, `normalized`, `mapped`, `review`, `active`, `archived`;
- revizor, dată aprobare și format vizual de referință.

Generatorul acceptă numai mappinguri declarative aprobate. Nu folosi `eval`, macro-uri, formule client sau cod de template neverificat.

- DOCX: placeholders pentru valori simple, bucle/condiții pentru tabele și blocuri. Completează fiecare tabel repetat cu numărul real de rânduri, formatare și paginare păstrate.
- DOC/RTF: normalizare o singură dată în copie; păstrează originalul și nu activează fără verificare de conținut/layout.
- PDF: completează AcroForm dacă există; altfel folosește overlay sau copie recreată numai după verificarea poziției fiecărui câmp și comparația vizuală.
- XLS/XLSX: completează exemplarul pe formatul original; păstrează foile ascunse, stiluri și formule; verifică formulele și referințele după export.
- Date lipsă: generatorul refuză outputul final, arată câmpurile lipsă și poate salva draft doar dacă nu sugerează fals că actul este complet.
- Un output aprobat devine versiune imuabilă. Re-generarea creează revizie nouă, legată de snapshot-ul de date și versiunea template-ului. Înregistrarea tipăririi/scanului se face separat.

Reguli de business critice:
- Evaluarea riscurilor folosește metoda structurată și aprobată de specialist. LLM-ul nu clasifică riscul și nu generează scoruri/concluzii autonome.
- Planul de prevenire se construiește din măsuri aprobate ale evaluării; responsabilul/termenul nu se inventează.
- Tematicile și IPSSM se selectează după activitate/post și riscuri; „universal” nu înseamnă aplicabil automat.
- CIM și declarațiile HR cer valori comunicate explicit și review client/HR; nu completa salariu, clauze sau declarații despre persoane în întreținere prin deducție.
- Modelul informării de protecția datelor rămâne blocat până la revizie legală/privacy; nu trata o semnătură de luare la cunoștință drept temei de prelucrare.
- Documentele de curs igienă folosesc prezență/examen/sesiune înregistrate. Nu emite certificat/adeverință din simpla existență a unui angajat.

## 6. Ecrane / rute funcționale

Implementare simplă, cu tabele, căutare și formular:
- `/clients/` listă, creare, dosar client;
- `/clients/{id}/employees/`, `/jobs/`, `/worksites/`;
- `/imports/new/` upload → preview → confirmare → raport;
- `/risk-assessments/` evaluare, posturi, pericole, măsuri și versiuni;
- `/trainings/` sesiuni, participanți, istoric și scadențe;
- `/hygiene/` sesiuni, cursanți, prezență/examen, serii și registre;
- `/templates/` catalog și stare mapping/revizie;
- `/documents/generate/` context → template → missing fields → preview → draft;
- `/documents/` căutare/arhivă, status, download autenticat, revizii și scan upload.

Acțiuni de generare în lot pornesc din listă filtrată. Mesajele trebuie să arate exact ce lipsește sau ce necesită aprobarea specialistului.

## 7. Fluxuri statut și aprobări

- Import: `uploaded → validated → needs_review → confirmed / rejected`.
- Template: `inventory → normalized → mapped → review → active → archived`.
- Document: `draft → missing_data / ready_for_review → approved_for_print → printed → signed_scan_attached → archived`; `rejected` poate fi stare alternativă la review.
- Instruire: `planned → performed → recorded`; generarea fișei nu trece automat la `performed`.
- Evaluare: `draft → field_data_complete → expert_review → employer_review → active → superseded`.

Toate tranzițiile relevante au actor/timestamp și nu suprascriu reviziile precedente.

## 8. Implementare în incrementuri

1. Inventory/normalizare și manifests; review template-uri problematice (CIM, GDPR, risk assessment, course forms).
2. Django/Postgres, login intern, client/employee/job/worksite, import XLSX și audit.
3. Catalog documente + generator DOCX scalar/rânduri repetabile + preview/missing fields + arhivare.
4. Documente HR/personale, după aprobarea textului și mappingului.
5. Bibliotecă IPSSM, tematici și OPIS.
6. Model evaluare structurată, raport, prevenire, zone și plan grav/iminent, cu expert review.
7. Istoric instruiri și pachet curs igienă XLSX/PDF.
8. Acoperire 25/25, backup/restore, revizie vizuală și instruire operatori.

Nu declara MVP complet dacă un template nu are status/mapping sau dacă outputul nu a fost verificat vizual pe date sintetice.

## 9. Criterii de acceptare

- Exact 25 de surse inventariate și legate de template-uri versionate; niciuna nu se activează doar pe baza înlocuirii textului.
- Importul repetat nu dublează angajați, nu schimbă date în afara preview-ului și păstrează istoricul.
- Un template scalar, unul tabelar repetabil, un PDF, un DOC legacy și un XLSX multipagină au rezultat verificat în formatul lor; apoi aceeași procedură de review se aplică tuturor.
- Câmpurile lipsă, contradicțiile și posturile noi sunt vizibile înainte de generare/aprobare.
- PDF/DOCX/XLSX generate sunt accesibile doar intern; CNP-ul este mascat în UI/loguri.
- Istoricul unei instruiri distinge data reală a sesiunii de data generării fișei și permite arhivarea scanului semnat.
- Evaluarea/planul nu devin active fără review-ul configurat; documentele vechi rămân accesibile ca revizii anterioare.

## 10. Regula finală pentru agent

Lucrează într-un repo mic și lizibil, cu puține dependențe. Înainte de a modifica șabloanele, compară conținutul și aspectul original și folosește fișiere fictive pentru preview. Nu include date reale în fixtures, loguri sau prompturi. Păstrează planul și catalogul sincronizate cu implementarea; raportează orice template rămas în stare `review` sau `blocked` și motivul exact. Nu susține că toate cele 25 sunt acoperite până nu au mapping și revizie finală.
