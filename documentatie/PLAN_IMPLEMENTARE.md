# Plan de implementare — generator intern pentru toate șabloanele SSM

## 1. Obiectiv și limite

Construim o aplicație hosted internă pentru firma de servicii SSM și cursuri de igienă. Ea centralizează datele clienților, angajaților, posturilor, punctelor de lucru, instruirilor și cursurilor; preia Excelul clientului; completează și arhivează toate cele 25 de fișiere din `sabloane_ssm`.

Aplicația trebuie să poată **pregăti orice document din inventar**, individual sau în lot, cu datele disponibile, dar nu să inventeze informații lipsă și nici să substituie evaluarea profesională. Unele documente ies ca draft cu câmpuri de completat/revizuit de specialist sau de angajator.

Rămân excluse: conturi/portal pentru client ori angajați, autoinstruire, semnătură electronică, automatizarea aprobării juridice/SSM și evaluarea de risc autonomă cu AI. Se păstrează login intern, cu cont individual pentru fiecare coleg și fără matrice complexă de roluri.

## 2. Ce arată piața și discuțiile publice

- Ghidurile **ssm.ro** descriu un flux în care se configurează firma, posturile și angajații, se încarcă materiale, se asociază tematicile cu posturile și apoi se generează documente individual sau în masă. Generatorul poate completa din registru sau cere valori manuale; template-urile Word folosesc înlocuire de câmpuri, condiții și rânduri repetabile. Importul este comparat cu datele existente, iar erorile și operațiile sunt urmărite. Acesta este un model bun pentru noi: o bază centrală, generare din date controlate, preview și raport de erori. Funcțiile de semnare, notificare către angajați și auto-servire nu intră în scopul nostru. [Generatoare documente](https://ghid.ssm.ro/docs/02-ghiduri/utilizator/generatoare-documente), [template-uri DOCX](https://ghid.ssm.ro/docs/02-ghiduri/utilizator/aplicatii/template-docx), [import angajați](https://ghid.ssm.ro/docs/02-ghiduri/utilizator/introducere-date-angajati)
- **SafeHub** și **SafeTraining** promovează import Excel, configurare pe client, șabloane/materiale reutilizabile, instruire/semnare și rapoarte. **SafetyLab** promovează evaluare de risc și documente generate din evaluare. Sunt funcții prezentate comercial, nu garanții independente de conformitate; demonstrațiile și exportul datelor trebuie verificate înaintea unei achiziții. [SafeHub](https://safehub.ro/), [SafeTraining](https://www.safelandia.ro/safetraining/tutoriale-safetraining/), [SafetyLab](https://safetylab.ro/)
- Firmele de servicii SSM descriu pachetul inițial ca evaluare specifică clientului/posturilor, plan de prevenire, instrucțiuni, tematici, instruiri și verificări. Un furnizor subliniază că dosarele sunt adaptate fiecărei firme, nu reutilizate ca dosar generic. [SSM-SSM](https://ssm-ssm.ro/servicii-ssm-si-psi/), [Arman Grup](https://arman.ro/)
- În discuția publică de pe Reddit despre prima angajare, clienții întreabă dacă primesc numai documente sau și instruire practică; comentariile insistă pe prezentarea riscurilor specifice și pe diferența dintre documentație și activitatea efectivă. Este o relatare neoficială, dar confirmă că aplicația trebuie să distingă clar `document generat` de `instruire efectuată`. [Discuția](https://www.reddit.com/r/RoFiscalitate2/comments/1qcjq5m/prima_angajare_firma_ssm_trebuie_sa_faca_instructaj_fizic_sau_doar_actele/)

**Concluzie de proiectare:** modelăm un dosar per client cu legături explicite `client → punct de lucru → post → riscuri/măsuri → tematică/instrucțiuni → instruire/angajat → document`. Un câmp comun poate completa documente, însă documentele de evaluare și prevenire au date specifice și revizie umană.

## 3. Cerințe care guvernează automatizarea

- Legea nr. 319/2006 cere evaluarea riscurilor și un plan de prevenire și protecție bazat pe evaluarea concretă. Responsabilitatea angajatorului rămâne; folosirea aplicației sau a serviciului extern nu face ca datele să devină automat corecte. [Legea nr. 319/2006](https://legislatie.just.ro/Public/DetaliiDocument/244539)
- HG nr. 1425/2006 leagă evaluarea de locuri/posturi și de componentele sistemului de muncă. Instruirea consemnată trebuie să aibă data, durata și materialul; instruirea la locul de muncă include demonstrații practice. Fișa poate fi pe hârtie sau electronică; dacă firma alege consemnare electronică, se aplică regulile de semnare electronică. Pentru această aplicație: generează documente tipăribile, colectează semnătura pe hârtie și arhivează copia scanată; nu marca instruirea efectuată numai pentru că fișa a fost generată. [HG nr. 1425/2006, forma consolidată](https://legislatie.just.ro/Public/DetaliiDocumentAfis/252029)
- Cursul de igienă are proces distinct de înscriere, instruire, examen, certificate și registru; metodologia actuală prevede reînnoire la 3 ani și modele de evidențe. Folosește anexele furnizate ca structură, dar verifică versiunea/avizele și elimină datele exemplificative înainte de activare. [Metodologia 2022](https://legislatie.just.ro/Public/DetaliiDocumentAfis/268225)
- CIM și documentele de HR sunt incluse deoarece există în folder, dar sunt documente ale angajatorului. Aplicația poate precompleta; clientul/HR trebuie să verifice și să emită conform procesului legal în vigoare. [Codul muncii, art. 16](https://legislatie.just.ro/Public/FormaPrintabila/00000G09XG7KQDU8B9D07RCMPR2OIIA7)
- Datele din CI și domiciliu sunt date personale cu risc ridicat de abuz. Excelul clientului conține acum CNP și toate câmpurile identității. Înainte de producție, firma trebuie să documenteze scopul/baza prelucrării, informarea, accesul, canalul de transfer și retenția; nu colecta copii CI sau dosare medicale în registrul general. Verifică și modelul `Informare Salariat Protectia Datelor.doc`: în conținut este formulat ca declarație/luare la cunoștință și nu trebuie emis automat înainte de revizie privacy/juridică.

## 4. Principiu tehnic: registry de template-uri, nu cod per document

Orice document generabil este înregistrat cu:

- nume, familie, versiune, fișier original, format de intrare/ieșire;
- scop și nivel: client, punct, post, angajat, eveniment de instruire, participant, sesiune de igienă;
- câmpuri scalare, validări și formatări (dată, CNP/text, număr, adresă);
- sursa fiecărui câmp din modelul de date și dacă este obligatoriu pentru acel document;
- tabele/rânduri repetabile și condiții de includere;
- reguli/dataset-uri de care depinde (ex. posturile evaluării → măsuri din plan; IPSSM alese → OPIS);
- stare: `în inventariere`, `curățat`, `mapat`, `în revizie`, `activ`, `arhivat`;
- proprietar/revizor, versiune aprobată, ultima revizie și formatul vizual aprobat.

Fiecare template are manifest JSON/YAML simplu, versionat împreună cu fișierul. Nu se execută cod primit din documente și nu se lasă LLM-ul să scrie expresii Python/Jinja arbitrare. Sunt permise doar variabile, condiții și bucle declarate de dezvoltator.

### Generator de documente

- DOCX: folosește `docxtpl`/Jinja pentru câmpuri, condiții, bucle și rânduri repetabile. Tags trebuie introduse cu grijă în Word; marcajele împărțite în formatarea unui paragraf pot eșua, iar tabelul repetat necesită sintaxa de rând dedicată. Verifică randarea la onboarding și după modificarea template-ului. [Documentația docxtpl](https://docxtpl.readthedocs.io/en/stable/)
- DOC/RTF: păstrează originalul nemodificat; convertește o singură dată în DOCX, revizuiește și aprobă vizual varianta convertită, apoi mapează noua versiune. Nu converti la fiecare generare.
- PDF: întâi verifică dacă are câmpuri AcroForm. Dacă nu are, creează o versiune DOCX/PDF recreată sau overlay doar după comparare vizuală și aprobare. Păstrează originalul.
- XLS/XLSX: păstrează structura, foile ascunse, formulele și formatarea existente când formularul oficial se completează; convertește `.xls` la `.xlsx` în proces de migrare și confirmă rezultatul. Nu reconstrui Anexele cursului de la zero.
- Generatorul întoarce `draft`, lista câmpurilor lipsă/invalide și preview/download. Numai documentul trecut prin revizia cerută ajunge `aprobat pentru tipărire`. Pentru grupuri, produce raportul documentelor reușite/eșuate, nu ascunde erorile.
- Păstrează fiecare rezultat ca snapshot: versiunea template-ului, sursa datelor, persoana care a generat, valorile folosite, revizorul și legătura cu client/angajat/post/sesiune. Re-generarea creează revizie nouă, nu suprascrie istoricul.

## 5. Inventarul celor 25 de fișiere și strategia de generare

| Fișier | Scop/flux | Tip de automatizare și revizie |
|---|---|---|
| `Adeverinta participare- model.docx` | Curs igienă, document nominal după prezență și examen | Câmpuri participant, modul/nivel, furnizor/avize, serie/număr/datǎ. Se generează numai din sesiune și rezultat înregistrat; verificare serie, aviz și date emitent. |
| `Anexe Curs igiena.xlsx` | Pachet de formulare administrative, catalog, predare/primire, catalog examen, proces-verbal, certificat, registru | Păstrarea formatului și foilor originale; import participanți într-o sesiune și completare a foilor aplicabile. Înainte de activare, clasifică fiecare foaie și elimină nume, numere, adrese sau date de aviz ale exemplului. Revizie de operator. |
| `Tabel Cursanti_exemplu.xls` | Listă de cursanți pentru import/organizare sesiune | Convertește în modelul curent și mapează antete; folosește ca referință de format, nu ca bază paralelă. |
| `Cerere angajare.pdf` | Formular HR nominal | Completează nume, domiciliu, CI, funcție și data solicitată; păstrează PDF-ul dacă este fillable, altfel overlay/recreare aprobată. Revizie client HR. |
| `contract-individual-munca nou 2026.docx` | CIM, HR | Completează date angajator/angajat/CI/domiciliu/funcție și câmpurile contractuale introduse explicit de client. Nu completa salariu, timp, probă, durată, clauze sau înregistrare din presupuneri. Curăță footer-ul publicitar și trimiterile/datele modelului; validare juridică/HR obligatorie înainte de activare și fiecare actualizare legală. |
| `Declaratie pe propie raspundere contract de munca.pdf` | Declarație HR despre funcție de bază, persoane în întreținere, pensie/șomaj etc. | Formular PDF cu date de identitate; secțiunile despre persoane terțe/beneficii cer răspuns explicit din partea angajatului. Nu deriva și nu inventa răspunsuri. Acces și retenție restrânse; revizie HR. |
| `Declaratie luat la cunost. Regulament Intern.pdf` | Confirmare predare regulament/contract/fișă post | Completează identitatea, angajatorul și lista/versiunile actelor comunicate. Generarea nu înseamnă că persoana a luat la cunoștință; semnare olografă după predare. |
| `INFO ce cuprinde dosarul de personal.docx` | Checklist dosar HR | Transformă într-un checklist configurabil cu statusuri: cerut/primit/verificat/lipsește/nu se aplică. Conținutul se validează cu HR și regimul curent (ex. REGES). |
| `Informare Salariat Protectia Datelor model.doc` | Model informare/declarare privacy | Conversie și review legal/privacy obligatorii; câmpurile se precompletează doar după validarea textului, scopurilor, temeiurilor, destinatarilor și retenției. Nu trata o bifă/semnătură de luare la cunoștință drept temei automat de prelucrare. |
| `Anexa fisa postului SSM.docx` | Anexă SSM la fișa de post | Completează angajator, salariat, funcție și responsabilități aprobate pentru categoria postului; nu este anexă universală fără verificarea rolului. Revizie client/SSM. |
| `DECIZII NOU .docx` | Colecție de decizii ale angajatorului (de ex. periodicitatea instruirilor) | Mai întâi împarte în tipuri de decizie/versionări. Câmpuri comune: număr, dată, angajator, temei, articol/dispoziție, persoană responsabilă, data intrării în vigoare. Numărul se alocă secvențial și atomic. Revizie/semnare pe hârtie de angajator. |
| `EVALUAREA RISCURILOR.doc` | Evaluare de risc, raport multicapitol cu tabele și evaluare pe post | Nu este mail-merge. Model de date structurat pentru activitate, punct, post, sarcini, echipamente/mediu, pericole, consecințe, scoruri/metodă, măsuri existente și reziduale, concluzii și anexe. Automatizează coperta, descrierea firmei, agregarea datelor și tabelele validate; metoda/scorul și concluziile sunt completate/verificate de evaluator. Necesită constatare reală și revizie calificată. |
| `Plan de Prevenire TESA.doc` | Tabel de măsuri și termene bazat pe evaluare | Generează din măsurile acceptate ale evaluării: acțiune, tip măsură, responsabil, termen/periodicitate, resurse/status. Nu deriva automat doar din denumirea postului; revizie angajator/SSM. |
| `Zone pericol grav si iminent.docx` | Procedură/evidență de zone cu risc ridicat și specific | Câmpuri client și tabel repetabil zonă/localizare/pericol/măsuri; alimentat din evaluare/site. Exemplarele de zone electrice etc. sunt exemple, nu implicit prezente la client. Revizie specialist și client. |
| `Plan actiune pericol grav si iminent.docx` | Procedură de oprire, evacuare, anunțare și prim ajutor | Precompletează contacte/responsabili, amplasament și echipe din date aprobate; acțiunile și organizarea se validează la client. Nu folosi ca plan generic final. |
| `OPIS IPSSM.doc` | Index al instrucțiunilor proprii din dosar | Generează lista din IPSSM selectate/aprobate pentru client/post, cu titlu, cod intern aplicație, versiune și dată. Revizie: lista trebuie să corespundă efectiv fișierelor livrate. |
| `Tematica de instuire introductiv generala SSM 4 h.docx` | Program/tematică pentru instruirea introductiv-generală | Template cu agenda, materialele și duratele aprobate. Durata, subiectele, versiunea și aprobarea nu se preiau mecanic din exemplul clientului. Revizie legală/SSM. |
| `Detaliu la tematica instruire introductiv generala.docx` | Material de suport pentru instructaj introductiv | În principal text standard versionat; completează numai clientul, domeniul, puncte, riscuri și referințe aprobate. Review al legislației și relevanței. |
| `Tematica de instuire la locul de munca SSM.docx` | Program pentru instruire pe post/loc (exemplu TESA) | Generator din post + riscuri + IPSSM/materiale selectate + durate planificate. Gruparea mai multor funcții într-o tematică se face doar când activitățile/riscurile sunt echivalente și aprobate. |
| `Detaliu la Tematica instruire la locul de munca.docx` | Material explicativ de instruire pe post | Părți standard + secțiuni condiționate de activitate, echipamente, EIP, riscuri și răspuns la urgență. Revizie SSM, apoi client. |
| `!IP 01 - 10 UNIVERSALE.doc` | Bibliotecă de instrucțiuni generale, mai multe secțiuni | Convertire și împărțire în documente/unități individuale cu titlu și revizie. Selectare după activități; textul se revizuiește, nu se aplică tuturor clienților doar pentru că fișierul se numește „universale”. |
| `11 - ALUNECRILOR SI MPIEDICRILOR LA LOCUL DE MUNCA.rtf.doc` | IPSSM pentru alunecări/împiedicări | Normalizează RTF și asociază numai unde riscul este relevant; date de client/versionare și revizie. |
| `12 - CIRCULAIA AUTOVEHICULELOR.doc` | IPSSM pentru circulație autovehicule | Normalizează, mapează clientul și activitățile de conducere/deplasare. Selectare condiționată de evaluare; revizie SSM. |
| `13 - ACTIVITATI DE BIROU.doc` | IPSSM pentru activități de birou | Normalizează și mapează posturi TESA relevante; deduplică față de `TESA.doc`, după comparație și revizie. |
| `TESA.doc` | Pachet de instrucțiuni/materiale pentru birou | Normalizează, identifică secțiuni reutilizabile și suprapuneri cu instrucțiunea de birou; nu menține două versiuni contradictorii. Revizie înainte de publicare. |

**În total:** 25/25 fișiere trebuie să apară în catalogul de template-uri cu stare, versiune, mapare, procedură de revizie și ieșire de test cu date fictive. Un template nu se declară `activ` doar pentru că placeholder-ele se completează.

## 6. Date și import Excel

Fișierul clientului actual are trei foi: `Instrucțiuni`, `Firmă și angajați` (datele firmei plus un rând per persoană, inclusiv câmpurile transcrise din act și domiciliu) și `Context posturi`. Nu cere coduri de angajat/post/punct de lucru; COR rămâne opțional.

Model minim în PostgreSQL:

- `Client`, `PunctLucru`, `Post`, `Angajat`, `ActIdentitate`, `Domiciliu` și `IstoricIncadrare`;
- `Evaluare`, `PostEvaluat`, `Pericol`, `Risc`, `Scor`, `MasuraPrevenire` și `ZonaRisc`;
- `Instruire`, `ParticipantInstruire`, `MaterialInstruire`, `SesiuneIgiena`, `ParticipantCurs`, `RezultatExamen`;
- `Template`, `TemplateVersion`, `FieldMapping`, `DocumentGenerat`, `RevizieDocument`, `Import`, `AuditEvent`.

Un singur Excel este pentru un singur client. Importul: alegi client → validezi workbook/foi/antete → preview → compari → rezolvi ambiguități → confirmi. CNP-ul (dacă există) poate potrivi exact o persoană din același client; altfel propune potrivire după email și nume și cere confirmare dacă există ambiguitate. CNP-ul se maschează în interfață și nu apare în loguri. Numele postului/punctului sunt texte; noi valori se creează ca propuneri și se confirmă manual.

Nu interpreta lipsa unei persoane din snapshot ca plecare; cere status `PLECAT` și dată. Importul păstrează sursa, raportul de validare, operatorul și diferențele înainte/după. Nu executa formule/macros din fișier. Orice câmp obligatoriu lipsă blochează acel document/înregistrare, nu completează cu presupuneri.

## 7. Ecrane și experiență

Interfață internă desktop-first, simplă și ieftină în resurse: Django + pagini server-rendered, Bootstrap minimal și HTMX doar pentru interacțiuni locale. Fără SPA, dashboard decorativ, roluri complexe, Redis sau microservicii.

Meniu: `Clienți` · `Angajați` · `Posturi și riscuri` · `Instruiri/cursuri` · `Documente` · `Importuri` · `Template-uri`.

Ecranul template-urilor arată stare, versiune, câmpuri mapate/lipsă, dependențe și ultima revizie. Flux generare: context document → preview cu date rezolvate → listă de lipsuri → generare draft → revizie umană → aprobare pentru tipărire → upload copie semnată (unde se aplică) / arhivare. Raport în lot cu succes, avertismente și erori.

## 8. Arhitectură găzduită și cost

- Monolit Django + PostgreSQL, ORM/migrări, un repo și un container de aplicație.
- VPS mic într-o regiune UE: Caddy pentru HTTPS, Django/Gunicorn, PostgreSQL, volum privat de fișiere. Backup criptat zilnic în altă locație, verificare periodică de restaurare. Începe pe un singur host pentru cost redus; migrează DB la serviciu managed când încărcarea/operarea o justifică.
- Fișierele se țin în stocare privată, cu nume aleatoare și acces prin backend; DB păstrează metadate și relații.
- Nu instala LibreOffice runtime pentru fiecare generare: convertește formele `.doc/.rtf/.xls` o singură dată la migrare, revizuiește și folosește variante normalizate. Pentru PDF și workbook-uri păstrează originalul.
- Django recomandă limitarea uploadurilor și servirea fișierelor încărcate în condiții sigure; aplică extensii acceptate, limită de dimensiune, HTTPS și download autenticat. [Django security](https://docs.djangoproject.com/en/4.2/topics/security/), [Django file uploads](https://docs.djangoproject.com/en/4.2/topics/http/file-uploads/)
- LLM nu rulează în produs. În faza de dezvoltare poate ajuta la inventarierea sloturilor/convertirea șabloanelor, dar rezultatul intră în manifest doar după review uman. Nu trimite date reale/CNP către API extern.

## 9. Etape de implementare

### Etapa 0 — Curățarea și configurarea șabloanelor

1. Creează catalog pentru toate cele 25 de fișiere și marchează fiecare: tip, client/post/persoană/sesiune, sursă, risc, revizor, stare.
2. Detectează formatul real (ex. RTF cu extensie `.doc`); păstrează originalul și convertește copie de lucru.
3. Curăță mostrele cu date concrete (CUSTOMLINE, UNIK, avize/numerotări/date exemplu), footer-uri comerciale și date istorice.
4. Cu specialistul și responsabilul HR/privacy, aprobă conținutul și lista câmpurilor obligatorii pentru fiecare template; prioritate la `EVALUAREA RISCURILOR`, CIM, declarații și informarea privacy.
5. Definește formatul manifestului și convenția de placeholder, plus statusurile draft/review/approved/archived.

**Ieșire:** catalog 25/25, fișiere de lucru normalizate și revizor desemnat pentru fiecare familie.

### Etapa 1 — Nucleul aplicației și importul

1. Django/PostgreSQL, login intern individual, client picker și audit minim.
2. Modelul firmei/angajatului/postului/punctului din Excelul existent, inclusiv CNP, CI, domiciliu; import cu preview/diferențe.
3. Istoric angajat-post, stări active/plecat și protecția CNP-ului.

**Ieșire:** datele clientului intră o singură dată și se pot corecta fără duplicare/pierdere istorică.

### Etapa 2 — Motor de template-uri și documente simple

1. Manifest de mapping, rezolvare câmpuri, validări, formatare și raport de lipsuri.
2. DOCX scalar și bulk; review înainte de aprobare; versionare și arhivare.
3. Începe cu `Cerere angajare`, `Declaratie luat la cunost. Regulament Intern`, adeverința de curs și fișa de post SSM, după aprobarea conținutului. Sunt ușor de verificat și validează maparea câmpurilor personale.

**Ieșire:** câmpurile comune funcționează o singură dată și alimentează șabloane diferite.

### Etapa 3 — HR și documente cu date personale

CIM, declarația pe proprie răspundere, checklist dosar personal, informarea privacy. Adaugă câmpuri cu răspunsuri explicite, nu implicite, și revizii HR/juridic/privacy. Documentele rămân draft până la verificarea datelor contractuale.

### Etapa 4 — Bibliotecă IPSSM, tematici și OPIS

Normalizează instrucțiunile `.doc/.rtf`, compară `TESA.doc` cu `13 - ACTIVITATI DE BIROU.doc`, separă colecția IP 01-10 în elemente selectabile. Construiește mapări post↔instrucțiune și generatorul OPIS din materialele efectiv aprobate. Tematicile se compun din materiale, durate și riscuri aprobate, cu revizie.

### Etapa 5 — Evaluarea riscurilor, planul și urgențele

Construiește formulare structurate pentru metoda și tabelele folosite de evaluator. Calculează numai formulele metodei aprobate de specialist. Generează raportul evaluării, planul de prevenire și evidența zonelor din aceleași date acceptate; propagă modificările ca documente noi în `draft/review`, nu suprascrie automat versiunea activă. Planul de acțiune grav/iminent primește contacte și responsabili reali, cu revizie de client.

### Etapa 6 — Instruiri și cursuri de igienă

Istoric eveniment de instruire și participanți; generare fișe pe hârtie, câmpuri obligatorii data/durata/material, semnătură olografă ulterioară și copie scanată. Cursul de igienă folosește modelul XLSX original, foile aplicabile, catalog, prezență, examen, proces-verbal, certificate și registru; testare vizuală și verificarea numerotării/avizelor.

### Etapa 7 — Închiderea inventarului și operarea

Parcurge toate cele 25 de template-uri și obține pentru fiecare: versiune activă, câmpurile mapate, sursele, validările, exemplu fictiv randat, rezultat de review și procedură de reeditare. Instruiește echipa internă pentru import, draft, review, tipărire și scan. Abia după acceptarea inventarului se poate considera îndeplinită cerința „poate completa orice șablon din folder”.

## 10. Reguli de siguranță a generării

- Nu inventa date de client, post, riscuri, semnatar, date/numere de decizie, avize, examen, prezență sau instruire.
- Nu emite contracte/declaratii cu răspunsuri necomunicate. Orice câmp lipsă este vizibil.
- Nu genera conținutul evaluării de risc sau punctajul prin LLM. LLM poate clasifica propuneri din material, dar evaluatorul le confirmă și completează metoda.
- Nu transforma `draft` în `aprobat` automat. Documentul generat nu dovedește semnare, predare, instruire sau examinare.
- Reținerea documentelor și a datelor personale este configurată pe scop și aprobată de firma responsabilă; nu include CNP în loguri/fișiere demo.
- Template-urile legislative se revizuiesc de specialist înainte de activare și la schimbări; aplicația arată data și versiunea revizuirii.

## 11. Criterii de acceptare

1. Catalogul are exact 25 din 25 exemple; fiecare are mapare, status, revizor și rezultat verificat.
2. Dintr-un client se generează individual sau în lot documentele care se potrivesc cu datele existente; lipsurile și erorile sunt raportate fără output înșelător.
3. Reimportul nu duplică angajații; ambiguitățile cer confirmare; plecarea nu se deduce dintr-un rând absent.
4. Un risc/plan/tematică își păstrează sursa și revizia, iar modificarea nu alterează retroactiv documentul activ.
5. PDF/DOC/DOCX/XLS/XLSX sunt fie completate, fie normalizate cu aspect aprobat; fișierele originale rămân disponibile.
6. Training history separă fișa generată de sesiunea efectuată și păstrează data, durata, materialul, participanții și scanul semnat.
7. CNP/CI/domiciliu nu apar în loguri; documentele sunt inaccesibile fără autentificare; backupul se poate restaura.

## 12. Surse

Legislația trebuie reverificată în forma consolidată înainte de activarea fiecărui template: Legea 319/2006; HG 1425/2006; metodologia cursurilor de igienă 2022; Codul muncii. Sursele comerciale și forumurile de mai sus descriu funcții, oferte sau experiențe; nu țin loc de interpretare juridică ori validare de specialitate.
