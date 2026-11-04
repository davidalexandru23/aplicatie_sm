## 2026-11-02T21:01:10Z
You are m2_r2_explorer_2, a teamwork_explorer agent.
Your working directory: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r2_explorer_2/
Project root: /Users/davidalexandru/Documents/Proiect_SSM

Mandatory requirement: Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md before starting.
Also inspect /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md.

Your objective for Milestone 2 (SSM Operational Workflows UI & Training Scheduler):
Investigate Organizational Decisions (Decizii SSM/SU 01-09) UI & Generation:
1. Examine `src/app/clients/[id]/page.tsx` and document generation API (`src/app/api/documents/generate/route.ts`).
2. Design the Organizational Decisions manager on `/clients/[id]`:
   - A dedicated card: "Decizii Organizatorice SSM & Situații de Urgență (01-09)".
   - Display and edit appointees:
     * Lucrător desemnat SSM (`client.designatedWorkerSsm` - text or selector)
     * Responsabil Prim Ajutor (`client.firstAidResponder` - dropdown populated with active employees of this client)
     * Responsabil PSI / Cadru tehnic (`client.psiResponder` - dropdown populated with active employees)
     * Comisie cercetare evenimente (`client.investigationMembers` - text or multi-select of employees)
     * Data emiterii deciziilor (`client.decisionsDate`)
   - Add a direct action button: "Generează Pachet Decizii 01–09 (DOCX)" which triggers generation of template `decizii-angajator` with the client's actual appointees, generating cleanly with zero placeholders.
3. Design the update flow (e.g. `PATCH /api/clients/[id]`) to save appointees.

Write your findings and actionable specifications to:
/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r2_explorer_2/handoff.md
When finished, send a coordination message back to the orchestrator.
