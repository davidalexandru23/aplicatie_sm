Build a production-grade SSM, DSP, and DSVSA compliance and document generation system in the Next.js/Prisma application for real-world Romanian occupational safety and hygiene consulting.

Working directory: /Users/davidalexandru/Documents/Proiect_SSM
Integrity mode: development

## Requirements

### R1. Hygiene Training Document Generation Flow (DSP / DSVSA)
In the document generation interface (`/documents/generate`), hygiene compliance documents must be directly selectable and configurable for client companies. Generating the hygiene training record ("Tabel evidenta cursanti igiena", "Anexe Curs igiena", and "Adeverinta participare") must dynamically produce an accurate roster of employees with their assigned hygiene training module (Module 1 Food, Module 2 Cleaning/Healthcare, Module 3 Body Care, etc., under Order 1225/5031/2003 as updated by MS and ANSVSA/DSVSA), date of graduation, 3-year expiration date, certificate series/number, and evaluation outcome.

### R2. SSM External Service Provider Profile (Provider Settings)
Implement a dedicated settings section for the external SSM consulting provider (e.g., Settings / SSM Provider Profile) capturing corporate and accreditation data: provider company name, CUI, Trade Registry number, official address, Labour Ministry/ITM authorization certificate number and issue date, and designated SSM specialists with contact information. In client company creation and editing forms, allow assigning the provider and selecting a designated specialist from a dropdown.

### R3. Comprehensive Template and Business Logic Review
Conduct an extensive review of all 25 DOCX and XLSX templates in `handoff/ssm-template-placeholder-pack/templates` and the generation pipelines, ensuring all template placeholders, data bindings, and generated outputs strictly reflect Romanian legal and operational realities (ITM, DSP, and DSVSA/ANSVSA norms), with the external provider profile and assigned specialists properly integrated across relevant documents.

### R4. Automated Verification Suite and Test Seed Data
Provide an automated test suite, seed data, and verification scripts that validate database schema migrations, provider profile CRUD and assignment, hygiene module roster generation, and template rendering without errors.

## Acceptance Criteria

### Hygiene Generation & Compliance
- [ ] Hygiene documents ("Tabel evidenta cursanti igiena", "Adeverinta participare", "Anexe Curs igiena") are directly selectable and configurable in `/documents/generate`.
- [ ] Generated hygiene rosters properly include employee names, assigned hygiene modules (Modules 1–3+ per Order 1225/5031/2003), completion dates, 3-year expiration dates, certificate series/numbers, and evaluation results.
- [ ] Output files (DOCX/XLSX) open without corruption or unreplaced placeholder tokens.

### Provider Profile & Client Assignment
- [ ] A dedicated UI in Settings allows managing provider company information (name, CUI, Reg. Com., address, ITM authorization) and multiple designated specialists.
- [ ] Client company forms (creation and editing) persist the assigned provider and selected designated specialist.
- [ ] Provider details and designated specialist information populate accurately into generated documents referencing external service provider data.

### Template & Catalog Review
- [ ] All 25 templates in the catalog are reviewed and verified to have valid placeholder mappings and consistent business logic.
- [ ] Document generation handles missing optional employee or company fields gracefully without throwing unhandled exceptions.

### Automated Verification
- [ ] Automated tests and verification scripts execute and pass, verifying database migrations, provider profile operations, and hygiene document generation with realistic test seed data.
