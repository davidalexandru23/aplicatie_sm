# SCOPE: Plan de Remediere si Regandire a Solutiei (SSM / Igiena / HR)

## Architecture
- Romanian Statutory SSM / Hygiene / HR SaaS app in Next.js 16 (App Router, Turbopack, ESM), Prisma ORM 6, PostgreSQL, docxtemplater, SheetJS.
- Catalog of 31 statutory templates (29 DOCX, 2 XLSX).
- Resolver transforms database models (Client, Employee, Job, SsmProvider, SsmSpecialist, HygieneSession, Worksite) into tokens.
- Generator produces DOCX/XLSX binaries and downloads/zips.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | XLSX Buffer Fix | Fix XLSX crash in generator.ts using fs.readFileSync buffer | M1 | PLAN_REMEDIERE_SI_REGANDIRE.md D1 / Faza 1 |
| 2 | Job Dropdown Predicate Fix | Hide Job dropdown on hygiene and general templates in UI | M1 | PLAN_REMEDIERE_SI_REGANDIRE.md D2 / Faza 1 |
| 3 | Prisma Schema Extension | Add statutory CIM, SSM, and sizes to Employee; risk profiling to Job; add EIP models | M2 | PLAN_REMEDIERE_SI_REGANDIRE.md D3 / Faza 2 |
| 4 | Prisma DB Push | Run npx prisma db push | M2 | PLAN_REMEDIERE_SI_REGANDIRE.md Faza 2 |
| 5 | Statutory Seed Realism | Complete real data for Nexus & Bistro Gourmet with 0 empty fields | M2 | PLAN_REMEDIERE_SI_REGANDIRE.md Faza 2 |
| 6 | Dynamic Resolver | Bind CIM fields, dynamically assign medical/EIP by job/CAEN | M3 | PLAN_REMEDIERE_SI_REGANDIRE.md D4 / Faza 3 |
| 7 | 31/31 Templates Approved | 100% of statutory templates generate with approved_for_print | M3 | PLAN_REMEDIERE_SI_REGANDIRE.md Faza 3 |
| 8 | Generator 5 Modes Redesign | 5 dedicated operational tabs in /documents/generate | M4 | PLAN_REMEDIERE_SI_REGANDIRE.md D5 / Faza 4 |
| 9 | Worksite Selector | Explicit Worksite dropdown in UI | M4 | PLAN_REMEDIERE_SI_REGANDIRE.md Faza 4 |
| 10 | CRUD Modals & 1-Click ZIP | Add/Edit Employee, Add Worksite/Job, 1-Click Onboarding ZIP, 1-Click Hygiene ZIP | M4 | PLAN_REMEDIERE_SI_REGANDIRE.md Faza 4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Quick Fixes Imediate | Fix XLSX buffer crash in generator.ts & fix UI predicate in page.tsx | none | DONE |
| 2 | M2: Schema Prisma & Seed Realist | Add fields to Employee, Job, add EIP models, prisma db push, update seed.ts | M1 | IN_PROGRESS |
| 3 | M3: Rafinare Resolver & Conectare Dinamica | Dynamic risk/EIP logic, bind CIM fields, verify 31/31 templates approved | M2 | PLANNED |
| 4 | M4: Redesign UI & Modale CRUD Operative | 5 modes tabs, worksite selector, CRUD modals in clients/employees/hygiene, 1-Click ZIP buttons | M3 | PLANNED |
