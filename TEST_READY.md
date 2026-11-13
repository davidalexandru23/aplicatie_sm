# TEST_READY: Sistem Statutar SSM / Igienă / HR

## Acceptance Test Philosophy
- **Opaque-box & Requirement-driven**: Toate verificările sunt executate strict din perspectiva operatorului uman, a inspectorului ITM/DSP/ISU și a cadrului legal din România.
- **Zero Mock / Zero Facade**: Nu există date fictive hardcodate, răspunsuri sintetice simulate sau ocoliri ale logicii de persistență. Orice test operează pe instanțe reale de date în PostgreSQL prin Prisma ORM.
- **Integritate Statutară**: 31/31 de șabloane oficiale (29 DOCX, 2 XLSX) sunt generate cu 0 tokenuri nerezolvate de tip `PLACEHOLDER_*`, cu escapare completă a entităților XML (`&amp;`, `&lt;`, `&gt;`) și respectarea contractului `approved_for_print`.

---

## Test Runner Commands

| Comandă | Scop | Număr Teste |
|---------|------|:-----------:|
| `npx tsx scripts/e2e-suite.ts` | **Master E2E Orchestrator** (Rulează Tiers 1–4) | **333** |
| `npm test` | **Poartă Unificată de Verificare** (S1: 31 șabloane, S2: 45 compliance, S3: 6 Excel, S4: 333 E2E, S5: Build) | **416** |
| `npm run test:e2e` | Alias pentru rularea master suite E2E | 333 |
| `npm run test:tier1` (`npx tsx scripts/e2e-tier1-features.ts`) | Tier 1: Functional Feature Acceptance | 155 |
| `npm run test:tier2` (`npx tsx scripts/e2e-tier2-boundaries.ts`) | Tier 2: Boundary & Corner Cases | 155 |
| `npm run test:tier3` (`npx tsx scripts/e2e-tier3-pairwise.ts`) | Tier 3: Pairwise Cross-Feature Interactions | 15 |
| `npm run test:tier4` (`npx tsx scripts/e2e-tier4-scenarios.ts`) | Tier 4: Statutory Real-World End-to-End Scenarios | 8 |

### Opțiuni CLI Master Suite (`scripts/e2e-suite.ts`)
- Filtrare pe Tier: `npx tsx scripts/e2e-suite.ts --tier=1` (sau `2`, `3`, `4`)
- Filtrare pe șir de căutare: `npx tsx scripts/e2e-suite.ts --grep="Medicina"`
- Combinat: `npx tsx scripts/e2e-suite.ts --tier=3 --grep="T3-05"`

---

## Coverage Summary

| Nivel Testare | Descriere | Teste Planificate | Teste Trecute | Rata de Trecere |
|---------------|-----------|:-----------------:|:-------------:|:---------------:|
| **Tier 1** | Functional Feature Isolation (31 features × 5 teste) | 155 | 155 | 100% |
| **Tier 2** | Boundary & Corner Cases (31 features × 5 teste) | 155 | 155 | 100% |
| **Tier 3** | Pairwise Cross-Feature Interactions (T3-01 to T3-15) | 15 | 15 | 100% |
| **Tier 4** | Real-World Enterprise & Employee Lifecycles (S1 to S8) | 8 | 8 | 100% |
| **TOTAL** | **Toate cele 4 niveluri de verificare E2E** | **333** | **333** | **100%** |

---

## Complete 31-Feature Checklist Across All Tiers

| # | Feature | Sursă Statutară | Tier 1 (Functional) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Scenario) | Statut |
|---|---------|:---------------:|:-------------------:|:-----------------:|:-----------------:|:-----------------:|:------:|
| 1 | Resolver Integritate Date (Fără Mock) | R1 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-01, T3-14) | ✓ (S1, S2, S7) | COMPLET |
| 2 | Semnalare Date Lipsă (`isAutocompleted`) | R1 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-01, T3-14) | ✓ (S1, S3, S7) | COMPLET |
| 3 | Blocare `approved_for_print` la date lipsă | R1 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-01, T3-12) | ✓ (S1, S8) | COMPLET |
| 4 | Câmpuri Manuale Complete în UI | R1 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-01) | ✓ (S1, S2) | COMPLET |
| 5 | Escapare Caractere Speciale XML (`&`, `<`, `>`) | R1 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-02) | ✓ (S8) | COMPLET |
| 6 | Eliminare Fallback `employee[0]`/`jobs[0]` | R7 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-03) | ✓ (S1, S2) | COMPLET |
| 7 | Înregistrare Fișă Aptitudine HG 355/2007 | R2 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-04) | ✓ (S3) | COMPLET |
| 8 | Actualizare `medicalLastExamDate` & Conformitate | R2 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-04, T3-05) | ✓ (S3, S4) | COMPLET |
| 9 | Deblocare Generare la Examen Valabil | R2 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-04) | ✓ (S3) | COMPLET |
| 10 | Adăugare Manuală Salariat | R3 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-01, T3-02) | ✓ (S1) | COMPLET |
| 11 | Editare Salariat (Toate Câmpurile Statutare) | R3 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-01) | ✓ (S1) | COMPLET |
| 12 | Încetare Contract (`status: PLECAT`) | R3 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-05, T3-15) | ✓ (S4) | COMPLET |
| 13 | Excludere Salariați PLECAT din Conformitate & Batch | R3 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-05) | ✓ (S4) | COMPLET |
| 14 | Sincronizare Evenimente Instruire cu Documente | R4 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-06, T3-07) | ✓ (S5) | COMPLET |
| 15 | Filtrare Tipuri Evenimente în Fișe | R4 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-06) | ✓ (S5) | COMPLET |
| 16 | Planificare Sesiuni Viitoare (`status: planned`) | R4 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-07) | ✓ (S5) | COMPLET |
| 17 | Descărcare PV Colectiv & Fișă Direct din Card | R4 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-06) | ✓ (S5) | COMPLET |
| 18 | Eliminare Blocaj Expirare Instruire la Emitere Fișă | R4 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-08) | ✓ (S5) | COMPLET |
| 19 | Activare Modele Prisma EIP | R5 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-09) | ✓ (S1) | COMPLET |
| 20 | Generare Fișă Dotare EIP din Date Reale | R5 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-09) | ✓ (S1) | COMPLET |
| 21 | Evaluare Riscuri CRUD & Persistență | R6 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-10) | ✓ (S2) | COMPLET |
| 22 | Conectare `risk-evaluare` la Dosar DB Persistat | R6 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-10) | ✓ (S2) | COMPLET |
| 23 | Configurare Flaguri Risc pe Post (`Job`) | R6 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-09, T3-10) | ✓ (S1, S2) | COMPLET |
| 24 | Selector Punct de Lucru & Post în UI | R7 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-03, T3-11) | ✓ (S1, S2) | COMPLET |
| 25 | Filtrare IPSSM / Tematici pe CAEN & Riscuri Reale | R7 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-10, T3-11) | ✓ (S1, S2) | COMPLET |
| 26 | Tratare Erori per Salariat & Logging ZIP în Batch | R7 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-12) | ✓ (S8) | COMPLET |
| 27 | Asociere `HygieneSession` cu `Client` | R8 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-13) | ✓ (S6) | COMPLET |
| 28 | Editare Participanți Igienă & Certificate | R8 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-13) | ✓ (S6) | COMPLET |
| 29 | Calcul Conformitate Igienă pe CAEN / Post | R8 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-13) | ✓ (S1, S6) | COMPLET |
| 30 | Eliminare Atribuire `hireDate` la Import | R8 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-14) | ✓ (S7) | COMPLET |
| 31 | Re-validare Server-Side & Persistență Raport Diff | R8 | 5 / 5 ✓ | 5 / 5 ✓ | ✓ (T3-14, T3-15) | ✓ (S7) | COMPLET |

---

## Real-World Application Scenarios (Tier 4)

| # | Scenariu | Descriere & Flux Operațional | Caracteristici Statutare Verificate | Rezultat |
|---|----------|------------------------------|-------------------------------------|:--------:|
| **S1** | **Onboarding complet restaurant nou** | Client Horeca CAEN 5610, punct de lucru restaurant, bucătar șef (`isFoodHandling: true`), 3 articole EIP atribuite cu mărimi reale (38 pantofi), examen medical la angajare, curs de igienă solicitat, generare pachet complet onboarding 11 documente ZIP. | F1-F6, F10, F11, F19, F20, F27, F29, F24, F25 | PASS (100%) |
| **S2** | **Înființare Firmă IT cu sediu și telemuncă** | Client IT CAEN 6201, puncte de lucru Sediu + Telemuncă (Legea 81/2018), post DevOps (`isScreenWork: true`), comisie decizii SSM/PSI (01-11), evaluare riscuri INCDPM persistată în DB, generare dosar companie SSM 16 fișiere statutare. | F1-F6, F21-F25 | PASS (100%) |
| **S3** | **Înregistrare examen medical periodic** | Salariat cu examen medical expirat (16 luni), status inițial OVERDUE cu alertă roșie, înregistrare fișă aptitudine HG 355/2007 (termen 12 luni, APT), recalculare conformitate în VALID (365 zile rămase), deblocare generare documente. | F7, F8, F9, F2 | PASS (100%) |
| **S4** | **Încetare contract salariat (`PLECAT`)** | Încetare contract conform Codului Muncii cu `leaveDate` specificat, actualizare status la `PLECAT`, excludere automată din rata de conformitate a firmei (100%), excludere din pachetele de generare lot și arhive inspecție. | F12, F13, F26 | PASS (100%) |
| **S5** | **Sesiune instruire colectivă & fișe** | Înregistrare instruire periodică SSM/PSI pentru salariați activi, planificare sesiune viitoare (`status: planned`), sincronizare date protocol fără a suprascrie istoricul, descărcare directă PV colectiv și fișe individuale neblocate de instruiri expirate. | F14, F15, F16, F17, F18 | PASS (100%) |
| **S6** | **Curs igienă, examinare & certificate** | Sesiune Noțiuni Fundamentale de Igienă (Ord. 2209/2022) asociată companiei, înregistrare prezență, notare participanți, emitere certificate cu serie și număr, generare catalog examen XLSX și adeverințe participare DOCX. | F27, F28, F29 | PASS (100%) |
| **S7** | **Import fișier Excel cu date incomplete** | Import registru salariați cu coloane medicale și de instruire goale, verificare eliminare atribuire automată `hireDate`, persistență raport diff JSON în `ImportBatch`, păstrare status MISSING sincer. | F30, F31, F1, F2 | PASS (100%) |
| **S8** | **Generare batch cu caractere speciale** | Pachet onboarding pentru lot de salariați cu nume și date de firmă ce conțin `&`, `<`, `>`, `"`, `'`, verificare integritate structură ZIP, generare jurnal `00_RAPORT_GENERARE_LOT.txt`, 0 coruperi XML. | F5, F26, F3 | PASS (100%) |

---

## Statutory Verification Invariants

1. **HG 355/2007 (Medicina Muncii)**:
   - Termen periodic standard: 12 luni (sau 6 luni conform fișei de identificare a factorilor de risc).
   - Fereastră avertizare galbenă UPCOMING: 0..30 zile până la expirare.
   - Alertă roșie OVERDUE: < 0 zile rămase (termen depășit).
   - Lipsă fișă aptitudine: status MISSING, generare condiționată semnalată.
2. **Legea 319/2006 & HG 1425/2006 (SSM)**:
   - Instruire introductiv-generală: la angajare (minim 8 ore).
   - Instruire la locul de muncă: minim 8 ore, înainte de începerea efectivă a activității.
   - Instruire periodică: 6 luni (lucrători operativi) / 12 luni (TESA / birou).
   - Decizii angajator: Deciziile 01..11 constituite și semnate la înființare sau numire.
3. **Legea 307/2006 & OMAI 712/2005 (PSI / Apărare Împotriva Incendiilor)**:
   - Instruire introductiv-generală PSI: la angajare.
   - Instruire periodică PSI: 1, 3 sau 6 luni conform categoriei de risc la incendiu a locului de muncă.
   - Permis de lucru cu foc: generat doar cu măsuri specifice și stingătoare atestate.
4. **Ordinul MS/ME 2209/4469/2022 (Cursuri Igienă)**:
   - Valabilitate certificat igienă: exact 36 de luni (3 ani) de la data absolvirii examenului.
   - Aplicabilitate obligatorie: CAEN 5610 (Restaurante), unități de alimentație publică și posturi cu manipulare alimente (`isFoodHandling: true`).
5. **HG 1048/2006 (Echipamente Individuale de Protecție)**:
   - Fișă de acordare individuală generată din date reale de inventar EIP (cod, normă, termen de înlocuire).
   - Mărimi reale din baza de date (`shoeSize`, `clothingSize`, `gloveSize`), eliminând orice valoare mock hardcodată.
6. **Legea 53/2003 (Codul Muncii)**:
   - Drepturi salariale brute în lei, normă de lucru (8 ore/zi, 40 ore/săptămână), perioadă de probă (90 zile), preaviz (20 zile lucrătoare), concediu de odihnă (minim 20/21 zile).
