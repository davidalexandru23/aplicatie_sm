# Raport de Analiză Tehnică: Remediere UI Glitch Selector Funcție / Post de Lucru

**Autor:** Explorer Agent (`teamwork_explorer_m1_2`)  
**Data:** 5 Noiembrie 2026  
**Fișier investigat:** `src/app/documents/generate/page.tsx` & `src/lib/templates/definitions.ts`  
**Milestone:** Milestone 1 (Quick Fixes Imediate)

---

## 1. Rezumat Executiv

În interfața de generare a documentelor (`/documents/generate`), la selectarea șabloanelor de igienă (ex. `Tabel evidență cursanți igienă` / `hygiene-tabel-cursanti`) sau a documentelor generale de firmă (ex. `Pachet Decizii Interne SSM` / `decizii-angajator`), utilizatorul observă un dropdown neașteptat: **„Funcție / Post de Lucru”**, având deja preselectat primul post din baza de date a firmei (ex. „Bucătar”).

Această anomalie perturbă grav experiența de utilizare (UX) și contaminează cererile API (`/api/templates/[code]/fields` și `/api/documents/generate`) cu un parametru `jobId` complet irelevant pentru cursurile colective de igienă sau deciziile interne ale angajatorului.

---

## 2. Cauzele Rădăcină (Root Cause Analysis)

Investigația amănunțită a codului din `src/app/documents/generate/page.tsx` a relevat o combinație de **4 factori concurenți**:

### 2.1. Condiția de randare JSX inversată / prea permisivă (Linia 470)
În `src/app/documents/generate/page.tsx:470`:
```tsx
{/* Job / Funcție Selector (DOAR pentru documente de nivel companie/evaluare riscuri unde nu este implicat un angajat individual) */}
{!isEmployeeRequired && selectedClientId && jobs.length > 0 && (
  <div className="pt-2 border-t border-slate-100">
    <label className="block text-xs font-semibold text-slate-700 mb-1">
      Funcție / Post de Lucru (opțional - pentru evaluarea riscurilor sau instructaj specific postului)
    </label>
...
```
- Variabila `isEmployeeRequired` este calculată la linia 161:
  ```typescript
  const isEmployeeRequired =
    !isHygieneTemplate &&
    (currentTemplate?.contextLevel === 'employee' || currentTemplate?.contextLevel === 'job');
  ```
- Pentru orice șablon de igienă, `isHygieneTemplate` este `true`, deci `isEmployeeRequired` este `false`.
- În consecință, `!isEmployeeRequired` devine `true`!
- De îndată ce o firmă client este selectată (`selectedClientId`) și firma are cel puțin un post definit (`jobs.length > 0`), expresia `!isEmployeeRequired && selectedClientId && jobs.length > 0` evaluează la `true`!
- Același comportament defectuos are loc pentru **toate cele 11 șabloane generale de client** (cum ar fi `decizii-angajator`, `ipssm-birou`, `ipssm-alunecari`, `training-tematica-introductiv`), deoarece pentru ele `isEmployeeRequired` este de asemenea `false`.

### 2.2. Preselectarea agresivă a primului post în `useEffect` (Liniile 185-187)
La încărcarea datelor clientului în `useEffect`:
```typescript
fetch(`/api/clients/${selectedClientId}`)
  .then((res) => res.json())
  .then((data) => {
    if (data && Array.isArray(data.jobs)) {
      setJobs(data.jobs);
      if (!isEmployeeRequired && !selectedJobId && data.jobs.length > 0) {
        setSelectedJobId(data.jobs[0].id);
      }
    }
  });
```
- Când utilizatorul deschide pagina și alege clientul (înainte de a alege șablonul, sau când alege un șablon de igienă), `!isEmployeeRequired` este `true`.
- Condiția `!isEmployeeRequired && !selectedJobId && data.jobs.length > 0` forțează `selectedJobId` la `data.jobs[0].id` (ex. ID-ul postului de „Bucătar”).
- Prin urmare, dropdown-ul nu doar că apare, dar apare cu primul post **deja selectat tacit**.

### 2.3. Lipsa de resetare a stării la schimbarea șablonului (`selectedTemplateCode`)
- În componenta `<select value={selectedTemplateCode} onChange={(e) => setSelectedTemplateCode(e.target.value)}>` (linia 398), nu există nicio logică de curățare a stărilor derivate.
- De asemenea, nu există niciun `useEffect` care să asculte schimbarea lui `selectedTemplateCode` pentru a reseta `selectedJobId` sau `selectedEmployeeId`.
- Dacă utilizatorul a navigat între un șablon nominal (salariat) și unul de igienă, sau dacă postul a fost preselectat de linia 186, valoarea `selectedJobId` rămâne agățată în stare (`"bucatar-id"`).

### 2.4. Propagarea parametrului `jobId` în API-urile de backend
- În `useEffect`-ul de încărcare a câmpurilor (linia 228):
  ```typescript
  if (selectedJobId) params.append('jobId', selectedJobId);
  ```
- În `handleGenerate` (linia 314):
  ```typescript
  body: JSON.stringify({
    ...
    jobId: selectedJobId || undefined,
  })
  ```
- Backend-ul (`/api/documents/generate/route.ts:42` și `src/lib/templates/generator.ts:604`) salvează acest `jobId` în tabela `GeneratedDocument`, contaminând evidența documentelor și audit log-ul.

---

## 3. Inventarul Complet al celor 31 Șabloane Statutare (`definitions.ts`)

Conform analizei fișierului `src/lib/templates/definitions.ts` și a bazei de date PostgreSQL (`prisma.template`), catalogul conține exact **31 de șabloane statutare**:

### 3.1. Distribuție pe niveluri de context (`contextLevel`)
- **`employee` (12 șabloane):** Documente nominale per salariat. Salariatul este obligatoriu (`isEmployeeRequired = true`). Postul este dedus automat din profilul salariatului (`emp.currentJob`) și afișat într-un badge informativ needitabil. Dropdown-ul manual de post **NU** trebuie afișat.
- **`hygiene_session` (3 șabloane):** Documente legate de sesiunea sau cursurile de igienă (colective sau adeverință). Dropdown-ul de post **NU** trebuie afișat NICIODATĂ (`selectedJobId` resetat la `''`).
- **`client` (16 șabloane):** Documente la nivel de companie.
  - Dintre acestea, **5 șabloane sunt specifice unui post de lucru / loc de muncă** (`job context`):
    1. `risk-evaluare` (Dosar Evaluare Riscuri INCDPM per post)
    2. `risk-plan-prevenire-tesa` (Plan Prevenire și Protecție per post)
    3. `ipssm-tesa` (Fișă Evaluare Factori de Risc TESA)
    4. `training-tematica-loc-munca` (Tematică instruire la locul de muncă / specifică funcției)
    5. `training-detaliu-loc-munca` (Detaliu suport tematică loc de muncă)
  - Celelalte **11 șabloane sunt generale pentru întreaga firmă** și **NU au nicio legătură cu un post de lucru**:
    `decizii-angajator`, `ipssm-alunecari`, `ipssm-autovehicule`, `ipssm-birou`, `ipssm-universale`, `ipssm-opis`, `training-tematica-introductiv`, `training-detaliu-introductiv`, `risk-plan-actiune-urgenta`, `risk-zone-pericol`, `hr-info-dosar`.

---

### 3.2. Matricea de Clasificare a Șabloanelor și Selectoarelor UI Relevante

| # | Cod Șablon | Denumire Oficială | Familie | Format | `contextLevel` | Câmpuri Post (`job.*`) | Selectoare Necesare în UI |
|---|---|---|---|---|---|---|---|
| 1 | `ipssm-alunecari` | IPSSM 11 - Alunecări și împiedicări | `ipssm` | DOCX | `client` | Nu | Doar Client |
| 2 | `ipssm-autovehicule` | IPSSM 12 - Autovehicule și transport | `ipssm` | DOCX | `client` | Nu | Doar Client |
| 3 | `ipssm-birou` | IPSSM 13 - Activități birou și ergonomie | `ipssm` | DOCX | `client` | Nu | Doar Client |
| 4 | `hygiene-adeverinta` | Adeverință participare curs igienă | `hygiene` | DOCX | `hygiene_session` | Nu | Client + Sesiune + Cursant (sau Scope A: Salariat) |
| 5 | `hr-anexa-fisa-post` | Anexă la fișa postului - Atribuții SSM | `hr` | DOCX | `employee` | Da (din Salariat) | Client + Salariat (Post auto-asociat) |
| 6 | `hygiene-anexe-catalog` | Anexe și Cataloage Curs Igienă (8 Anexe) | `hygiene` | XLSX | `hygiene_session` | Nu | Client + Sesiune Igienă |
| 7 | `hr-cerere-angajare` | Cerere de angajare | `hr` | DOCX | `employee` | Da (din Salariat) | Client + Salariat (Post auto-asociat) |
| 8 | `hr-cim-2026` | Contract individual de muncă 2026 | `hr` | DOCX | `employee` | Da (din Salariat) | Client + Salariat (Post auto-asociat) |
| 9 | `decizii-angajator` | Pachet Decizii Interne SSM | `decision` | DOCX | `client` | Nu | Doar Client |
| 10 | `hr-declaratie-regulament` | Declarație Regulament Intern | `hr` | DOCX | `employee` | Nu | Client + Salariat |
| 11 | `hr-declaratie-raspundere` | Declarație proprie răspundere la angajare | `hr` | DOCX | `employee` | Nu | Client + Salariat |
| 12 | `training-detaliu-introductiv` | Detaliu tematică introductiv-generală | `training` | DOCX | `client` | Nu | Doar Client |
| 13 | `training-detaliu-loc-munca` | Detaliu tematică loc de muncă | `training` | DOCX | `client` | **Da (Specific Post)** | **Client + Post de Lucru** |
| 14 | `risk-evaluare` | Dosar Evaluare Riscuri (INCDPM) | `risk` | DOCX | `client` | **Da (Specific Post)** | **Client + Post de Lucru** |
| 15 | `hr-info-dosar` | Informare conținut dosar salariat | `hr` | DOCX | `client` | Nu | Doar Client |
| 16 | `hr-gdpr-informare` | Notă informare GDPR | `hr` | DOCX | `employee` | Nu | Client + Salariat |
| 17 | `ipssm-universale` | IPSSM 01-10 Generale / Universale | `ipssm` | DOCX | `client` | Nu | Doar Client |
| 18 | `ipssm-opis` | OPIS Instrucțiuni Proprii SSM | `ipssm` | DOCX | `client` | Nu | Doar Client |
| 19 | `risk-plan-actiune-urgenta` | Plan acțiune pericol grav și iminent | `risk` | DOCX | `client` | Nu | Doar Client |
| 20 | `risk-plan-prevenire-tesa` | Plan Prevenire și Protecție TESA | `risk` | DOCX | `client` | **Da (Specific Post)** | **Client + Post de Lucru** |
| 21 | `hygiene-tabel-cursanti` | Tabel evidență cursanți igienă | `hygiene` | XLSX | `hygiene_session` | Nu | Client + Sesiune Igienă |
| 22 | `training-tematica-introductiv` | Tematică instruire introductiv-generală | `training` | DOCX | `client` | Nu | Doar Client |
| 23 | `training-tematica-loc-munca` | Tematică instruire la locul de muncă | `training` | DOCX | `client` | **Da (Specific Post)** | **Client + Post de Lucru** |
| 24 | `ipssm-tesa` | Fișă Factori Risc Post TESA | `risk` | DOCX | `client` | **Da (Specific Post)** | **Client + Post de Lucru** |
| 25 | `risk-zone-pericol` | Evidența zonelor cu risc ridicat | `risk` | DOCX | `client` | Nu | Doar Client |
| 26 | `ssm-fisa-instruire-individuala` | Fișă Instruire SSM (Anexa 11) | `training` | DOCX | `employee` | Da (din Salariat) | Client + Salariat (Post auto-asociat) |
| 27 | `psi-fisa-instructaj-individuala` | Fișă Instructaj PSI/SU (OMAI 712) | `training` | DOCX | `employee` | Da (din Salariat) | Client + Salariat (Post auto-asociat) |
| 28 | `med-fisa-solicitare-examen` | Fișă Solicitare Examen Medical (Anexa 2) | `hr` | DOCX | `employee` | Da (din Salariat) | Client + Salariat (Post auto-asociat) |
| 29 | `med-fisa-identificare-riscuri` | Fișă Factori Risc Profesional (Anexa 3) | `risk` | DOCX | `employee` | Da (din Salariat) | Client + Salariat (Post auto-asociat) |
| 30 | `eip-fisa-acordare-individuala` | Fișă Individuală EIP (HG 1048) | `hr` | DOCX | `employee` | Da (din Salariat) | Client + Salariat (Post auto-asociat) |
| 31 | `hr-cim-model-cadru-2022` | CIM Model-Cadru Ordin 2171/2022 | `hr` | DOCX | `employee` | Da (din Salariat) | Client + Salariat (Post auto-asociat) |

---

## 4. Modelul Operațional în 4 Categorii pentru UI

Pentru a garanta că niciun șablon nu primește selectoare absurde sau irelevante:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        REGULILE DE AFIȘARE A SELECTOARELOR                             │
├────────────────────┬─────────────────────────────┬─────────────────────────────────────┤
│ Categoria          │ Șabloane Cuprinse           │ Comportament Selectoare             │
├────────────────────┼─────────────────────────────┼─────────────────────────────────────┤
│ 1. IGIENĂ          │ hygiene-adeverinta          │ - FĂRĂ Selector de Post (NICIODATĂ) │
│                    │ hygiene-anexe-catalog       │ - selectedJobId resetat la ''       │
│                    │ hygiene-tabel-cursanti      │ - Selectoare: Sesiune / Cursant     │
├────────────────────┼─────────────────────────────┼─────────────────────────────────────┤
│ 2. SALARIAT        │ 12 șabloane nominale        │ - Selector Salariat activ           │
│    (EMPLOYEE)      │ (CIM, Fișe Instruire,       │ - Postul se preia automat din profil│
│                    │  Medicină, EIP, etc.)       │ - FĂRĂ Selector Manual de Post      │
├────────────────────┼─────────────────────────────┼─────────────────────────────────────┤
│ 3. POST DE LUCRU   │ risk-evaluare               │ - Selector Post de Lucru activ      │
│    (JOB CONTEXT)   │ risk-plan-prevenire-tesa    │ - FĂRĂ Selector de Salariat         │
│                    │ ipssm-tesa                  │                                     │
│                    │ training-tematica-loc-munca │                                     │
│                    │ training-detaliu-loc-munca  │                                     │
├────────────────────┼─────────────────────────────┼─────────────────────────────────────┤
│ 4. GENERAL FIRMĂ   │ decizii-angajator           │ - FĂRĂ Selector de Post             │
│    (CLIENT ONLY)   │ ipssm-01..13, opis, regulam.│ - FĂRĂ Selector de Salariat         │
│                    │ training-introductiv, etc.  │ - Doar selectorul de Firmă Client   │
└────────────────────┴─────────────────────────────┴─────────────────────────────────────┘
```

---

## 5. Soluția Tehnică Recomandată pentru Implementator

În `src/app/documents/generate/page.tsx`, implementatorul va aplica următoarele ajustări precise:

### 5.1. Clarificarea predicatelor de context
```typescript
  const currentTemplate = templates.find((t) => t.code === selectedTemplateCode);
  
  const isHygieneTemplate =
    currentTemplate?.family === 'hygiene' ||
    currentTemplate?.contextLevel === 'hygiene_session' ||
    selectedTemplateCode.startsWith('hygiene-');

  // Doar șabloanele nominale per salariat cer salariat
  const isEmployeeRequired =
    !isHygieneTemplate && currentTemplate?.contextLevel === 'employee';

  const isAdeverinta = selectedTemplateCode === 'hygiene-adeverinta';

  // Șabloane fără salariat care au context explicit de post de lucru
  const JOB_CONTEXT_TEMPLATE_CODES = [
    'risk-evaluare',
    'risk-plan-prevenire-tesa',
    'ipssm-tesa',
    'training-tematica-loc-munca',
    'training-detaliu-loc-munca',
  ];

  const isJobContextTemplate = Boolean(
    !isHygieneTemplate &&
    !isEmployeeRequired &&
    currentTemplate &&
    (
      currentTemplate.contextLevel === 'job' ||
      JOB_CONTEXT_TEMPLATE_CODES.includes(currentTemplate.code) ||
      (currentTemplate.manifestJson && currentTemplate.manifestJson.includes('"source":"job.'))
    )
  );
```

### 5.2. Corecția încărcării clienților (eliminarea auto-selectării abuzive a primului post)
Înlocuirea liniei 185:
```typescript
// ÎNAINTE (defectuos):
if (!isEmployeeRequired && !selectedJobId && data.jobs.length > 0) {
  setSelectedJobId(data.jobs[0].id);
}

// DUPĂ (corect):
if (isJobContextTemplate && !selectedJobId && data.jobs.length > 0) {
  setSelectedJobId(data.jobs[0].id);
}
```

### 5.3. Resetarea imediată a stării la schimbarea șablonului
Adăugarea unui efect dedicat de igienizare a stărilor:
```typescript
  // Resetare imediată a parametrilor la schimbarea șablonului
  useEffect(() => {
    if (isHygieneTemplate) {
      setSelectedJobId('');
      if (!isAdeverinta) {
        setSelectedEmployeeId('');
      }
    } else if (!isEmployeeRequired && !isJobContextTemplate) {
      // Șablon general de firmă fără post
      setSelectedJobId('');
      setSelectedEmployeeId('');
    } else if (isJobContextTemplate) {
      setSelectedEmployeeId('');
      if (!selectedJobId && jobs.length > 0) {
        setSelectedJobId(jobs[0].id);
      }
    } else if (isEmployeeRequired) {
      if (selectedEmployeeId && employees.length > 0) {
        const emp = employees.find((e) => e.id === selectedEmployeeId);
        setSelectedJobId(emp?.currentJobId || (emp?.currentJob as any)?.id || '');
      } else {
        setSelectedJobId('');
      }
    }
  }, [selectedTemplateCode, isHygieneTemplate, isEmployeeRequired, isJobContextTemplate, isAdeverinta]);
```
De asemenea, în handler-ul `onChange` al selectorului de șablon:
```tsx
onChange={(e) => {
  const newCode = e.target.value;
  setSelectedTemplateCode(newCode);
  const nextTpl = templates.find((t) => t.code === newCode);
  const nextIsHygiene = nextTpl?.family === 'hygiene' || nextTpl?.contextLevel === 'hygiene_session' || newCode.startsWith('hygiene-');
  if (nextIsHygiene) {
    setSelectedJobId('');
    if (newCode !== 'hygiene-adeverinta') setSelectedEmployeeId('');
  }
}}
```

### 5.4. Corecția condiției de afișare a selectorului Job în JSX (Linia 470)
```tsx
{/* Job / Funcție Selector (DOAR pentru documente specifice de post/evaluare riscuri, NICIODATĂ pentru igienă sau documente generale de firmă) */}
{isJobContextTemplate && selectedClientId && jobs.length > 0 && (
  <div className="pt-2 border-t border-slate-100">
    <label className="block text-xs font-semibold text-slate-700 mb-1">
      Funcție / Post de Lucru * (pentru evaluarea riscurilor sau tematică specifică postului)
    </label>
    <select
      value={selectedJobId}
      onChange={(e) => setSelectedJobId(e.target.value)}
      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">-- Alege postul / funcția --</option>
      {jobs.map((j) => (
        <option key={j.id} value={j.id}>
          {j.title} {j.corCode ? `(COR ${j.corCode})` : ''}
        </option>
      ))}
    </select>
  </div>
)}
```

### 5.5. Igienizarea parametrilor trimiși către API-uri
În cererea către `/api/templates/[code]/fields` (linia 227):
```typescript
if (isEmployeeRequired && selectedEmployeeId) {
  params.append('employeeId', selectedEmployeeId);
} else if (isHygieneTemplate && hygieneScope === 'client' && isAdeverinta && selectedEmployeeId) {
  params.append('employeeId', selectedEmployeeId);
}

if (!isHygieneTemplate && (isEmployeeRequired || isJobContextTemplate) && selectedJobId) {
  params.append('jobId', selectedJobId);
}
```

În cererea din `handleGenerate` (linia 310):
```typescript
const sanitizedJobId = (!isHygieneTemplate && (isEmployeeRequired || isJobContextTemplate))
  ? (selectedJobId || undefined)
  : undefined;

const sanitizedEmployeeId = isEmployeeRequired
  ? (selectedEmployeeId || undefined)
  : (isHygieneTemplate && hygieneScope === 'client' && isAdeverinta)
  ? (selectedEmployeeId || undefined)
  : undefined;

// Trimitere către POST /api/documents/generate:
body: JSON.stringify({
  templateCode: selectedTemplateCode,
  clientId: selectedClientId,
  employeeId: sanitizedEmployeeId,
  jobId: sanitizedJobId,
  hygieneSessionId: (isHygieneTemplate && hygieneScope === 'client') ? undefined : (selectedHygieneSessionId || undefined),
  hygieneParticipantId: (isHygieneTemplate && hygieneScope === 'client') ? undefined : (selectedHygieneParticipantId || undefined),
  customFields: formValues,
}),
```

---

## 6. Concluzii și Recomandări pentru Etapele Următoare

1. **Rezolvare completă în Faza 1:** Modificările de mai sus elimină complet glitch-ul vizual și comportamental la nivel de UI și previn transmiterea `jobId` eronat.
2. **Recomandare Faza 2/3 (Catalog):** În `src/lib/templates/definitions.ts`, câmpul `contextLevel` pentru cele 5 șabloane specifice de post (`risk-evaluare`, `risk-plan-prevenire-tesa`, `ipssm-tesa`, `training-tematica-loc-munca`, `training-detaliu-loc-munca`) poate fi actualizat din `'client'` în `'job'`, oferind o tipizare strictă la nivel de catalog de date.
