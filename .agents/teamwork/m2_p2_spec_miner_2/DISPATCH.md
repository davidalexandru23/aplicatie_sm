# DISPATCH — m2_p2_spec_miner_2

## Mission
Investigate Romanian statutory requirements and design template schemas for:
1. F9 (Part A): `med-fisa-solicitare-examen` (Fișa de Solicitare a Examenului Medical la Angajare / Periodic conform Anexei 2 din HG 355/2007).
2. F9 (Part B): `med-fisa-identificare-riscuri` (Fișa de Identificare a Factorilor de Risc Profesional conform Anexei 3 din HG 355/2007).
3. F10 (Part A): `eip-fisa-acordare-individuala` (Fișa Individuală de Dotare și Acordare EIP conform HG 1048/2006).

## Context & Inputs
- Original Request: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- Project Plan: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- Legal references: HG 355/2007 privind supravegherea sănătății lucrătorilor; HG 1048/2006 privind cerințele minime de securitate și sănătate pentru utilizarea de către lucrători a echipamentelor individuale de protecție la locul de muncă.
- Definitions Catalog: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/definitions.ts`

## Investigation Questions
1. Anexa 2 HG 355/2007: What are the exact statutory fields (employer data, employee personal data, medical exam type: angajare/periodic/reluare/adaptare, job title, work conditions)?
2. Anexa 3 HG 355/2007: What are the statutory occupational risk categories (riscuri fizice, chimice, biologice, sarcina de muncă, condiții de mediu) and how to represent them cleanly with dynamic placeholders?
3. HG 1048/2006: What is the structure of the EIP sheet (allocation table: equipment type, standard/norm, date of distribution, signature, wear period)?
4. Provide complete token schemas, table structures, and implementation templates for the Worker in `handoff.md`.
5. Notify orchestrator via `send_message`.


## 2026-11-05T00:42:06Z
You are m2_p2_spec_miner_2.
Your working directory is /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_p2_spec_miner_2.
Read your task assignment from /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_p2_spec_miner_2/DISPATCH.md.
Also read:
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md
- /Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/definitions.ts

Investigate F9 (Fișă solicitare examen medical Anexa 2 și Fișă identificare riscuri Anexa 3 HG 355/2007) and F10 Part A (Fișă acordare EIP HG 1048/2006).
Extract exact statutory requirements and design token schemas for the Worker in handoff.md.
Notify the orchestrator with send_message when complete.
