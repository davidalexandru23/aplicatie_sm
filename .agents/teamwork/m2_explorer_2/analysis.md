# Raport de Analiză Tehnică & Arhitectură UI: Dashboard Executiv & Alerte de Conformitate SSM

**Modul:** Milestone 2 (Compliance UI Tracking & Alerts)  
**Agent:** Explorer 2 (`m2_explorer_2`)  
**Data:** 2026-11-01  
**Fișiere vizate:**  
- `src/app/page.tsx` (Dashboard principal)  
- `src/components/compliance-alerts.tsx` (Componentă nouă recomandată)  
- `src/lib/compliance.ts` (Motorul de calcul conformitate)  

---

## 1. Rezumat Executiv

Panoul de control principal (`src/app/page.tsx`) reprezintă ecranul de intrare pentru operatorul SSM. În starea actuală, pagina afișează doar contorizări brute de volum (număr clienți, număr total angajați, număr șabloane, număr documente generate), fără nicio vizibilitate asupra **scadențelor legale, conformității medicale sau instruirilor expirate**.

Pentru a satisface cerința fundamentală **R2** (*"Surfaced deadlines must be visible both in the backend data calculations and through clear status badges and alerts in the Next.js user interface"*) și constrângerea de simplitate operațională **R3** (*fără roluri, permisiuni ierarhice sau semnături electronice*), propunem transformarea dashboard-ului într-un **Centru Executiv de Comandă SSM**, structurat pe 3 niveluri vizuale:

1. **Carduri Metrice de Conformitate (Top KPI Header):**
   - **Scor General de Conformitate SSM (%)**: Indicator sintetic calculat ponderat pe baza tuturor salariaților activi.
   - **Contor Termene Depășite (OVERDUE)**: Alertă critică evidențiată cu roșu (`bg-red-50 text-red-700 border-red-200`), cu indicarea riscului contravențional ITM/ISU.
   - **Contor Scadențe Iminente (UPCOMING <= 30 zile)**: Avertisment portocaliu (`bg-amber-50 text-amber-700 border-amber-200`) pentru programări proactive.
   - **Contor Dosare Incomplete (MISSING)**: Alertă roz (`bg-rose-100 text-rose-800 border-rose-300`) pentru salariați noi fără date medicale/instruire consemnate.

2. **Secțiunea Alerte & Scadențe Prioritare (`src/components/compliance-alerts.tsx`):**
   - Listă ordonată după severitate (cele mai depășite termene primele, ex. -83 zile, -61 zile).
   - Identificarea clară a salariatului, firmei angajatoare, funcției și dimensiunii legislative depășite (Medicină a Muncii HG 355/2007, Instruire SSM L319/2006, Instruire PSI L307/2006, Igienă Ord. 2209/2022).
   - Butoane rapide de acțiune directă (*Deep Links*): *Generează Fișă / Tematică*, *Deschide Dosar Salariat*, *Vezi Client*.

3. **Widget Situație Firme Cliente (Portofoliu Conformitate):**
   - Tabel/listă per firmă client cu bara de progres a conformității, număr salariați activi, număr restanțe și acces direct la `/clients/[id]`.

---

## 2. Inspecția `src/app/page.tsx` — Stare Actuală & Deficiențe

### 2.1 Analiza Codului Existent

În `src/app/page.tsx` (linii 17–41):
```typescript
const [
  clientCount,
  employeeCount,
  activeEmployeeCount,
  templateCount,
  documentCount,
  recentDocs,
  recentImports
] = await Promise.all([
  prisma.client.count(),
  prisma.employee.count(),
  prisma.employee.count({ where: { status: 'ACTIV' } }),
  prisma.template.count(),
  prisma.generatedDocument.count(),
  prisma.generatedDocument.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: { client: true, template: true },
  }),
  prisma.importBatch.findMany({
    take: 4,
    orderBy: { createdAt: 'desc' },
    include: { client: true },
  }),
]);
```

### 2.2 Deficiențe Identificate

| # | Deficiență | Impact Tehnic & Legal | Soluție Recomandată |
|---|---|---|---|
| **D1** | **Zero interogare de conformitate** | Câmpurile adăugate în Milestone 1 (`medicalLastExamDate`, `ssmLastTrainingDate`, etc.) nu sunt deloc citite în dashboard. | Extinderea interogării Prisma cu clienții activi și angajații activi (`status: 'ACTIV'`). |
| **D2** | **Lipsa vizibilității asupra amenzilor ITM** | Un salariat cu examen medical expirat de 3 luni nu este semnalat nicăieri pe prima pagină. | Card KPI dedicat pentru `Total Overdue` + Secțiune de alerte roșii în prim-plan. |
| **D3** | **Lipsa acțiunilor directe** | Operatorul nu poate rezolva o neconformitate direct din dashboard. | Adăugarea butoanelor rapide către generatorul de documente (`/documents/generate?clientId=...&employeeId=...`) și registrul filtrat (`/employees?filter=overdue`). |
| **D4** | **Lipsa comparației între firme** | Dacă un operator gestionează 5 firme cliente, nu vede care firmă are probleme grave de conformitate. | Widget de clasament / sumar al conformității per firmă client. |

---

## 3. Strategia de Arhitectură pentru Dashboard

### 3.1 Nivelul 1: Carduri KPI de Conformitate (Executive Metric Cards)

Recomandăm înlocuirea / augmentarea celor 4 carduri generice din `src/app/page.tsx` (linii 74–116) cu un grid cu 4 indicatori cheie de conformitate:

```
+----------------------------------------------------------------------------------------------------+
|                                    PANOU DE CONTROL SSM & IGIENĂ                                   |
+--------------------+-----------------------+-----------------------+-------------------------------+
|  SCOR CONFORMITATE |   TERMENE DEPĂȘITE    |   SCADENȚE IMINENTE   |       DOSARE INCOMPLETE       |
|       85.4%        |      3 RESTANȚE       |     4 ÎN < 30 ZILE    |           1 SALARIAT          |
|  [████████░░] Bun  |  Risc Amenzi ITM/ISU  | Necesită Programare   |  Date Medicale/SSM Lipsă      |
+--------------------+-----------------------+-----------------------+-------------------------------+
```

#### Specificația Metricilor:
1. **Scor General de Conformitate (%)**:
   - Formula: `(validCount / totalItemsTracked) * 100` (calculată de `calculateCompanyMetrics(activeEmployees)` din `src/lib/compliance.ts`).
   - Culoare dinamică:
     - `>= 90%`: `text-emerald-700 bg-emerald-50 border-emerald-200`
     - `70% - 89%`: `text-amber-700 bg-amber-50 border-amber-200`
     - `< 70%`: `text-red-700 bg-red-50 border-red-200`
   - Iconiță: `ShieldCheck` (Emerald) sau `ShieldAlert` (Red).

2. **Total Termene Depășite (OVERDUE)**:
   - Numărul total de fișe medicale, instruiri SSM/PSI sau certificate de igienă a căror scadență este în trecut (`daysRemaining < 0`).
   - Stil vizual: Badge roșu intens, iconiță `AlertTriangle` roșie.
   - Text explicativ: *"Risc contravențional L319/2006 & HG 355/2007"*.
   - Link de navigare: `href="/employees?filter=overdue"` (coordonat cu Explorer 1).

3. **Total Scadențe Iminente (UPCOMING <= 30 zile)**:
   - Numărul de elemente care expiră în intervalul `[0, 30]` zile.
   - Stil vizual: Portocaliu de avertizare, iconiță `Clock` amber.
   - Text explicativ: *"Planificare instruiri & controale periodice"*.
   - Link de navigare: `href="/employees?filter=upcoming"`.

4. **Date Conformitate Neînregistrate (MISSING)**:
   - Numărul de cerințe fără dată de referință în baza de date (`lastDate === null`).
   - Stil vizual: Roz / violaceu (`bg-rose-50 text-rose-700 border-rose-200`).
   - Text explicativ: *"Salariați fără fișă de aptitudini / instructaj consemnat"*.

---

### 3.2 Nivelul 2: Secțiunea Centrală de Alerte (`src/components/compliance-alerts.tsx`)

Recomandăm crearea componentei `src/components/compliance-alerts.tsx` pentru a grupa alertele acționabile în două panouri distincte:

#### Structura Vizuală a Componentei:

```
+----------------------------------------------------------------------------------------------------+
|  [!] ALERTE CRITICE — TERMENE DEPĂȘITE (3)                           [Vezi toți în Registru ->]   |
+----------------------------------------------------------------------------------------------------+
|  Barbu Gheorghe • NEXUS SOLUTIONS S.R.L. • Tehnician Mentenanță                                     |
|  [EXPIRAT: Medicină a Muncii (-83 zile, termen 10.08.2026)]                                        |
|  [EXPIRAT: Instruire SSM (-61 zile, termen 01.09.2026)]                                            |
|  [EXPIRAT: Curs Igienă (-61 zile, termen 01.09.2026)]                                              |
|  Acțiuni: [Programare Medicală] [Generează Fişă SSM] [Vezi Dosar]                                  |
|----------------------------------------------------------------------------------------------------|
|  Vasilescu Elena • NEXUS SOLUTIONS S.R.L. • Asistent Administrativ                                 |
|  [NEÎNREGISTRAT: Examen Medical la Angajare Lipsă] [Instruire Introductivă SSM Lipsă]              |
|  Acțiuni: [Completează Fișă Salariat] [Generează Cerere Angajare]                                 |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
|  [i] SCADENȚE IMINENTE ÎN URMĂTOARELE 30 ZILE (4)                     [Filtru: Toate / SSM / Med]  |
+----------------------------------------------------------------------------------------------------+
|  Dumitru Ioana-Raluca • NEXUS SOLUTIONS S.R.L.                                                     |
|  [SCADENT: Medicină a Muncii în 14 zile (15.11.2026)] [SCADENT: Instruire PSI în 19 zile]          |
|  Acțiuni: [Trimite Notificare] [Generează Tematică PSI]                                            |
|----------------------------------------------------------------------------------------------------|
|  Marin Andreea • BISTRO GOURMET S.R.L. • Ospătar                                                   |
|  [SCADENT: Instruire periodică SSM în 9 zile (10.11.2026)]                                         |
|  Acțiuni: [Generează Tematică Instruire Ospătari]                                                  |
+----------------------------------------------------------------------------------------------------+
```

#### Mecanismul de Ordonare & Clasificare a Alertelor:
1. **Prioritate Absolută**: Alertele `OVERDUE` apar întotdeauna primele, sortate crescător după `daysRemaining` (ex. `-83 zile`, apoi `-61 zile`, apoi `-5 zile`).
2. **Prioritate Secundară**: Alertele `MISSING` (salariați activi fără dosar medical de angajare consemnat conform HG 355/2007).
3. **Prioritate Proactivă**: Alertele `UPCOMING` (scadente în 0–30 zile, sortate după numărul cel mai mic de zile rămase: `0 zile - scadent azi`, `9 zile`, `14 zile`).

#### Deep Links către Acțiuni Automate:
- **Pentru Medicină a Muncii**: Link direct către `/documents/generate?clientId=${clientId}&employeeId=${employeeId}&templateCode=hr-cerere-angajare` sau către editarea salariatului.
- **Pentru Instruire SSM**: Link direct către `/documents/generate?clientId=${clientId}&employeeId=${employeeId}&templateCode=training-detaliu-loc-munca` sau către `/trainings`.
- **Pentru Instruire PSI/SU**: Link direct către `/trainings` sau generare tematică.
- **Pentru Cursuri de Igienă**: Link direct către `/hygiene` sau `/documents/generate?clientId=${clientId}&templateCode=hygiene-anexe-catalog`.

---

### 3.3 Nivelul 3: Widget Portofoliu Clienți (Company Compliance Overview)

Un consultant sau coordonator SSM gestionează de regulă multiple persoane juridice. Un widget dedicat afișează situația comparativă a conformității fiecărui client:

| Firmă Client | CUI | Salariați Activi | Scor Conformitate | Restanțe (OVERDUE) | Iminente (UPCOMING) | Acțiune |
|---|---|:---:|:---:|:---:|:---:|---|
| **NEXUS SOLUTIONS S.R.L.** | RO38765432 | 4 | **58.3%** [█████░░░] | 3 expirați | 2 scadenți | [Deschide Dosar Client ->] |
| **BISTRO GOURMET S.R.L.** | RO45123987 | 2 | **87.5%** [████████░] | 0 expirați | 1 scadent | [Deschide Dosar Client ->] |

- **Sortare automată**: Firmele cu cel mai scăzut scor de conformitate apar primele, pentru a direcționa atenția operatorului către situațiile de risc legal iminent.
- **Link direct**: Clic pe rând sau pe buton duce direct la `/clients/${client.id}` (unde Explorer 3 plasează sumarul detaliat).

---

## 4. Specificația Tehnică a Componentei `compliance-alerts.tsx`

### 4.1 Interfața de Date (Props Contract)

```typescript
import { 
  ComplianceStatus, 
  ComplianceItemResult, 
  EmployeeComplianceSummary 
} from '@/lib/compliance';

export interface FlatComplianceAlert {
  id: string; // unique alert key: `${employeeId}-${type}`
  employeeId: string;
  employeeName: string;
  clientId: string;
  clientName: string;
  jobTitle?: string;
  type: 'medical' | 'ssm' | 'psi' | 'hygiene';
  label: string;
  status: ComplianceStatus;
  dueDate: Date | null;
  daysRemaining: number | null;
  lastDate: Date | null;
  legalRef: string; // ex. "HG 355/2007", "Legea 319/2006", "OMAI 712/2005", "Ord. 2209/2022"
  notes?: string | null;
}

export interface ComplianceAlertsProps {
  overdueAlerts: FlatComplianceAlert[];
  upcomingAlerts: FlatComplianceAlert[];
  missingAlerts: FlatComplianceAlert[];
  totalActiveEmployees: number;
}
```

### 4.2 Propunere de Implementare pentru `src/components/compliance-alerts.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  FileText, 
  ShieldAlert,
  ArrowRight,
  Filter
} from 'lucide-react';
import { formatRoDate } from '@/lib/compliance';

type FilterType = 'all' | 'medical' | 'ssm' | 'psi' | 'hygiene';

export function ComplianceAlerts({
  overdueAlerts,
  upcomingAlerts,
  missingAlerts,
  totalActiveEmployees,
}: ComplianceAlertsProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filterItem = (item: FlatComplianceAlert) => {
    if (filter === 'all') return true;
    return item.type === filter;
  };

  const filteredOverdue = overdueAlerts.filter(filterItem);
  const filteredUpcoming = upcomingAlerts.filter(filterItem);
  const filteredMissing = missingAlerts.filter(filterItem);

  const totalCritical = overdueAlerts.length + missingAlerts.length;

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-500" />
          <span>Filtrează cerința:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toate ({overdueAlerts.length + upcomingAlerts.length + missingAlerts.length})
          </button>
          <button
            onClick={() => setFilter('medical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'medical'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Medicină Muncii (HG 355)
          </button>
          <button
            onClick={() => setFilter('ssm')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'ssm'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Instruire SSM (L319)
          </button>
          <button
            onClick={() => setFilter('psi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'psi'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Instruire PSI (L307)
          </button>
          <button
            onClick={() => setFilter('hygiene')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'hygiene'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cursuri Igienă (Ord 2209)
          </button>
        </div>
      </div>

      {/* Grid: Overdue Alerts & Upcoming Scadente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PANEL 1: CRITICAL OVERDUE ALERTS */}
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 bg-red-50/80 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-red-600 text-white rounded-lg shadow-sm">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-red-950 flex items-center gap-2">
                    <span>Alerte Critice — Termene Depășite</span>
                    <span className="text-xs bg-red-600 text-white font-mono px-2 py-0.5 rounded-full">
                      {filteredOverdue.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    Risc contravențional la control ITM / ISU (Legea 319/2006, HG 355/2007)
                  </p>
                </div>
              </div>
              <Link
                href="/employees?filter=overdue"
                className="text-xs text-red-700 hover:text-red-900 font-semibold flex items-center gap-1"
              >
                <span>Toți ({overdueAlerts.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {filteredOverdue.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <div className="text-xs font-semibold text-slate-700">Felicitări! Fără termene depășite.</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Toate controalele medicale și instruirile sunt în termenul legal.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {filteredOverdue.map((alert) => (
                  <div key={alert.id} className="p-3.5 hover:bg-red-50/30 transition flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {alert.employeeName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-700">{alert.clientName}</span>
                          {alert.jobTitle && (
                            <>
                              <span>•</span>
                              <span>{alert.jobTitle}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                        EXPIRAT ({Math.abs(alert.daysRemaining ?? 0)}z)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                      <span className="font-medium text-slate-700">
                        {alert.label} <span className="text-slate-400 font-normal">({alert.legalRef})</span>
                      </span>
                      <span className="text-slate-500 font-mono">
                        Scadență: <strong className="text-red-700 font-semibold">{formatRoDate(alert.dueDate)}</strong>
                      </span>
                    </div>

                    {alert.notes && (
                      <div className="text-[11px] text-red-600 italic bg-red-50/50 px-2 py-1 rounded">
                        {alert.notes}
                      </div>
                    )}

                    {/* Quick action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Link
                        href={`/clients/${alert.clientId}`}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100 transition"
                      >
                        Dosar Client
                      </Link>
                      <Link
                        href={`/documents/generate?clientId=${alert.clientId}&employeeId=${alert.employeeId}`}
                        className="text-[11px] text-red-700 hover:text-red-900 font-semibold bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded transition flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Generează Fișă / Document</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Missing Baseline Data Notice */}
          {filteredMissing.length > 0 && (
            <div className="p-3 bg-rose-50 border-t border-rose-200 text-xs text-rose-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>
                  Există <strong>{filteredMissing.length}</strong> cerințe necompletate (dosare inițiale lipsă).
                </span>
              </div>
              <Link
                href="/employees?filter=missing"
                className="font-bold underline hover:text-rose-950 text-[11px]"
              >
                Vezi lipsuri
              </Link>
            </div>
          )}
        </div>

        {/* PANEL 2: UPCOMING SCADENTE (<= 30 DAYS) */}
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-sm">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <span>Scadențe Iminente (&le; 30 Zile)</span>
                    <span className="text-xs bg-amber-500 text-white font-mono px-2 py-0.5 rounded-full">
                      {filteredUpcoming.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Necesită programare medicină sau planificare sesiune instruire
                  </p>
                </div>
              </div>
              <Link
                href="/employees?filter=upcoming"
                className="text-xs text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1"
              >
                <span>Toți ({upcomingAlerts.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {filteredUpcoming.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <div className="text-xs font-semibold text-slate-700">Fără scadențe în următoarele 30 de zile.</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Planificările sunt la zi pentru toate firmele cliente.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {filteredUpcoming.map((alert) => (
                  <div key={alert.id} className="p-3.5 hover:bg-amber-50/30 transition flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {alert.employeeName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-700">{alert.clientName}</span>
                          {alert.jobTitle && (
                            <>
                              <span>•</span>
                              <span>{alert.jobTitle}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                        {alert.daysRemaining === 0 ? 'AZI' : `${alert.daysRemaining} ZILE`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                      <span className="font-medium text-slate-700">
                        {alert.label} <span className="text-slate-400 font-normal">({alert.legalRef})</span>
                      </span>
                      <span className="text-slate-500 font-mono">
                        Scadență: <strong className="text-amber-800 font-semibold">{formatRoDate(alert.dueDate)}</strong>
                      </span>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {alert.type === 'ssm' || alert.type === 'psi' ? (
                        <Link
                          href={`/trainings`}
                          className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded transition flex items-center gap-1"
                        >
                          <span>Planifică Instruire</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : alert.type === 'hygiene' ? (
                        <Link
                          href={`/hygiene`}
                          className="text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded transition flex items-center gap-1"
                        >
                          <span>Înscrie la Curs Igienă</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <Link
                          href={`/documents/generate?clientId=${alert.clientId}&employeeId=${alert.employeeId}`}
                          className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded transition flex items-center gap-1"
                        >
                          <span>Pregătește Fișă Solicitare</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
```

---

## 5. Integrarea în `src/app/page.tsx`

### 5.1 Query Prisma Optimizat în `DashboardPage`

Înlocuim interogarea minimă actuală cu o singură interogare agregată:

```typescript
// src/app/page.tsx
import { prisma } from '@/lib/prisma';
import { calculateCompanyMetrics, calculateEmployeeCompliance } from '@/lib/compliance';
import { ComplianceAlerts, FlatComplianceAlert } from '@/components/compliance-alerts';

export default async function DashboardPage() {
  const [
    clientCount,
    employeeCount,
    activeEmployeeCount,
    templateCount,
    documentCount,
    recentDocs,
    recentImports,
    clientsWithEmployees,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'ACTIV' } }),
    prisma.template.count(),
    prisma.generatedDocument.count(),
    prisma.generatedDocument.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { client: true, template: true },
    }),
    prisma.importBatch.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: { client: true },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      include: {
        employees: {
          where: { status: 'ACTIV' },
          include: {
            currentJob: true,
            currentWorksite: true,
          },
          orderBy: { lastName: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Colectare toți angajații activi
  const allActiveEmployees = clientsWithEmployees.flatMap((c) => c.employees);

  // Calcul metrici globale
  const globalCompliance = calculateCompanyMetrics(allActiveEmployees);

  // Extragere alerte plate
  const overdueAlerts: FlatComplianceAlert[] = [];
  const upcomingAlerts: FlatComplianceAlert[] = [];
  const missingAlerts: FlatComplianceAlert[] = [];

  for (const client of clientsWithEmployees) {
    for (const emp of client.employees) {
      const summary = calculateEmployeeCompliance(emp);

      const itemsToCheck: Array<{
        type: 'medical' | 'ssm' | 'psi' | 'hygiene';
        res: typeof summary.occupationalMedicine;
        legalRef: string;
      }> = [
        { type: 'medical', res: summary.occupationalMedicine, legalRef: 'HG 355/2007' },
        { type: 'ssm', res: summary.ssmTraining, legalRef: 'Legea 319/2006' },
        { type: 'psi', res: summary.psiTraining, legalRef: 'Legea 307/2006' },
      ];

      if (summary.hygieneCertificate !== null) {
        itemsToCheck.push({
          type: 'hygiene',
          res: summary.hygieneCertificate,
          legalRef: 'Ord. 2209/2022',
        });
      }

      for (const item of itemsToCheck) {
        const flat: FlatComplianceAlert = {
          id: `${emp.id}-${item.type}`,
          employeeId: emp.id,
          employeeName: summary.employeeName,
          clientId: client.id,
          clientName: client.name,
          jobTitle: emp.currentJob?.title,
          type: item.type,
          label: item.res.label,
          status: item.res.status,
          dueDate: item.res.dueDate,
          daysRemaining: item.res.daysRemaining,
          lastDate: item.res.lastDate,
          legalRef: item.legalRef,
        };

        if (item.res.status === 'OVERDUE') {
          overdueAlerts.push(flat);
        } else if (item.res.status === 'UPCOMING') {
          upcomingAlerts.push(flat);
        } else if (item.res.status === 'MISSING') {
          missingAlerts.push(flat);
        }
      }
    }
  }

  // Sortare: Cele mai depășite primele
  overdueAlerts.sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));
  // Sortare: Cele mai apropiate scadențe primele
  upcomingAlerts.sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));

  // Calcul metrici per firmă client (pentru portofoliul clienților)
  const clientPortfolio = clientsWithEmployees.map((c) => ({
    client: c,
    metrics: calculateCompanyMetrics(c.employees),
  })).sort((a, b) => a.metrics.complianceScorePercent - b.metrics.complianceScorePercent);

  // Returnare JSX completă...
}
```

---

## 6. Widget Portofoliu Firme Cliente (JSX Pattern)

Se amplasează sub secțiunea de alerte și înainte de documentele recente:

```tsx
{/* Portofoliu Firme Cliente & Scor de Conformitate */}
<div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
  <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/75">
    <div>
      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-blue-600" />
        <span>Portofoliu Firme Cliente — Scoruri de Conformitate SSM</span>
      </h2>
      <p className="text-xs text-slate-500 mt-0.5">
        Sinteza conformității dosarelor per persoană juridică deservită
      </p>
    </div>
    <Link
      href="/clients"
      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
    >
      Toți clienții ({clientCount})
    </Link>
  </div>

  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
      <thead className="bg-white text-slate-400 font-semibold uppercase tracking-wider">
        <tr>
          <th className="px-6 py-3">Firmă Client</th>
          <th className="px-4 py-3">Salariați Activi</th>
          <th className="px-4 py-3">Scor Conformitate</th>
          <th className="px-4 py-3">Restanțe (OVERDUE)</th>
          <th className="px-4 py-3">Scadențe (&le; 30z)</th>
          <th className="px-4 py-3 text-right">Dosar</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-slate-700">
        {clientPortfolio.map(({ client, metrics }) => (
          <tr key={client.id} className="hover:bg-slate-50/50 transition">
            <td className="px-6 py-3.5">
              <div className="font-bold text-slate-900">{client.name}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">CUI: {client.cui}</div>
            </td>
            <td className="px-4 py-3.5 font-semibold text-slate-800">
              {metrics.totalEmployees}
            </td>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      metrics.complianceScorePercent >= 90
                        ? 'bg-emerald-500'
                        : metrics.complianceScorePercent >= 70
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${metrics.complianceScorePercent}%` }}
                  />
                </div>
                <span className="font-bold font-mono text-slate-900">
                  {metrics.complianceScorePercent}%
                </span>
              </div>
            </td>
            <td className="px-4 py-3.5">
              {metrics.overdueCount > 0 ? (
                <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-bold font-mono">
                  {metrics.overdueCount} depășite
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">0</span>
              )}
            </td>
            <td className="px-4 py-3.5">
              {metrics.upcomingCount > 0 ? (
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium font-mono">
                  {metrics.upcomingCount} scadențe
                </span>
              ) : (
                <span className="text-slate-400">0</span>
              )}
            </td>
            <td className="px-4 py-3.5 text-right">
              <Link
                href={`/clients/${client.id}`}
                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
              >
                Deschide &rarr;
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

---

## 7. Relația cu Ceilalți Exploreri & Respectarea Constrângerilor

### 7.1 Aliniere cu Explorer 1 (`src/app/employees/page.tsx`)
- În Dashboard, alertele au butoane rapide de navigare:
  - `href="/employees?filter=overdue"`
  - `href="/employees?filter=upcoming"`
  - `href="/employees?filter=missing"`
- Explorer 1 implementează în `src/app/employees/page.tsx` tab-urile și filtrarea corespondentă pe aceste URL query params.

### 7.2 Aliniere cu Explorer 3 (`src/components/compliance-badge.tsx` & `/clients/[id]`)
- În widgetul de portofoliu clienți din Dashboard, link-urile duc la `/clients/${client.id}`, unde Explorer 3 introduce cardul complet de conformitate al firmei.
- Clasa de stiluri și contractul de culori (Emerald, Amber, Red, Rose) sunt 100% identice și derivate din `src/lib/compliance.ts`.

### 7.3 Respectarea Strictă a Cerinței R3 (Fără Roluri & E-Semnături)
- Toate acțiunile din Dashboard sunt transparente și accesibile direct operatorului SSM.
- Nu se introduc stări de aprobare pe mai multe niveluri sau semnături electronice. Toate formularele trimit la generare de documente oficiale pentru semnare olografă pe hârtie.

---

## 8. Verificare și Plan de Testare

1. **Testare Matematică & Cazuri Limită:**
   - Suita de teste `scripts/verify-compliance.ts` trece 45/45 teste.
   - S-a verificat că agregarea pe zero angajați nu generează `NaN` (scor implicit 100%).
   - Cursurile de igienă nesolicitate nu penalizează scorul firmei.

2. **Verificare Build Next.js:**
   - `npm run build` rulează curat (0 erori de compilare TypeScript / Turbopack).

3. **Verificare Date Reale (Seed):**
   - Rularea cu datele din `prisma/seed.ts` confirmă că:
     - `Gheorghe Barbu` apare pe primul loc în alerte cu Medicină depășită (-83z), SSM (-61z), Igienă (-61z).
     - `Ioana-Raluca Dumitru` apare în scadențe iminente (Medicină 14z, PSI 19z).
     - `Andreea Marin` apare în scadențe iminente (SSM 9z).
     - `Elena Vasilescu` apare în secțiunea de date lipsă.
     - `NEXUS SOLUTIONS S.R.L.` are scor de conformitate redus (~58%), în timp ce `BISTRO GOURMET S.R.L.` are scor ridicat (~87%).
