# Scope: Milestone 1 (M1) - Template Resolver & Generator Data Integrity

## Architecture & Boundaries
This milestone hardens the data integrity of the statutory document generation pipeline:
- Files Owned:
  - `src/lib/templates/resolver.ts` (Resolver data loading, context binding, fallback removal, `isAutocompleted`)
  - `src/lib/templates/generator.ts` (DOCX/XLSX generation, XML character escaping, `approved_for_print` verification)
  - `src/app/documents/generate/page.tsx` (Manual field list rendering, worksite dropdown support, auto-job selection fix)
  - `src/app/api/documents/generate/route.ts` (worksiteId passthrough)
  - `src/app/api/templates/[code]/fields/route.ts` (worksiteId passthrough)

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Eliminare Mock Resolver | Curățare 8 blocuri fallback fictive din `resolver.ts` (Munteanu Cristian, CLIENT TEST, RO12345678, RX 123456, 15.03.1988, 0I(Rh+), 42/L/9, decizii 01-11). Câmpurile lipsă în DB rezolvă la string gol `""` sau `null`. | M1 | R1, Survey 1 | DONE |
| 2 | Corectare `isAutocompleted` | Setare `true` DOAR dacă datele reale există în DB; câmpurile lipsă semnalate sincer ca needitate (`isAutocompleted: false`) și lăsate editabile în UI | M1 | R1, Survey 1 | DONE |
| 3 | Corectare `approved_for_print` | Neacordare flag când lipsesc date statutare esențiale (`cimNumber`, `grossSalary` etc.) în `generator.ts` | M1 | R1, Survey 1 | DONE |
| 4 | Deblocare Câmpuri Manuale UI | Eliminare `.slice(0, 20)` din `generate/page.tsx` pentru afișarea completă a tuturor câmpurilor manuale | M1 | R1, Survey 1 | DONE |
| 5 | Escapare Caractere Speciale XML | Adăugare `escapeXml` în `generator.ts` (`&` -> `&amp;`, `<` -> `&lt;`, `>` -> `&gt;`, `"` -> `&quot;`, `'` -> `&apos;`) la înlocuirea tokenurilor în XML | M1 | R1, Survey 3 | DONE |
| 6 | Eliminare Fallback Context Resolver | Eliminare fallback pe `client.employees[0]`, `client.jobs[0]`, `client.worksites[0]` în `loadResolverContext` și `resolveTemplateData`; adăugare `worksiteId?: string` în `TemplateResolutionContext` | M1 | R7, Survey 3 | DONE |

## Interface Contracts
- `TemplateResolutionContext`:
  ```typescript
  export interface TemplateResolutionContext {
    templateCode: string;
    clientId: string;
    employeeId?: string;
    jobId?: string;
    worksiteId?: string;
    hygieneSessionId?: string;
    hygieneParticipantId?: string;
    customOverrides?: Record<string, unknown>;
    allowOfflineBlank?: boolean;
  }
  ```
- `ResolvedTemplateData`:
  - `data: Record<string, unknown>` (fără date fabricate; câmpurile absente rămân `''` sau `undefined`).
  - `isAutocompleted: boolean` per placeholder (doar dacă valoarea provine dintr-o entitate reală din DB).
  - `missingFields: string[]` (lista tokenurilor statutare obligatorii care nu au valoare în DB).
  - `approvedForPrint: boolean` (`true` doar dacă `missingFields.length === 0` și datele esențiale precum CIM și salariu sunt prezente).

## Verification Criteria
1. `npm run build` PASS (fără erori de compilare TypeScript Next.js).
2. `npx prisma validate` PASS.
3. `npx tsx scripts/test-all-templates-generation.ts` rulează și documentează rezultatele.
4. Niciun string de test mock (`Munteanu Cristian`, `CLIENT TEST`, `RO12345678`, `RX 123456`, `15.03.1988`, `0I(Rh+)`, `42/L/9`) nu mai este injectat ca fallback.
5. `isAutocompleted` este `false` pentru câmpurile fără valoare în DB.
6. `approved_for_print` este `false` (`missing_data`) când lipsesc câmpuri obligatorii precum CIM și salariu.
7. Fișierele DOCX ce conțin `&` se generează fără corupere XML.
8. Toate câmpurile manuale sunt afișate în UI (fără `.slice(0, 20)`).
