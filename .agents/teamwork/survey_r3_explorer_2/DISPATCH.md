# Task Assignment: Survey Explorer 2 (SSM External Service Provider Profile & Client Assignment)

Read `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`.
Investigate R2 (SSM External Service Provider Profile) and its integration:
- Inspect `prisma/schema.prisma` for Provider, Specialist, and Client models.
- Inspect settings pages and routes (e.g. `/src/app/settings`, API routes under `/src/app/api`).
- Inspect client creation and edit forms (e.g. `/src/app/clients/new`, `/src/app/clients/[id]`).
- Check how provider company info (name, CUI, Trade Registry number, official address, Labour Ministry/ITM authorization certificate number and issue date) and designated SSM specialists with contact information should be modeled and managed.
- Check how client company forms persist assigned provider and selected specialist dropdown.
- Check how provider and specialist data populate into generated templates (in `resolver.ts`).
- Identify exact changes needed across Prisma, UI, API, and template resolver.
- Write your comprehensive findings to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_r3_explorer_2/handoff.md`.
- Report completion via send_message.

## 2026-11-03T17:17:16Z
Received dispatch from 52a3ebb3-f7ef-4302-a871-b663bbb8cd88:
Investigate R2 (SSM External Service Provider Profile) and its integration:
- Inspect `prisma/schema.prisma` for Provider, Specialist, and Client models.
- Inspect settings pages and routes (e.g. `/src/app/settings`, API routes under `/src/app/api`).
- Inspect client creation and edit forms (e.g. `/src/app/clients/new`, `/src/app/clients/[id]`, `/src/app/clients/[id]/edit`).
- Check how provider company info (name, CUI, Trade Registry number, official address, Labour Ministry/ITM authorization certificate number and issue date) and designated SSM specialists with contact information should be modeled and managed.
- Check how client company forms persist assigned provider and selected specialist dropdown.
- Check how provider and specialist data populate into generated templates (in `resolver.ts`).
- Identify exact changes needed across Prisma, UI, API, and template resolver.
