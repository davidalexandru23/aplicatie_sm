# DISPATCH: Milestone 2 Worker (Compliance UI Tracking & Alerts Implementer)

## Assignment
You are the implementation Worker for Milestone 2: Compliance UI Tracking & Alerts.
Your task is to implement the reusable compliance badges, dashboard alerts, employee directory compliance columns & tabs, and client-level compliance overview.

## Exclusive File Ownership
You exclusively own and may edit or create:
- `src/components/compliance-badge.tsx`
- `src/components/compliance-alerts.tsx`
- `src/app/employees/page.tsx`
- `src/app/employees/employee-registry-client.tsx`
- `src/app/clients/[id]/page.tsx`
- `src/app/page.tsx`

Do NOT touch any template files (`src/lib/templates/`) or core compliance engine (`src/lib/compliance.ts`) in this milestone.

## Mandatory Inputs & Reports to Read
Read these reports carefully before writing code:
1. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
3. `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/compliance.ts`
4. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_explorer_1/handoff.md` and `analysis.md`
5. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_explorer_2/handoff.md` and `analysis.md`
6. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_explorer_3/handoff.md` and `analysis.md`

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Action Steps
1. Create `src/components/compliance-badge.tsx` implementing `<ComplianceItemBadge>`, `<OverallComplianceBadge>`, `<ComplianceScoreBadge>`, `<ComplianceBreakdownPills>`, `<ComplianceAlertBanner>` with pure CSS hover tooltips and Tailwind styling.
2. Create `src/components/compliance-alerts.tsx` with interactive category tabs (`Toate`, `Medicină Muncii`, `SSM`, `PSI`, `Igienă`), Critical Overdue panel, and Upcoming Scadențe (&le; 30d) panel.
3. Implement `src/app/employees/employee-registry-client.tsx` and refactor `src/app/employees/page.tsx`:
   - 8-column layout with 5 compliance columns (Medicină Muncii, SSM, PSI, Igienă, Conformitate Generală).
   - Filtering tabs with live counts (`Toți`, `Conformi`, `Scadenți curând`, `Termene depășite`, `Date lipsă`), instant search, and `?status=...` deep-linking.
4. Refactor `src/app/clients/[id]/page.tsx` to include the company compliance score gauge, 4-status distribution pills, alert banner, and employee table compliance badges.
5. Refactor `src/app/page.tsx` (Dashboard) to include the 4 KPI compliance cards, the `ComplianceAlerts` component, and the Client Compliance portfolio table.
6. Verify build & tests:
   - Run `npx tsc --noEmit` and verify exit code 0.
   - Run `npm run build` and verify clean Next.js 16 App Router build with exit code 0.
   - Run `npx tsx scripts/verify-compliance.ts` and verify 45/45 pass.
7. Write hard handoff report `handoff.md` in your directory. Send completion message when done.
