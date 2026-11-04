# Task Assignment: M1 Worker 1 (SSM Provider Profile & Client Assignment)

Read:
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r3_explorer_1/handoff.md` and `schema.patch`
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r3_explorer_2/proposed_settings_page.tsx` and proposed route files
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r3_spec_miner_3/handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Implementation Scope
1. **Prisma Schema (`prisma/schema.prisma`)**:
   - Add models `SsmProvider` and `SsmSpecialist`.
   - Add `providerId` and `specialistId` on `Client` with `onDelete: SetNull` and indices, while preserving legacy string fields (`ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`).
   - Run `npx prisma db push` to update PostgreSQL and regenerate `@prisma/client`.
2. **Database Seed (`prisma/seed.ts`)**:
   - Seed default provider `EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.` with complete Romanian legal credentials.
   - Seed designated specialists `Ing. Mihai Popescu` and `Ing. Elena Vasilescu`.
   - Link seeded clients NEXUS and BISTRO to the default provider and specialist, synchronizing legacy strings.
   - Run `npx tsx prisma/seed.ts`.
3. **Provider REST API Endpoints**:
   - `src/app/api/settings/provider/route.ts` (`GET`, `PUT`).
   - `src/app/api/settings/provider/specialists/route.ts` (`POST`).
   - `src/app/api/settings/provider/specialists/[id]/route.ts` (`PATCH`, `DELETE`).
   - `src/app/api/providers/route.ts` (`GET`).
4. **Provider Settings UI & Navigation**:
   - `src/app/settings/page.tsx`: Provider corporate profile, ITM accreditation, and designated specialists management.
   - `src/app/layout.tsx`: Add "Setări SEPP" link in navigation.
5. **Client Forms & Client API Dual Persistence**:
   - `src/components/client-intake-modal.tsx`: Provider & Specialist reactive `<select>` dropdowns with default pre-selection and legacy string auto-sync.
   - `src/components/client-edit-modal.tsx`: Provider & Specialist reactive dropdowns prefilled from client data.
   - `src/app/api/clients/route.ts` & `src/app/api/clients/[id]/route.ts`: Persist `providerId` and `specialistId` with dual sync to legacy strings.
   - `src/app/clients/[id]/page.tsx`: Render rich SEPP provider and specialist accreditation card.
6. **Template Resolver Integration (`src/lib/templates/resolver.ts`)**:
   - Eager-load `provider` and `specialist` relations in `resolveTemplatePlaceholders`.
   - Bind all 24 provider/specialist tokens dynamically from database records into `verifiedMap`.
7. **Verification**:
   - Run `npx tsc --noEmit`.
   - Run `npx tsx scripts/verify-all.ts`.
   - Ensure clean exit code 0 and all tests pass.

Write your complete handoff report to:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r3_worker_1/handoff.md`.
Notify parent via send_message when complete.


## 2026-11-03T17:41:53Z
You are m1_r3_worker_1, an implementation worker agent.
Implement Milestone 1 end-to-end:
1. Apply Prisma schema changes in prisma/schema.prisma and run npx prisma db push.
2. Update prisma/seed.ts and run npx tsx prisma/seed.ts.
3. Implement provider REST API routes under src/app/api/settings/provider and src/app/api/providers.
4. Implement settings UI in src/app/settings/page.tsx and add navigation link in src/app/layout.tsx.
5. Update client intake modal, client edit modal, client API routes, client dossier view with provider/specialist dropdowns and dual persistence.
6. Update template resolver in src/lib/templates/resolver.ts to eagerly load and dynamically bind provider and specialist data.
7. Run build and tests (npx tsc --noEmit, npx tsx scripts/verify-all.ts).
8. Write comprehensive handoff.md in your working directory and notify parent via send_message.


## 2026-11-03T17:52:19Z
**Context**: Milestone 1 Implementation (SSM Provider Profile & Client Assignment).
**Content**: Checking in on your progress regarding schema migration, seed execution, REST APIs, Settings UI, and client modals.
**Action**: Please provide a status update and update your progress.md with current tasks.
