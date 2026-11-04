# Task Assignment: M1 Spec Miner 3 (Client Forms, Dropdown Persistence & Resolver Integration)

Read `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md` and `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`.
Scope: Milestone 1 (F3: Client Provider & Specialist Persistence & Template Binding).

Investigate:
1. `src/components/client-intake-modal.tsx` and `src/components/client-edit-modal.tsx`:
   - Fetching provider list from `/api/providers`.
   - Provider `<select>` dropdown and dynamically filtered Specialist `<select>` dropdown.
   - Pre-selection of default provider and auto-sync of certificate fields.
2. `src/app/api/clients/route.ts` and `src/app/api/clients/[id]/route.ts`:
   - Handling `providerId` and `specialistId` in `POST` and `PATCH`/`PUT`.
   - Updating legacy string columns to prevent breaking existing code.
3. `src/app/clients/[id]/page.tsx`:
   - Rendering assigned provider and specialist information on the client detail page.
4. `src/lib/templates/resolver.ts`:
   - Ensuring `resolveTemplatePlaceholders` queries include `provider` and `specialist`.
   - Ensuring provider and specialist tokens are bound from database entities.

Write your findings and recommendations to:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r3_spec_miner_3/handoff.md`.
Report completion via send_message.


## 2026-11-03T17:31:19Z
You are m1_r3_spec_miner_3, a specification mining and verification analysis agent.
Your working directory is: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r3_spec_miner_3/
Read your task assignment at: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r3_spec_miner_3/DISPATCH.md
Read the original request at: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Read the project architecture at: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md

Scope: Milestone 1 - F3 (Client Intake/Edit Dropdowns, Client API Persistence & Resolver Integration).
Investigate client-intake-modal.tsx, client-edit-modal.tsx, client API routes, client dossier view, and resolver.ts integration with assigned provider/specialist.
Write your recommendations to handoff.md in your working directory.
Notify parent via send_message when complete.
