# Task Assignment: M2 Explorer 3 - /documents/generate UI & API Flow for Hygiene

## Objective
Investigate how a user selects and generates hygiene documents directly from the `/documents/generate` page (as requested by user: "Cand o sa vreau sa generez ceva legat de igiena, trebuie sa pot sa selectez direct din tabul de generare, Tabel evidenta cursanti igiena trebuie sa genereze un tabel cu toti angajatii care au facut un modul de igiena, ce modul, cand...").
Analyze:
1. `src/app/documents/generate/page.tsx`
2. `src/app/api/documents/generate/route.ts`
3. How hygiene sessions and/or client employees are picked when selecting hygiene templates.
4. How parameters flow from UI to `/api/documents/generate` to `resolver.ts` to `generator.ts`.
5. What UI enhancements or options are needed so the user can easily select:
   - Client company
   - Hygiene template (e.g. Tabel evidenta cursanti igiena, Anexe Curs, Adeverinta)
   - Scope: all employees with hygiene modules OR a specific hygiene session
   - Direct download and generation feedback.

## Input Files
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- `/Users/davidalexandru/Documents/Proiect_SSM/src/app/documents/generate/page.tsx`
- `/Users/davidalexandru/Documents/Proiect_SSM/src/app/api/documents/generate/route.ts`
- `/Users/davidalexandru/Documents/Proiect_SSM/src/app/hygiene/page.tsx`

## Output Requirements
Write your detailed UI/API analysis, gaps, and concrete implementation recommendations to:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r4_explorer_3/handoff.md`
Then notify the orchestrator via `send_message`.
