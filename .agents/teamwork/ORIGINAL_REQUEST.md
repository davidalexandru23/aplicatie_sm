# Original User Request

## Parameters
[skip-interview]
How this run was launched; not part of the task.

## Initial Request — 2026-11-04T20:44:28Z
Începeți execuția imediat. Toate detaliile tehnice, cele 5 componente (Pilonii 1-5), cerințele pentru fiecare șablon și funcție sunt deja stabilite și aprobate în planul strategic. Continuați direct cu implementarea secvențială, rularea testelor și verificarea build-ului.

Context relevant din conversația anterioară (Planul Strategic și Raportul de Audit):
---
Planul strategic din artefactul `/Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md` structurat pe cei 5 piloni:

### Pilonul 1: Rectificarea Textuală a Șabloanelor Existente (Prioritate Maximă)
1. `EVALUAREA RISCURILOR.docx`: Înlocuirea `{PLACEHOLDER_ADRESA_FIRMA}` din antet cu `{PLACEHOLDER_NR_REG_COM}`; eliminarea localității statice „București”; reintegrarea tabelului factorilor de risc (Cap. 6 și 7).
2. `13 - ACTIVITATI DE BIROU.docx`: Înlocuirea sintagmei „agenților de pază” cu „personalului de birou”; adăugarea `{PLACEHOLDER_FIRMA}` în antet.
3. `11 - ALUNECARI.docx`: Adăugarea `{PLACEHOLDER_FIRMA}` în antet.
4. `Detaliu Tematica loc de munca.docx`: Ștergerea imaginii externe TinyPic cu reclama comercială din subsol; adăugarea `{PLACEHOLDER_FUNCTIE}`.
5. `DECIZII.docx`: Introducerea tokenului `{PLACEHOLDER_NUMAR_DECIZIE_10}` și a tokenurilor de apelativ `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` și `{PLACEHOLDER_APELATIV_PSI}` (`Dl.` / `Dna.` dinamic după sex/prenume).
6. `Anexa fisa postului SSM.docx`: Adăugarea `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_COD_COR}` și număr CIM.
7. `Informare Protectia Datelor.docx`: Trecerea la Art. 6(1)(b)/(c) GDPR; eliminarea punctelor de suspensie reziduale.
8. `Tabel Cursanti exemplu.xlsx`: Eliminarea foii de calcul contabile reziduale `Sheet1` (Registru de Casă).
9. `Adeverinta participare.docx`: Corectarea stutter-ului `Nr. Aviz MS nr.` și adaptarea nivelului în funcție de funcție (Nivelul 1 pentru execuție, Nivelul 2 pentru conducere).

### Pilonul 2: Adăugarea a 6 Șabloane Noi Esențiale în Catalog (Extindere de la 25 la 31)
1. `ssm-fisa-instruire-individuala` (Fișa Individuală de Instruire SSM - Anexa 11 HG 1425/2006).
2. `psi-fisa-instructaj-individuala` (Fișa Individuală de Instructaj în Domeniul Situațiilor de Urgență - Anexa OMAI 712/2005).
3. `med-fisa-solicitare-examen` (Fișa de Solicitare a Examenului Medical - Anexa 2 HG 355/2007).
4. `med-fisa-identificare-riscuri` (Fișa de Identificare a Factorilor de Risc Profesional - Anexa 3 HG 355/2007).
5. `eip-fisa-acordare-individuala` (Fișa Individuală de Dotare și Acordare EIP - HG 1048/2006).
6. `hr-cim-model-cadru-2022` (Contract Individual de Muncă Model-Cadru conform Ordinului MMSS 2171/2022).

### Pilonul 3: Reconfigurarea Resolverului & Conectarea Datelor Reale
1. Oprirea generării cu date fictive (salariu fictiv 6500 lei etc.).
2. Prioritizarea specialistului implicit (`isDefault: true`) din baza de date (`SsmProvider` și `SsmSpecialist`) dacă clientul nu are alocat explicit unul.
3. Conectarea contextului din post (`Job`): `mainActivities`, `equipmentUsed`, `workConditions`, `corCode` injectate în tematici și fișa postului.
4. Corelarea dinamică a măsurilor din Planul de Prevenire cu profilul de risc CAEN al postului.

### Pilonul 4: Generare în Lot pe Fluxuri Operaționale (Bulk Workflows)
- Pachet Onboarding Salariat (1-Click ZIP)
- Pachet Înființare Dosar SSM Client (Start-up Dossier)
- Export Arhivă Control ITM / ISU (ZIP)

### Pilonul 5: Rafinarea Interfeței (UI/UX) și Serviciul de Alerte
- Selector de Funcție / Post (`jobId`) în `/documents/generate`
- Configurator vizual de evaluare a riscurilor în `/risk-assessments`
- Sincronizare seed și verificare automată a suitei de teste (`npm run build`, `npm test`).
