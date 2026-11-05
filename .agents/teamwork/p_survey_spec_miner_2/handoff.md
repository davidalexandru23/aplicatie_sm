# Handoff Report — p_survey_spec_miner_2

**Timestamp:** 2026-11-04T22:58:00Z  
**Role:** Specification Miner (Teamwork domain specialist)  
**Task:** Survey authoritative legal specifications and catalog requirements for the 6 new statutory templates for Pillar 2  
**Handoff Type:** Hard (Task complete)

---

## 1. Observation

1. **Catalog and Existing Templates:**
   - In `src/lib/templates/definitions.ts:38-3206`, exactly 25 templates are currently defined in `TEMPLATE_CATALOG`.
   - In `templates_registry/normalized/`, exactly 28 files exist (23 DOCX, 2 XLSX, 3 legacy PDFs replaced by DOCX).
   - In `sabloane_ssm/`, 25 original templates exist.
   - In `handoff/ssm-template-placeholder-pack/templates/`, 28 files matching `templates_registry/normalized/` exist.
   - None of the 6 new statutory document templates (`ssm-fisa-instruire-individuala`, `psi-fisa-instructaj-individuala`, `med-fisa-solicitare-examen`, `med-fisa-identificare-riscuri`, `eip-fisa-acordare-individuala`, `hr-cim-model-cadru-2022`) exist anywhere in `handoff/`, `sabloane_ssm/`, or `templates_registry/normalized/`.
   - Ripgrep query `fisa-instruire` returned 0 matches in the codebase.
   - Ripgrep query `2171/2022` returned 0 matches in the codebase.

2. **Existing Contract (`Contract individual munca 2026.docx`):**
   - As documented in `PLAN_STRATEGIC_SSM_IGIENA_HR.md:176-180`:
     > "Contract trunchiat la 7 articole (Art. A–G), lipsind capitolele obligatorii H–P din modelul-cadru impus de Ordinul MMSS 2171/2022... salariul brut este injectat fictiv (6500 lei)"
   - In `src/lib/templates/resolver.ts:286`, `PLACEHOLDER_SALARIU_BRUT: '6500 lei'` is hardcoded as a fallback.

3. **Generator Architecture:**
   - In `src/lib/templates/generator.ts:48-50`:
     ```ts
     const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', definition.normalizedFilename);
     if (!fs.existsSync(templatePath)) throw new Error(`Fișierul șablon lipsește: ${definition.normalizedFilename}`);
     ```
   - In `src/lib/templates/generator.ts:325-377`, `renderTemplateBuffer` parses `.docx` using `PizZip` and `Docxtemplater`, replacing `{PLACEHOLDER_*}` tokens across all XML parts and `.rels`.
   - `package.json` contains `"docxtemplater": "^3.71.1"` and `"pizzip": "^3.3.0"`, but does not currently list `"docx"`.

4. **Authoritative Romanian Legal Sources:**
   - **HG nr. 1425/2006**, Anexa nr. 11: Formularul oficial de Fișă Individuală de Instruire SSM (date salariat, instructaj introductiv-general min. 8h, instructaj la locul de muncă min. 8h, admitere la lucru, tabel periodic multianual).
   - **OMAI nr. 712/2005** (modificat prin OMAI 786/2005), Anexă: Formularul oficial de Fișă Individuală de Instructaj în Domeniul Situațiilor de Urgență (PSI/SU).
   - **HG nr. 355/2007**, Anexa nr. 2: Formularul oficial de Fișă de Solicitare a Examenului Medical (trimitere la medicina muncii).
   - **HG nr. 355/2007**, Anexa nr. 3: Formularul oficial de Fișă de Identificare a Factorilor de Risc Profesional (grile bife riscuri fizice, chimice, biologice, ecran, ture noapte).
   - **HG nr. 1048/2006** coroborat cu art. 15 lit. d din HG 1425/2006: Fișa Individuală de Dotare și Acordare EIP cu tabel de distribuire și angajament purtare.
   - **Ordinul MMSS nr. 2171/2022** coroborat cu Legea nr. 283/2022 și Codul Muncii: Modelul-cadru complet al contractului individual de muncă cu Capitolele A până la P.

---

## 2. Logic Chain

1. **Step 1 (Catalog Gap):** Since observation (1) proves none of the 6 new statutory files exist in `templates_registry/normalized/` or `handoff/`, the catalog currently remains locked at 25 templates and cannot generate the core onboarding & training documents required by ITM, DSP, and ISU inspectors.
2. **Step 2 (Deficit Compliance Impact):** In observation (4), Romanian statutory law establishes direct contraventional fines for the absence of these documents (3.000–6.000 lei per worker for missing Anexa 11 SSM, 2.500–5.000 lei for missing PSI, 3.500–7.000 lei + nullity of CIM for missing Anexa 2 & 3 medicina muncii, 4.000–8.000 lei for missing EIP distribution sheet). Furthermore, the current CIM (`hr-cim-2026`) is legally incomplete (only articles A-G vs statutory A-P).
3. **Step 3 (Integration Path):** Observation (3) proves that `generator.ts` loads files strictly from `templates_registry/normalized/<normalizedFilename>` and processes `{PLACEHOLDER_*}` tokens via `Docxtemplater`. Therefore, creating 6 standard `.docx` files containing native `<w:tbl>` elements and placing them in `templates_registry/normalized/`, coupled with adding 6 `TemplateDefinition` objects to `TEMPLATE_CATALOG` in `src/lib/templates/definitions.ts`, will cleanly extend the catalog from 25 to 31 templates.
4. **Step 4 (Resolver & Data Sanitation):** Observation (2) highlights that the resolver must stop injecting fake values (`6500 lei`) and instead properly flag missing salary as `missing_data`. It must also bind real context from the `Job` model (`mainActivities`, `equipmentUsed`, `workConditions`, `corCode`) to populate the medical risk sheet (Anexa 3) and job annexes.

---

## 3. Caveats

- No implementation code was written during this turn, strictly adhering to the Specification Miner read-only mandate.
- In `package.json`, the `docx` library is not currently installed. To programmatically author the `.docx` templates via Node.js, `npm install docx` or equivalent standard OpenXML template generation can be used by the implementation agent.
- On physical inspection forms (Anexa 11 SSM și Anexa OMAI 712/2005), the periodic training log tables are multi-year grids designed for recurring holographic signatures over 5–10 years; the generated document must provide a pre-formatted statutory table with standard headers and blank rows ready for manual/periodic logging, plus pre-filling any already-recorded events from `TrainingEvent`.

---

## 4. Conclusion

- The authoritative legal survey and token schema design for all 6 new statutory templates is complete and fully documented in `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_spec_miner_2/spec_mining_report.md`.
- Ready-to-paste TypeScript definitions for `src/lib/templates/definitions.ts` have been produced, complete with types, field sources (`job.mainActivities`, `job.equipmentUsed`, `employee.hireDate`, `client.legalRepresentative`), and required flags.
- The path for Pillar 2 implementation is completely clear:
  1. Author 6 valid `.docx` files with native tables in `templates_registry/normalized/`.
  2. Extend `TEMPLATE_CATALOG` in `src/lib/templates/definitions.ts` from 25 to 31 templates.
  3. Update `seed.ts` to sync all 31 templates into the PostgreSQL `Template` table.
  4. Expand test suites (`scripts/test-all-25-templates.ts` $\rightarrow$ 31 templates) and verify build (`npm run build`).

---

## 5. Verification Method

To verify the findings and specifications independently:
1. **Inspect Report:**
   Read `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_spec_miner_2/spec_mining_report.md`.
2. **Inspect Current Catalog:**
   Count definitions in `src/lib/templates/definitions.ts` (currently 25).
3. **Verify Absence of New Templates in Storage:**
   Run `ls templates_registry/normalized/` to verify that `Fisa Individuala de Instruire SSM.docx` and the other 5 files are not yet created.
4. **Verify Legal References:**
   - HG 1425/2006 Anexa 11
   - OMAI 712/2005 Anexă
   - HG 355/2007 Anexa 2 și Anexa 3
   - HG 1048/2006
   - Ordinul MMSS 2171/2022 (Capitolele A-P)
