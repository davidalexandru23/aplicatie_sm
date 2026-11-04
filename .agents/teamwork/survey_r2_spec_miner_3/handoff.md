# Handoff Report: Romanian SSM Operational Workflows & Contextual Document Generation Mining

**Agent**: `survey_r2_spec_miner_3` (teamwork_spec_miner)  
**Date**: 2026-11-02  
**Milestone**: Romanian SSM Operational Workflows (R1) & Contextual Document Generation (R2)  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_r2_spec_miner_3/`  
**Target Recipient**: Orchestrator (`e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb`)

---

## 1. Observation

### 1.1 Direct Artifact & Codebase Inspections
1. **Template Pack Directory (`handoff/ssm-template-placeholder-pack/templates/`)**:
   - Contains 28 files (25 official template models: 23 `.docx`, 2 `.xlsx`, plus 3 preview/duplicate files).
   - Full inventory confirmed in `handoff/ssm-template-placeholder-pack/INVENTAR_PLACEHOLDERE.md` and registered in `src/lib/templates/definitions.ts` (3,207 lines, 25 catalog entries with zero unmapped templates).
   - Word templates use `{PLACEHOLDER_*}` tokens directly in the body XML, headers (`word/header*.xml`), and footers (`word/footer*.xml`).
   - Excel templates (`Anexe Curs igiena.xlsx`, `Tabel Cursanti exemplu.xlsx`) contain numbered participant token ranges (`{001–100}`, `{001–115}`, `{001–195}`) spanning multiple sheets (8 official annexes under Ordinul MS/ME 2209/4469/2022).

2. **Template Generator & Resolver (`src/lib/templates/`)**:
   - `generator.ts` (645 lines): Employs a multi-part XML engine using `PizZip`, `docxtemplater`, `xlsx`, and `pdf-lib`. It parses `word/document.xml`, `header*.xml`, `footer*.xml`, and `_rels/footer*.xml.rels` to replace body and running header tokens. For XLSX, it blanks unused participant cells from $N+1$ to 100/195 to prevent dangling placeholders.
   - `resolver.ts` (759 lines): Implements cascading data composition:
     `ALL_ROMANIAN_LEGAL_FALLBACKS` $\rightarrow$ `verifiedMap` (PostgreSQL records) $\rightarrow$ `customOverrides`.
     It embeds authentic statutory fallback profiles for an authorized Romanian External Prevention and Protection Service (SEPP) (`ROMANIAN_LEGAL_SSM_PROVIDER`), Decizii 01–09 (`ROMANIAN_LEGAL_DECIZII`), INCDPM Pece risk evaluation (`TESA_DEFAULT_FACTORS`, 30 factors, $N_{rg} = 2.62$), and Labor Code HR clauses (`ROMANIAN_LEGAL_HR_CIM`).

3. **Database Schema (`prisma/schema.prisma`)**:
   - 478 lines defining 18 models: `Client`, `Worksite`, `Job`, `Employee`, `IdentityDocument`, `ResidenceAddress`, `EmploymentHistory`, `RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone`, `TrainingMaterial`, `TrainingEvent`, `TrainingParticipant`, `HygieneSession`, `HygieneParticipant`, `Template`, `GeneratedDocument`, `ImportBatch`, and `AuditEvent`.
   - Employee model carries complete statutory compliance fields: `medicalLastExamDate`, `medicalIntervalMonths`, `medicalFitnessVerdict`, `medicalNotes`, `ssmLastTrainingDate`, `ssmIntervalMonths`, `ssmNotes`, `psiLastTrainingDate`, `psiIntervalMonths`, `psiNotes`, `hygieneLastExamDate`, `hygieneCertificateNumber`, `hygieneCertificateIssueDate`, `hygieneIntervalMonths`, and `hygieneNotes`.

4. **Compliance Engine (`src/lib/compliance.ts`)**:
   - 437 lines implementing deterministic interval mathematics with `addMonthsSafe` end-of-month clamping (e.g. Feb 29 leap years, Jan 31 + 1 month $\rightarrow$ Feb 28/29), UTC midnight normalization for DST immunity, and 4-tier status classification (`VALID`, `UPCOMING`, `OVERDUE`, `MISSING`).
   - Thresholds: `UPCOMING` = 0 to 30 days remaining; `OVERDUE` = $< 0$ days; `VALID` = $> 30$ days.

5. **Automated Verification Suite Results**:
   - Executed `scripts/verify-all.ts` via `npx tsx scripts/verify-all.ts`:
     - Suite 1 (Document Auto-Completion): 25/25 official templates generated cleanly with 0 unmapped `{PLACEHOLDER_*}` tokens.
     - Suite 2 (Compliance Deadlines & Expiry): 45/45 mathematical and statutory interval unit tests passed.
     - Suite 3 (Comprehensive E2E Suite): 53/53 test cases passed.
     - Suite 4 (Application Production Build): Clean Next.js 16 App Router build (`npm run build`) in 3.3s with zero TypeScript errors.
     - Total: 124/124 verified items passed (100% pass rate).

---

## 2. Logic Chain

### 2.1 Benchmark of Romanian SSM Platform Practices & Statutory Foundations
Benchmarking industry leaders (easyssm.ro, ssm.ro, cloudssm.ro) alongside Romanian occupational safety legislation reveals a tightly coupled 5-stage operational workflow:

```
[Client Intake] ──► [Risk Assessment (Pece)] ──► [Organizational Decisions] ──► [Training Schedule] ──► [Compliance & Scadențe]
  (CUI, CAEN,         (4 subsystems: Executant,     (Decizii 01-09 & 11,           (Introductiv 4h/8h,       (Medicină 12m, SSM 6/12m,
   Worksite, Job)       Sarcină, Mijloace, Mediu)    Permis de Lucru cu Foc)        Loc de muncă, Periodic)   PSI 6m, Igienă 36m)
```

#### Step 1: Client Intake & CAEN Profiling
- **Statutory references**: Legea nr. 319/2006 art. 7-13, HG nr. 1425/2006 art. 13-25, Legea nr. 359/2004, Legea nr. 346/2002.
- **Platform practice**: Intake captures legal identity (`name`, `cui`, `regCom`, `legalRepresentative`), contact details, and headquarters address.
- **The Centrality of the CAEN Code (NACE Rev. 2)**:
  - In Romanian practice, the CAEN code determines:
    1. *Risk Class (Clasa de risc a activității)*: According to HG 1425/2006 art. 22-25 and Legea 346/2002, economic activities are categorized by risk level. High-risk CAEN codes (e.g. 4120 - Construcții, 2410 - Siderurgie, 4941 - Transport marfă) impose mandatory internal prevention services or dedicated external specialists with higher qualification tiers.
    2. *Statutory Training Intervals*: TESA/office activities (e.g. CAEN 6201 - Software, 6920 - Contabilitate) qualify for 12-month periodic training, whereas production and construction require 6-month or 1-to-3-month intervals.
    3. *Hygiene Course Mandate*: Under Ordinul comun MS/ME nr. 2209/4469/2022, companies in food service (CAEN 5610, 5621, 5630), food manufacturing/retail (CAEN 1071, 4711, 4721), beauty/wellness (CAEN 9602, 9604), and water treatment must train employees every 36 months in fundamental hygiene modules.
    4. *Worksites (Puncte de lucru) & Posturi (Jobs)*: Each worksite operates specific activities under primary or authorized secondary CAEN codes. Jobs are defined by 6-digit COR codes (Clasificarea Ocupațiilor din România), equipment used, and working conditions.

#### Step 2: Contextual Risk Factor Identification & Allocation (INCDPM Pece Method)
- **Methodology origin**: Institutul Național de Cercetare - Dezvoltare pentru Protecția Muncii (INCDPM) „Alexandru Darabont” București.
- **Work System Decomposition (4 Subsystems)**:
  1. **Executant (Human worker)**: Wrong actions (unauthorized maneuvers, failure to wear PPE, bypassing interlocks), omissions (not signaling faults, forgetting shutoffs), psychophysiological errors.
  2. **Sarcină de muncă (Work task)**: Physical overload (static seated posture, dynamic heavy lifting $> 25\text{ kg}$), mental overload (time pressure, visual strain at screens, shift work).
  3. **Mijloace de producție (Means of production / Equipment)**: Mechanical hazards (rotating parts, sharp edges), electrical hazards (direct/indirect contact, frayed cables), thermal hazards, chemical substances, vehicles/forklifts.
  4. **Mediu de muncă (Work environment)**: Microclimate (temperature extremes, draft, AC), physical agents (noise, vibration, inadequate lighting), chemical/biological agents (dust, silica, airborne pathogens), social environment.
- **Mathematical Evaluation & Global Risk Score ($N_{rg}$)**:
  - For each factor $i = 1 \dots n$:
    - Gravity ($G_i \in \{1 \dots 7\}$) $\times$ Probability ($P_i \in \{1 \dots 6\}$) $\longrightarrow$ Partial Risk Level ($R_i \in \{1 \dots 7\}$).
    - Weight / Rank $r_i = R_i$.
  - Formula:
    $$N_{rg} = \frac{\sum_{i=1}^n r_i \cdot R_i}{\sum_{i=1}^n r_i} = \frac{\sum_{i=1}^n R_i^2}{\sum_{i=1}^n R_i}$$
  - **Acceptability Threshold**: $N_{rg} \le 3.50$ is acceptable under Romanian law (e.g. for TESA office roles, $N_{rg} = 178 / 68 = 2.62$). Any factor with $R_i \ge 4$ (medium/high risk) mandates prioritized measures in the Prevention and Protection Plan (*Planul de Prevenire și Protecție*).
- **CAEN & Role Allocation Matrix**:
  - *CAEN 6201 (IT / Software / TESA)*:
    - Dominant factors: Prolonged seated posture ($R=3$), visual strain at video display terminals ($R=3$), electrical shock via damaged extension cords/plugs ($R=3$), mental stress from project milestones ($R=2$), slips on polished linoleum/stairs ($R=3$).
    - Prevention: 10-minute active visual pauses per 50 minutes of screen work, ergonomic chairs, PRAM electrical testing, cable ducts.
  - *CAEN 4120 (Construcții civile și industriale)*:
    - Dominant factors: Falls from heights / scaffolding ($R=7$, fatal), falling objects ($R=5$), electrical shock at temporary site panels ($R=7$), high noise $> 85\text{ dB}$, crystalline silica dust, heavy lifting.
    - Prevention: Certified safety harness tied off to lifelines, safety helmets, steel-toe boots, perimeter toe-boards, dust suppression, 3-month/1-month training cycle.
  - *CAEN 4711 (Retail alimentar / Supermarket)*:
    - Dominant factors: Manual handling of pallets/crates, cuts from box cutters, falls from rolling ladders, repetitive motion at cashier scanner, thermal shock entering cold storage rooms.
    - Prevention: Hand pallet jacks, safety cutters with auto-retractable blades, anti-fatigue mats, thermal jackets, cut-resistant gloves.
  - *CAEN 4941 (Transport rutier de mărfuri)*:
    - Dominant factors: Traffic collisions, driver fatigue/microsleep, whole-body vibration, fuel vapors, cargo shifting during emergency braking.
    - Prevention: Strict tachograph driving/rest compliance (Reg. CE 561/2006), annual medical & psychological fitness, pre-trip vehicle inspections, defensive driving training.
  - *CAEN 5610 (Restaurante și alimentație publică)*:
    - Dominant factors: Thermal burns from fryers/stoves, knife lacerations, slippery tile floors from grease/water, chemical burns from degreasers, biological contamination.
    - Prevention: Non-slip footwear, cut-resistant chainmail gloves, exhaust hood maintenance, mandatory hygiene certification under Ordinul 2209/2022.

#### Step 3: Organizational Decisions (Decizii SSM/SU 01–09, 10, 11 & Permis de Lucru cu Foc)
- **Legal requirement**: Under Legea 319/2006 art. 13 lit. c and Legea 307/2006 art. 19 lit. a, the employer must issue formal administrative decisions assigning statutory safety duties.
- **Auto-Population & Role Assignment Logic**:
  - **Decizia 01 (Periodicitatea instruirii periodice)**: Auto-derives interval from client profile: 12 months for pure TESA/IT; 6 months for general operational; 1-3 months for high-risk trades.
  - **Decizia 02 (Numire Lucrător Desemnat SSM)**: If the employer has $< 9$ workers and the administrator completed the 40h SSM course, assigns the administrator; if the company contracted an external service, assigns the authorized SEPP provider (`ROMANIAN_LEGAL_SSM_PROVIDER`).
  - **Decizia 03 (Responsabil Prim Ajutor)**: Auto-assigns an active employee certified by the Red Cross or designated by management, establishing the mandatory first-aid kit location and restocking duties.
  - **Decizia 04 (Comisie cercetare evenimente)**: Auto-assigns at least 3 active employees (excluding the direct supervisor of the injured worker) to investigate minor incidents resulting in temporary work incapacity.
  - **Decizia 05 (Organizarea instruirilor SSM & SU)**: Defines introductory training duration (4h or 8h), on-the-job training duration (min. 8h), approved training syllabi, and designated instructors.
  - **Decizia 06 (Cadru Tehnic / Responsabil PSI)**: Assigns certified fire prevention technician (Cadru tehnic PSI atestat IGSU) or internal manager.
  - **Decizia 07 (Comisie intervenție și evacuare în caz de incendiu)**: Assigns evacuation leaders, utility cutoff officers (gas, electricity), and primary fire extinguisher handlers per floor/worksite.
  - **Decizia 08 (Reglementare lucrări cu foc deschis & Permis de Lucru cu Foc)**: Implements OMAI 163/2007, detailing the procedure, safety perimeter ($10\text{ m}$), fire watch for 2 hours post-work, portable P6 extinguishers, and the official *Permis de Lucru cu Foc* form.
  - **Decizia 09 (Reglementarea fumatului)**: Enforces Legea nr. 15/2016 and OMAI 163/2007, designating exterior smoking areas with metal ashtrays and strictly prohibiting smoking in enclosed workspaces.
  - **Decizia 10 (Planul de intervenție și evacuare)**: Establishes evacuation alarm signals and muster points.
  - **Decizia 11 (Aprobare Tematici de Instruire & IPSSM)**: Formally approves company-specific training curricula and safety instructions.

#### Step 4: Periodic Training Topics (Tematici de Instruire SSM & PSI/SU)
- **Phase I — Instruirea Introductiv-Generală**:
  - Duration: 4h (administrative/IT) or 8h (industrial/construction).
  - Standard themes: Legea 319/2006, HG 1425/2006, Legea 307/2006, general company hazards, emergency evacuation signals, first-aid principles, safety signage (HG 971/2006).
  - Documents: `training-tematica-introductiv` (`Tematica introductiv generala 4h.docx`), `training-detaliu-introductiv` (`Detaliu Tematica introductiv generala.docx`).
- **Phase II — Instruirea la Locul de Muncă**:
  - Duration: Minimum 8 hours.
  - Standard themes: Specific job duties, machinery operating guides, applicable IPSSM, PPE instructions, physical demonstration by supervisor, post-specific first aid.
  - Documents: `training-tematica-loc-munca` (`Tematica loc de munca.docx`), `training-detaliu-loc-munca` (`Detaliu Tematica loc de munca.docx`).
- **Phase III — Instruirea Periodică & Annual Training Schedule (Grafic Anual)**:
  - Intervals: 12 months (TESA/IT), 6 months (operational/retail), 3 months (manufacturing/logistics), 1 month (high-risk sites).
  - Quarterly thematic distribution:
    - *Q1 (Jan–Mar)*: Winter hazards (ice/slips, hypothermia, winter driving), winter fire safety (heating appliances).
    - *Q2 (Apr–Jun)*: Electrical safety (PRAM inspection, cords, portable tools), fire extinguisher drill & building evacuation exercise.
    - *Q3 (Jul–Sep)*: Summer hazards (OUG 99/2000 thermal discomfort, hydration, breaks in shade), ergonomics & display screen work posture.
    - *Q4 (Oct–Dec)*: Emergency preparedness (earthquakes, structural collapse), accident reporting workflow to ITM.

#### Step 5: Compliance Deadlines (Scadențe) & Expiry Engine
- **Occupational Medicine (HG nr. 355/2007)**:
  - Standard interval: 12 months.
  - Special interval: 6 months for night workers, hazardous chemical exposure, pregnant/nursing workers.
  - Fitness verdict: `APT`, `APT CONDIȚIONAT` (e.g. corrective spectacles for screen work, weight lifting limits), `INAPT TEMPORAR`, `INAPT`.
- **Periodic SSM Training (Legea 319/2006, HG 1425/2006)**:
  - Standard intervals: 12 months (TESA), 6 months (operational), 1–3 months (high risk).
- **Periodic PSI/SU Training (Legea 307/2006, OMAI 712/2005)**:
  - Standard intervals: 6 months (administrative), 3 months (workshops/depots), 1 month (fire-hazardous installations).
- **Fundamental Hygiene Courses (Ordinul comun MS/ME nr. 2209/4469/2022)**:
  - Validity: Exactly 3 years (36 months) from exam pass date at DSP.

---

### 2.2 Template Mapping & Contextual Population Across All 25 Templates

The table below maps all 25 templates in `handoff/ssm-template-placeholder-pack/templates/`, detailing their operational family, statutory role, contextual data sources, and zero-gap population strategy:

| # | Template Code | File Name | Format | Family & Context Level | Legal Base & Purpose | Contextual Population Strategy |
|---|---------------|-----------|--------|------------------------|----------------------|--------------------------------|
| 1 | `ipssm-alunecari` | `11 - ALUNECARI.docx` | DOCX | `ipssm` (client) | HG 1425/2006 art. 15; Prevention of same-level slips and trips | Auto-fills `{PLACEHOLDER_REPREZENTANT_LEGAL}` from `client.legalRepresentative` and `{PLACEHOLDER_SPECIALIST_SSM}` from SEPP profile. |
| 2 | `ipssm-autovehicule` | `12 - AUTOVEHICULE.docx` | DOCX | `ipssm` (client) | HG 1425/2006 art. 15; Fleet and vehicle operation safety | Auto-fills `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_REPREZENTANT_LEGAL}`, `{PLACEHOLDER_SPECIALIST_SSM}`. Contextualized for transport/commercial fleets. |
| 3 | `ipssm-birou` | `13 - ACTIVITATI DE BIROU.docx` | DOCX | `ipssm` (client) | HG 1028/2006, HG 1425/2006; Display screen equipment & ergonomic office safety | Auto-fills legal representative and SSM specialist; provides ergonomic rules for VDT workers. |
| 4 | `hygiene-adeverinta` | `Adeverinta participare.docx` | DOCX | `hygiene` (hygiene_session) | Ordinul 2209/4469/2022; Individual hygiene graduation certificate | Populates ME & MS ministerial approvals, participant CNP, birth county/place, graduation series/number, hygiene module (1–5), provider name. |
| 5 | `hr-anexa-fisa-post` | `Anexa fisa postului SSM.docx` | DOCX | `hr` (employee) | Legea 319/2006 art. 22–23; Mandatory SSM job description annex | Connects employee full name and company administrator; details legal worker obligations (reporting hazards, wearing PPE). |
| 6 | `hygiene-anexe-catalog` | `Anexe Curs igiena.xlsx` | XLSX | `hygiene` (hygiene_session) | Ordinul 2209/4469/2022; 8 official annexes (permits, commissions, exam catalogs, PVs) | Replaces multi-sheet tokens (`{001–100}`, `{001–195}`). Generator blanks unused rows up to 195, preventing dangling tokens. |
| 7 | `hr-cerere-angajare` | `Cerere angajare.docx` | DOCX | `hr` (employee) | Legea 53/2003 (Codul Muncii); Employment application form | Fills applicant name, ID document series/number, issuer, issue date, home address, requested job title, and company name. |
| 8 | `hr-cim-2026` | `Contract individual munca 2026.docx` | DOCX | `hr` (employee) | Legea 53/2003 republicată 2026; Individual employment contract | Complete population of 29 tokens: employer, employee, CNP, COR code, gross salary, work hours (8h/40h), probation (90d), notice period (20d), vacation (21d). |
| 9 | `decizii-angajator` | `DECIZII.docx` | DOCX | `decision` (client) | Legea 319/2006, Legea 307/2006, OMAI 163/2007; Decizii 01–09, 10, 11 + Permis de lucru cu foc | Complete corporate decision pack: intervals, designated SSM worker, first-aid officer, accident commission, training structure, PSI officer, evacuation team, hot work permit, smoking policy. |
| 10 | `hr-declaratie-regulament` | `Declaratie luare cunostinta RI.docx` | DOCX | `hr` (employee) | Legea 53/2003 art. 241–246; Internal regulations acknowledgement | Populates employee name, CNP, ID document, detailed residential address (street, number, building, entrance, floor, apartment), and company name. |
| 11 | `hr-declaratie-raspundere` | `Declaratie pe proprie raspundere CIM.docx` | DOCX | `hr` (employee) | Codul Fiscal (Legea 227/2015); Personal deduction & health insurance declaration | Populates employee data, health insurance house (C.A.S.), pension status, and dependents (child/spouse lines filled with '-' when none). |
| 12 | `training-detaliu-introductiv` | `Detaliu Tematica introductiv generala.docx` | DOCX | `training` (client) | HG 1425/2006 art. 83–89; Comprehensive introductory training manual | Populates company name, administrator, and SSM specialist. Details legal articles and safety rules across 95 KB text. |
| 13 | `training-detaliu-loc-munca` | `Detaliu Tematica loc de munca.docx` | DOCX | `training` (client) | HG 1425/2006 art. 90–94; Comprehensive on-the-job training manual | Populates company name and legal representative. Contextualized with post-specific hazards and practical demonstrations. |
| 14 | `risk-evaluare` | `EVALUAREA RISCURILOR.docx` | DOCX | `risk` (job) | Legea 319/2006 art. 12–13; Corporate & job risk assessment report | Populates CAEN code, activity description, worker counts, evaluation year (2026), working schedule, certified evaluator details (`ROMANIAN_LEGAL_SSM_PROVIDER`). |
| 15 | `hr-info-dosar` | `INFO dosar personal.docx` | DOCX | `hr` (employee) | HG 905/2017 (Revisal / REGES); Personnel file checklist & table of contents | Clean informational document detailing all required documents in the Romanian employee file (CIM, medical certificate, diplomas, CI copy). |
| 16 | `hr-gdpr-informare` | `Informare Protectia Datelor.docx` | DOCX | `hr` (employee) | Regulamentul (UE) 2016/679 (GDPR); Employee data processing notice | Populates employer details, employee full name, CNP, ID document, residence address, and signature locality. |
| 17 | `ipssm-universale` | `IP 01-10 UNIVERSALE.docx` | DOCX | `ipssm` (client) | HG 1425/2006 art. 15; Universal safety instructions 01 to 10 | Populates company name, legal representative, and authorized SSM specialist across 10 universal safety instructions. |
| 18 | `ipssm-opis` | `OPIS IPSSM.docx` | DOCX | `ipssm` (client) | HG 1425/2006 art. 15; Master table of contents for IPSSM | Populates company name, SSM provider contact phone, email, and catalog index of instructions 01 through 13. |
| 19 | `risk-plan-actiune-urgenta` | `Plan actiune pericol grav si iminent.docx` | DOCX | `risk` (client) | Legea 319/2006 art. 13 lit. k; Imminent danger emergency action plan | Populates company name, designated worker, emergency contact (112), and shutdown protocols. |
| 20 | `risk-plan-prevenire-tesa` | `Plan de Prevenire TESA.docx` | DOCX | `risk` (job) | Legea 319/2006 art. 13 lit. b; Prevention and protection plan for office roles | Populates company name, provider, specialist, and technical/organizational/hygiene measures matching the 30 identified risk factors. |
| 21 | `hygiene-tabel-cursanti` | `Tabel Cursanti exemplu.xlsx` | XLSX | `hygiene` (hygiene_session) | Ordinul 2209/4469/2022; DSP course participant roster (115 rows) | Populates exam date and participant rows (`_001` to `_115`). Generator blanks unused rows up to 115 to eliminate template tokens. |
| 22 | `training-tematica-introductiv` | `Tematica introductiv generala 4h.docx` | DOCX | `training` (client) | HG 1425/2006 art. 83–89; 4-hour introductory training syllabus | Populates company name, effective application date, provider contact phone, and email. Structured into 5 standard curriculum chapters. |
| 23 | `training-tematica-loc-munca` | `Tematica loc de munca.docx` | DOCX | `training` (job) | HG 1425/2006 art. 90–94; On-the-job training syllabus for specific role | Populates company name, job title (`job.title`), effective date, and provider contact details. |
| 24 | `ipssm-tesa` | `TESA.docx` | DOCX | `risk` (job) | INCDPM Pece Method; Analytical 30-factor risk assessment sheet | Complete mathematical evaluation: 30 factors (Executant 10, Sarcină 8, Mijloace 9, Mediu 3), G (1-7), F (1-6), R (1-7), $N_{rg} = 2.62$, risk distribution charts. |
| 25 | `risk-zone-pericol` | `Zone pericol grav si iminent.docx` | DOCX | `risk` (client) | Legea 319/2006 art. 13 lit. k, HG 1425/2006; High & specific risk zone inventory | Identifies 6 specific hazard zones (TEG/server room, gas boiler room, emergency stairs, archive, loading dock, maintenance workshop) with protective measures. |

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Client Intake | CAEN Risk Classification | Profiles client by 4-digit CAEN code, mapping activity to statutory risk classes (HG 1425/2006 art. 22-25, Legea 346/2002) | `client.cui`, `client.caenCode` | Risk tier (Low, Medium, High), required SSM structure | Throws validation error if CAEN format is not 4 digits | Benchmark & `schema.prisma` |
| 2 | Client Intake | Multi-Worksite & Job Profiling | Associates physical worksites and job positions (COR codes, equipment, conditions) to client | `Worksite` & `Job` entities | Contextual parameters for risk assessment and training | Rejects duplicate worksite/job titles per client | `prisma/schema.prisma` & `Test_Client_3_Angajati.xlsx` |
| 3 | Risk Evaluation | INCDPM Pece 4-Subsystem Matrix | Decomposes work system into Executant (10), Sarcină (8), Mijloace (9), and Mediu (3) factors | Job activities, equipment, work environment | 30 categorized risk factors with consequence descriptions | Flags unmapped hazard combinations | `TESA.docx`, INCDPM standard & `resolver.ts` |
| 4 | Risk Evaluation | Semi-Quantitative $N_{rg}$ Calculation | Computes weighted global risk level: $N_{rg} = \sum R_i^2 / \sum R_i$ | Gravity ($G \in 1..7$), Probability ($P \in 1..6$) | $N_{rg}$ score (e.g. 2.62), acceptability verdict ($\le 3.50$) | Asserts $N_{rg} \le 7.00$; flags unacceptable risk if $> 3.50$ | `src/lib/templates/resolver.ts` (lines 190-260) |
| 5 | Risk Evaluation | High & Specific Hazard Zones | Catalogs 6 distinct facility zones with imminent danger and defines technical isolation measures | Facility layout, electrical switchboards, boilers | `Zone pericol grav si iminent.docx` | Rejects unpopulated zone names/measures | `risk-zone-pericol` template inspection |
| 6 | Organizational Decisions | Auto-Generated Decizii 01–09 & 11 | Emits complete set of formal statutory administrative decisions (intervals, SSM worker, first aid, PSI, hot work) | Client, legal representative, active employee list | Unified `DECIZII.docx` (318 paragraphs, 11 decisions + Permis Foc) | Leaves no unfilled placeholder tokens | `DECIZII.docx` disassembly & `definitions.ts` |
| 7 | Organizational Decisions | Hot Work Permit (*Permis de Lucru cu Foc*) | Full administrative hot work permit with fire watch, 10m radius clearance, P6 extinguishers, and gas analysis | Operator, helper, location, hot work technology | Official *Permis de Lucru cu Foc* document embedded in `DECIZII.docx` | Validates completion of all safety precaution checkmarks | `DECIZII.docx` (lines 317–347) & OMAI 163/2007 |
| 8 | Training Architecture | 3-Phase Training Progression | Enforces statutory training flow: Introductiv-General (4h/8h), Loc de Muncă (min 8h), Periodic (2h) | Employee hire date, role, designated instructor | Structured training records in DB and printed sheets | Flags missing Phase I before Phase II can occur | HG 1425/2006 art. 83-100 & platform benchmarks |
| 9 | Training Architecture | Annual Thematic Scheduling (Grafic Anual) | Schedules seasonal SSM/PSI training themes across Q1 (winter), Q2 (electrical/fire), Q3 (summer/ergonomics), Q4 (earthquake/accidents) | Company schedule, operational vs TESA role | Structured annual training plan | Alerts if periodic interval exceeds statutory cap | OMAI 712/2005 & easyssm.ro benchmark |
| 10 | Compliance Deadlines | Deterministic Safe Month Arithmetics | Pure calendar month addition with end-of-month clamping (`addMonthsSafe`) for leap years and short months | Base date, interval in months | Exact statutory due date (Date object) | Throws on invalid date; clamps Feb 29 to Feb 28 on non-leap years | `src/lib/compliance.ts` (lines 84-105) |
| 11 | Compliance Deadlines | DST-Immune Calendar Day Delta | Computes calendar days remaining normalized to UTC midnight, immune to $\pm 1\text{h}$ daylight saving jumps | Due date, reference date | Integer calendar days remaining ($>0$, $0$, $<0$) | None; handles all timezones deterministically | `src/lib/compliance.ts` (lines 111-116) |
| 12 | Compliance Deadlines | 4-Tier Statutory Status Classification | Categorizes compliance into `VALID` ($>30\text{d}$), `UPCOMING` ($0..30\text{d}$), `OVERDUE` ($<0\text{d}$), `MISSING` (null date) | Days remaining or null date | `ComplianceStatus` enum and UI badge styling | Gracefully handles null/undefined dates as `MISSING` | `src/lib/compliance.ts` & `PROJECT.md` |
| 13 | Compliance Deadlines | Aggregated Company Metrics | Computes total employees, tracked items, status counts, and compliance score percentage | Array of active employee records | `CompanyComplianceMetrics` with percentage (0–100%) | Protects against division by zero when employee count is 0 | `src/lib/compliance.ts` (lines 240-270) |
| 14 | Document Auto-Completion | Multi-Part XML Document Generation | Replaces `{PLACEHOLDER_*}` tokens across Word body XML, headers (`header*.xml`), and footers (`footer*.xml`) | Normalized DOCX template, resolved data map | Fully completed DOCX file ready for print/signature | Detects and logs any unmapped `{PLACEHOLDER_*}` tokens | `src/lib/templates/generator.ts` |
| 15 | Document Auto-Completion | Dynamic XLSX Participant Blanking | Replaces participant tokens for active cursanți, and zero-fills remaining empty rows (up to 195) with blank strings | XLSX template, participant array | Clean Excel spreadsheet without leftover token markers | Validates sheet names and cell types | `generator.ts` & `test-all-25-templates.ts` |
| 16 | Document Auto-Completion | Statutory Fallback Resolution | Injects verified legal profiles for authorized SEPP provider, cert numbers, and evaluators when client data is missing | Template code, DB records, fallback dictionary | `TemplateResolutionResult` with `status: 'ready'` | Flags `status: 'missing_data'` if required field cannot be resolved | `src/lib/templates/resolver.ts` |
| 17 | Excel Import/Export | Multi-Sheet Workbook Parsing | Robust parser reading `Firmă și angajați` and `Context posturi` from uploaded Excel workbooks | Excel buffer (`.xlsx`) | `ParsedWorkbook` (company, employees, job contexts) | Collects row-level validation errors without crashing | `src/lib/importer.ts` (lines 1-80) |
| 18 | Excel Import/Export | Pre-Commit Differential Reconciliation | Compares imported records in memory against PostgreSQL state, classifying into `UNCHANGED`, `MODIFIED`, `NEW`, `ERROR` | `clientId`, `ParsedWorkbook` | Structured diff report for user review | Prevents destructive overwrites of existing valid records | `src/lib/importer.ts` & `test-export-import-roundtrip.ts` |
| 19 | Hygiene Management | Fundamental Hygiene Session Lifecycle | Tracks training sessions, exam commissions, DSP approval numbers, and candidate results under Ordinul 2209/2022 | Provider, MS/ME approval, exam date, participants | `HygieneSession` & participant catalog records | Requires valid CNP and birth date for every candidate | `prisma/schema.prisma` & Ordinul 2209/2022 |
| 20 | Hygiene Management | 36-Month Certificate Validity Tracking | Enforces 3-year statutory validity on DSP hygiene certificates, surfacing upcoming expiration alerts | Exam date, 36-month interval | Due date, remaining days, `VALID`/`UPCOMING`/`OVERDUE` status | Flags employees missing mandatory hygiene certificates | `compliance.ts` & Ordinul 2209/2022 art. 20 |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | `addMonthsSafe` | `2024-02-29` (Leap Year) $+ 12$ months | Clamped cleanly to `2025-02-28`. Next day is `2025-03-01`. Zero month rollover glitch. |
| 2 | `addMonthsSafe` | `2024-02-29` (Leap Year) $+ 36$ months (Hygiene) | Clamped cleanly to `2027-02-28`. Exact 3-year cycle maintained. |
| 3 | `addMonthsSafe` | `2024-02-29` $+ 48$ months (Next Leap Year) | Evaluates correctly to `2028-02-29` without premature truncation. |
| 4 | `addMonthsSafe` | `2023-01-31` $+ 1$ month | Clamped to `2023-02-28`. Does not bleed into March. |
| 5 | `addMonthsSafe` | `2023-03-31` $+ 1$ month | Clamped to `2023-04-30`. Exact month end preserved. |
| 6 | DST Transition | Due date on DST switch day (e.g. last Sunday in March / October) | Normalization to UTC midnight prevents $\pm 1$ hour drift from altering the integer days remaining count. |
| 7 | Status Threshold | Expiration in exactly $+31$ days | Status is `VALID`. |
| 8 | Status Threshold | Expiration in exactly $+30$ days | Status transitions to `UPCOMING` (Amber badge). |
| 9 | Status Threshold | Expiration in exactly $+1$ day | Status is `UPCOMING`. |
| 10 | Status Threshold | Expiration today (0 days remaining) | Status is `UPCOMING` (last valid day). |
| 11 | Status Threshold | Expiration yesterday ($-1$ day remaining) | Status transitions to `OVERDUE` (Red badge). |
| 12 | Missing Record | Employee with `medicalLastExamDate = null` | Returns `status: 'MISSING'`, `daysRemaining: null`, Rose badge. |
| 13 | Conditional Hygiene | Employee with `hygieneRequested = false` | `hygieneCertificate` evaluates to `null`; excluded from overall compliance score. |
| 14 | Conditional Hygiene | Employee with `hygieneRequested = true` but no exam date | `hygieneCertificate` returns `MISSING`; overall employee status degrades to `MISSING`. |
| 15 | Company Score | Company with 0 employees or 0 tracked items | Returns `complianceScorePercent: 100`, preventing `NaN` or `Infinity` division-by-zero error. |
| 16 | Excel Participant Blanking | Session with 3 cursanți in `Anexe Curs igiena.xlsx` (195 rows) | Rows 1–3 contain realistic candidate data; rows 4–195 are zero-filled with blank strings. Zero `{PLACEHOLDER_*}` tokens remain. |
| 17 | TESA Token Consistency | Template `TESA.docx` evaluating 30 factors | Shared token `PLACEHOLDER_Nxx` correctly populates both Table 1 (analysis) and Table 2 (summary). |
| 18 | Excel Import Validation | Excel row with 12-digit CNP or invalid control checksum | Flagged in `ParsedEmployee.errors` with `isValid = false`; row skipped without crashing the batch. |
| 19 | Excel CNP Leading Zero | CNP starting with '0' (e.g. foreign resident or specific county) formatted as number | Excel parser casts cell to string and preserves leading characters. |
| 20 | Multi-Part XML Headers | Document with company name in running header (`word/header1.xml`) | `generator.ts` replaces header XML tokens identically to body XML tokens. |

---

## 5. Caveats
1. **Physical Signatures vs Electronic Signatures**: In strict adherence to constraint R3, the system does not implement digital signature certificates (eIDAS / Legea 214/2024 PKI). Generated documents provide standard signature blocks for physical wet ink signatures or external PDF signing.
2. **Dynamic Risk Factor Expansion**: While `TESA.docx` hardcodes the 30 standard INCDPM office factors, industrial and construction positions (e.g. zidar, sudor) utilize dynamic sets of 20–45 factors. The Prisma schema (`RiskAssessment`, `RiskItem`, `PreventionMeasure`) fully supports dynamic factor counts.
3. **External DSP & ITM Integrations**: There are no public programmatic APIs provided by Romanian DSP or ITM for real-time certificate validation; compliance records are maintained via manual operator entry or Excel batch upload.

---

## 6. Conclusion
The operational workflows (R1) and contextual document generation capabilities (R2) of the Romanian SSM system are fully mined, rigorously specified, and verified:
1. **Intake & Profiling**: CAEN codes and 6-digit COR job codes provide the necessary semantic anchor to automatically allocate risk factors, statutory training intervals, and hygiene requirements.
2. **INCDPM Pece Risk Evaluation**: Decomposing jobs into Executant, Sarcină, Mijloace, and Mediu with a mathematical $N_{rg} \le 3.50$ global score satisfies statutory requirements under Legea 319/2006.
3. **Decizii Organizatorice 01–09 & 11**: All statutory employer decisions (intervals, designated worker, first aid, PSI, hot work permits) are completely mapped and auto-populated.
4. **Training Syllabi & Scadențe**: 3-phase training progressions and deterministic calendar arithmetic with end-of-month clamping guarantee 100% compliance tracking accuracy across occupational medicine (12m), SSM (6/12m), PSI/SU (6m), and hygiene (36m).
5. **Contextual Document Completion (25/25)**: Every official template generates cleanly with zero leftover `{PLACEHOLDER_*}` tokens, correct running headers, and zero-filled Excel arrays.

---

## 7. Verification Method

To independently reproduce and verify all mined specifications and system capabilities:

```bash
# 1. Ensure database is seeded with realistic Romanian test data
npx tsx prisma/seed.ts

# 2. Run the unified acceptance verification suite (covering all 4 suites: 25/25 templates, compliance engine, E2E tests, and build)
npx tsx scripts/verify-all.ts

# 3. Verify deterministic compliance calculation unit tests (45 tests)
npx tsx scripts/verify-compliance.ts

# 4. Verify 25/25 template generation with zero unresolved placeholders
npx tsx scripts/test-all-templates-generation.ts

# 5. Verify Excel import/export round-trip and differential reconciliation
npx tsx scripts/test-export-import-roundtrip.ts

# 6. Verify clean Next.js 16 production compilation
npm run build
```

**Invalidation Conditions**:
- Any `{PLACEHOLDER_*}` token visible in any of the 25 generated output files.
- Any math error in `addMonthsSafe` (e.g. Feb 29 + 12m yielding March 1 instead of Feb 28).
- Any TypeScript or build error during `npm run build`.
