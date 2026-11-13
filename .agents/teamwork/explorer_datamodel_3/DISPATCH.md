## 2026-11-05T17:18:42Z
You are teamwork_explorer assigned to investigate the Data Model, Seed Completeness, and Romanian Statutory Compliance for SSM, Emergency Situations, Occupational Medicine, EIP, CIM, and Hygiene courses.

## Working Directory & Identity
- Working directory: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_datamodel_3/
- Scope: Database schema (prisma/schema.prisma), seed data (prisma/seed.ts), business logic, and statutory compliance with Romanian labor and safety regulations.
- Path to Authoritative User Request: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
You MUST read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md first!

## Objectives & Detailed Tasks
1. Read ORIGINAL_REQUEST.md.
2. Inspect `prisma/schema.prisma`:
   - Audit all models: `Company` (Client), `Employee`, `Job`, `Worksite`, `TrainingSession`, `HygieneSession`, `SsmProvider`, `SsmSpecialist`, `Document`, `RiskAssessment`, etc.
   - Cross-reference with Romanian statutory requirements:
     * **SSM Law 319/2006 & Norme HG 1425/2006**: Fișa de instruire individuală (Anexa 11), Tematici instruire, Decizii interne SSM/CSSM, Serviciu extern vs intern, autorizații, reprezentanți lucrători.
     * **Situații de Urgență OMAI 712/2005**: Fișa individuală de instructaj SU, decizii de numire responsabil intervenție / evacuare.
     * **Medicina Muncii HG 355/2007**: Fișa de solicitare a examenului medical (Anexa 2), Fișa de identificare a factorilor de risc profesional (Anexa 3) — do models capture all statutory fields (risks, noxious agents, medical check intervals, doctor findings)?
     * **Echipament Individual de Protecție (EIP) HG 1048/2006**: Fișa de acordare EIP, mărimi, sortimente, periodicitate.
     * **Codul Muncii / CIM Ordinul MMSS 2171/2022**: Model-cadru CIM — are essential CIM clauses captured (probation, working hours, salary components, risks, place of work, collective contract)?
     * **Igienă (Ordinul MS/MECT 1225/2003 & Ordinul 2209/4469/2022)**: Cursanți, sesiuni igienă, furnizor avizat de Ministerul Sănătății/DSP, nivel instruire (Nivel 1 servicii/alimentară vs Nivel 2 conducere), număr aviz MS, adeverințe de absolvire, tabel cursanți.
3. Check `prisma/seed.ts`:
   - Does the seed populate realistic, valid Romanian statutory data for:
     * NEXUS SOLUTIONS S.R.L. (IT/Office context)
     * BISTRO GOURMET S.R.L. (HORECA / Food service context with Hygiene requirements)
   - Are there missing fields in seed that cause placeholder resolvers to generate blank strings, defaults, or crashes?
4. Audit relationships and business logic:
   - How are Hygiene sessions linked to employees, companies, or external cursanți?
   - How are jobs linked to risk factors and EIP items?
   - How is the default SSM specialist/provider resolved if not explicitly set per client?

## Deliverables
- Write `analysis.md` in `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_datamodel_3/` with:
  1. Statutory Compliance Matrix: Law/Norm, Required Document, Required Data Fields, Prisma Model Support (Full / Partial / Missing), Gap Analysis.
  2. Data Model Refactoring Plan: Schema adjustments, missing relations, and enum enrichments.
  3. Seed Data Completeness Audit: what is missing in current seed for NEXUS and BISTRO GOURMET to allow 100% clean document generation.
  4. Business logic recommendations: specialist inheritance, hygiene course tracking, automated document generation triggers.
- Write `handoff.md` summarizing key findings and send a completion message back to the orchestrator.
- Update `progress.md` with your status.
