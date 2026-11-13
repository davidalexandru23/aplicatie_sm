# E2E Test Infra: Sistem Statutar SSM / Igienă / HR

## Test Philosophy
- Opaque-box, requirement-driven. Validare strictă din perspectiva operatorului și a legii din România (Legea 319/2006, HG 1425/2006, HG 355/2007, HG 1048/2006, OMAI 712/2005, Ordinul MS/ME 2209/4469/2022).
- Metodologie: Category-Partition + Boundary Value Analysis + Pairwise + Real-World Workloads.
- Nicio dependență pe starea internă sau detalii de implementare privată.

## Feature Inventory & Test Coverage
| # | Feature | Sursă | Tier 1 (Functional) | Tier 2 (Boundary) | Tier 3 (Cross-feature) | Tier 4 (Real-world) |
|---|---------|-------|:-------------------:|:-----------------:|:----------------------:|:-------------------:|
| 1 | Resolver Integritate Date (Fără Mock) | R1 | 5 | 5 | ✓ | ✓ |
| 2 | Semnalare Date Lipsă (`isAutocompleted`) | R1 | 5 | 5 | ✓ | ✓ |
| 3 | Blocare `approved_for_print` la date lipsă | R1 | 5 | 5 | ✓ | ✓ |
| 4 | Câmpuri Manuale Complete în UI | R1 | 5 | 5 | ✓ | ✓ |
| 5 | Escapare Caractere Speciale XML (`&`, `<`, `>`) | R1 | 5 | 5 | ✓ | ✓ |
| 6 | Eliminare Fallback `employee[0]`/`jobs[0]` | R7 | 5 | 5 | ✓ | ✓ |
| 7 | Înregistrare Fișă Aptitudine HG 355/2007 | R2 | 5 | 5 | ✓ | ✓ |
| 8 | Actualizare `medicalLastExamDate` & Conformitate | R2 | 5 | 5 | ✓ | ✓ |
| 9 | Deblocare Generare la Examen Valabil | R2 | 5 | 5 | ✓ | ✓ |
| 10 | Adăugare Manuală Salariat | R3 | 5 | 5 | ✓ | ✓ |
| 11 | Editare Salariat (Toate Câmpurile Statutare) | R3 | 5 | 5 | ✓ | ✓ |
| 12 | Încetare Contract (`status: PLECAT`) | R3 | 5 | 5 | ✓ | ✓ |
| 13 | Excludere Salariați PLECAT din Conformitate & Batch | R3 | 5 | 5 | ✓ | ✓ |
| 14 | Sincronizare Evenimente Instruire cu Documente | R4 | 5 | 5 | ✓ | ✓ |
| 15 | Filtrare Tipuri Evenimente în Fișe | R4 | 5 | 5 | ✓ | ✓ |
| 16 | Planificare Sesiuni Viitoare (`status: planned`) | R4 | 5 | 5 | ✓ | ✓ |
| 17 | Descărcare PV Colectiv & Fișă Direct din Card | R4 | 5 | 5 | ✓ | ✓ |
| 18 | Eliminare Blocaj Expirare Instruire la Emitere Fișă | R4 | 5 | 5 | ✓ | ✓ |
| 19 | Activare Modele Prisma EIP | R5 | 5 | 5 | ✓ | ✓ |
| 20 | Generare Fișă Dotare EIP din Date Reale | R5 | 5 | 5 | ✓ | ✓ |
| 21 | Evaluare Riscuri CRUD & Persistență | R6 | 5 | 5 | ✓ | ✓ |
| 22 | Conectare `risk-evaluare` la Dosar DB Persistat | R6 | 5 | 5 | ✓ | ✓ |
| 23 | Configurare Flaguri Risc pe Post (`Job`) | R6 | 5 | 5 | ✓ | ✓ |
| 24 | Selector Punct de Lucru & Post în UI | R7 | 5 | 5 | ✓ | ✓ |
| 25 | Filtrare IPSSM / Tematici pe CAEN & Riscuri Reale | R7 | 5 | 5 | ✓ | ✓ |
| 26 | Tratare Erori per Salariat & Logging ZIP în Batch | R7 | 5 | 5 | ✓ | ✓ |
| 27 | Asociere `HygieneSession` cu `Client` | R8 | 5 | 5 | ✓ | ✓ |
| 28 | Editare Participanți Igienă & Certificate | R8 | 5 | 5 | ✓ | ✓ |
| 29 | Calcul Conformitate Igienă pe CAEN / Post | R8 | 5 | 5 | ✓ | ✓ |
| 30 | Eliminare Atribuire `hireDate` la Import | R8 | 5 | 5 | ✓ | ✓ |
| 31 | Re-validare Server-Side & Persistență Raport Diff | R8 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test Runner unificat: `scripts/verify-all.ts` și suită dedicată `scripts/e2e-suite.ts`.
- Format teste: Scenarii automate TypeScript cu verificare semantică a payload-urilor API, a integrității fișierelor DOCX/XLSX/ZIP generate și a coerenței bazei de date.
- Criterii de acceptanță: Exit code 0, 100% teste trecute, 0 tokenuri fictive sau necompletate în documente statutare.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexitate |
|---|----------|--------------------|--------------|
| 1 | Onboarding complet restaurant nou (Horeca CAEN 5610) | F1-F6, F10, F11, F19, F20, F27, F29, F24, F25 | High |
| 2 | Pachet Înființare Firmă IT cu sediu și telemuncă | F1-F6, F21-F25 | Medium |
| 3 | Înregistrare examen medical periodic și deblocare operator | F7, F8, F9, F2 | Medium |
| 4 | Încetare contract de muncă salariat și recalculare conformitate | F12, F13, F26 | Medium |
| 5 | Sesiune instruire colectivă, planificare și descărcare PV/fișe | F14, F15, F16, F17, F18 | High |
| 6 | Curs igienă, examinare participanți și emitere certificate | F27, F28, F29 | High |
| 7 | Import fișier Excel cu date incomplete și validare fără fake dates | F30, F31, F1, F2 | High |
| 8 | Generare batch pachet onboarding cu caractere speciale (`&`) | F5, F26, F3 | High |

## Coverage Thresholds
- Tier 1: ≥5 cazuri per feature (31 features × 5 = 155 teste funcționale)
- Tier 2: ≥5 cazuri boundary per feature (valori nule, caractere speciale, depășiri de termen, CNP-uri limită)
- Tier 3: acoperire pairwise a interacțiunilor majore
- Tier 4: ≥8 scenarii realiste integrate end-to-end
