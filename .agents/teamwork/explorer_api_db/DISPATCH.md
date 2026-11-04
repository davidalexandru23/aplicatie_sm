# Task Assignment: API and Database Pattern Exploration

**Objective**: Explore the existing codebase at `/Users/davidalexandru/Documents/Proiect_SSM` for API patterns, database schema, Prisma client, and related conventions.

**Scope & Responsibilities**:
1. Read `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`.
2. Inspect `prisma/schema.prisma` to see the exact definitions of `HygieneSession`, `HygieneParticipant`, and any related models (`Employee`, `Department`, etc.).
3. Inspect existing API routes (e.g. `src/app/api/...` or `app/api/...`), looking for:
   - Request validation patterns (Zod or manual validation)
   - Error handling patterns (status codes, JSON error formats)
   - Database operations using `prisma` (imports from `@/lib/prisma` or similar)
   - Pagination, filtering, searching conventions
4. Note file paths, conventions, and exact imports to follow for new API routes (`app/api/hygiene/...` or `src/app/api/hygiene/...`).
5. Write your report to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_api_db/api_db_report.md` and your `handoff.md`.


## 2026-11-03T19:56:36Z
You are a teamwork_explorer working on the survey phase for hygiene sessions implementation.
Your working directory is: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_api_db/
Read your task assignment at: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_api_db/DISPATCH.md
Read the user request at: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Explore the codebase at /Users/davidalexandru/Documents/Proiect_SSM:
- Inspect prisma/schema.prisma for HygieneSession, HygieneParticipant, Employee, and related models.
- Inspect existing API routes in app/api (or src/app/api) for route structure, HTTP methods, response format, error handling, validation, and prisma import.
Write your detailed findings to: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_api_db/api_db_report.md
and a complete handoff report to: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_api_db/handoff.md
Update your progress.md periodically.
When finished, send a brief message to parent (me) referencing your handoff file.
