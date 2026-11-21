'use client';

import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

export interface TrainingParticipantItem {
  id: string;
  employeeId: string;
  result: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    currentJob?: { title: string } | null;
  };
}

export interface TrainingEventCardData {
  id: string;
  clientId: string;
  type: string;
  eventDate: Date | string;
  durationHours: number;
  materialOrTopic: string;
  instructorName: string;
  status: string;
  client: { id: string; name: string };
  participants: TrainingParticipantItem[];
}

export interface TrainingSessionCardProps {
  event: TrainingEventCardData;
}

export function TrainingSessionCard({ event }: TrainingSessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPsi = event.type === 'PERIODIC_PSI' || event.type === 'suplimentar';
  const isPlanned = event.status === 'planned';

  const handleDownload = async (
    key: string,
    payload: {
      templateCode: string;
      clientId: string;
      employeeId?: string;
      trainingEventId?: string;
    }
  ) => {
    try {
      setDownloadingDoc(key);
      setErrorMessage(null);

      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la generarea documentului.');
      }

      if (data.downloadUrl) {
        window.location.href = data.downloadUrl;
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Eroare la descărcare.');
    } finally {
      setDownloadingDoc(null);
    }
  };

  const pvTemplateCode = isPsi ? 'psi-pv-instruire' : 'ssm-pv-instruire-colectiva';
  const thematicTemplateCode =
    event.type === 'INTRODUCTIV'
      ? 'training-tematica-introductiv'
      : 'training-tematica-loc-munca';
  const individualSheetTemplateCode = isPsi
    ? 'psi-fisa-instructaj-individuala'
    : 'ssm-fisa-instruire-individuala';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 hover:shadow-md transition">
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-900 leading-snug">{event.materialOrTopic}</h2>
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-700">{event.client.name}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap ${
              isPsi
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}
          >
            {event.type.replace('_', ' ')}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${
              isPlanned
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isPlanned ? (
              <>
                <Clock className="w-3 h-3 text-blue-600" />
                <span>Planificat</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Consemnat</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Stats Box */}
      <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
            {isPlanned ? 'Data programată' : 'Data efectuării'}
          </span>
          <div className="font-semibold text-slate-900 mt-0.5">
            {new Date(event.eventDate).toLocaleDateString('ro-RO')}
          </div>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Durată</span>
          <div className="font-semibold text-slate-900 mt-0.5">{event.durationHours} ore</div>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Participanți</span>
          <div className="font-semibold text-slate-900 mt-0.5">{event.participants.length} salariați</div>
        </div>
      </div>

      {/* Instructor / CLM info */}
      <div className="text-xs text-slate-500">
        CLM: <strong className="text-slate-700">{event.instructorName}</strong>
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action shortcuts toolbar */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* PV Instruire download */}
          <button
            type="button"
            onClick={() =>
              handleDownload('pv', {
                templateCode: pvTemplateCode,
                clientId: event.clientId,
                trainingEventId: event.id,
              })
            }
            disabled={downloadingDoc === 'pv'}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition disabled:opacity-50"
            title="Descarcă Proces-Verbal Colectiv de Instruire"
          >
            {downloadingDoc === 'pv' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>PV Instruire</span>
          </button>

          {/* Tematica download */}
          <button
            type="button"
            onClick={() =>
              handleDownload('tematica', {
                templateCode: thematicTemplateCode,
                clientId: event.clientId,
              })
            }
            disabled={downloadingDoc === 'tematica'}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition disabled:opacity-50"
            title="Descarcă Tematica de Instruire"
          >
            {downloadingDoc === 'tematica' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span>Tematică</span>
          </button>
        </div>

        {/* Accordion toggle for participants */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded hover:bg-slate-50 transition"
        >
          <span>Participanți ({event.participants.length})</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable participants list with individual training sheet download */}
      {isExpanded && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Fișe Individuale Participanți
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
            {event.participants.map((p) => {
              const fullName = `${p.employee.lastName} ${p.employee.firstName}`.trim();
              const jobTitle = p.employee.currentJob?.title || 'Fără funcție';
              const docKey = `emp-${p.employeeId}`;

              return (
                <div key={p.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{fullName}</span>
                    <span className="text-slate-400 ml-1.5 text-[11px]">({jobTitle})</span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(docKey, {
                        templateCode: individualSheetTemplateCode,
                        clientId: event.clientId,
                        employeeId: p.employeeId,
                        trainingEventId: event.id,
                      })
                    }
                    disabled={downloadingDoc === docKey}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition disabled:opacity-50"
                    title={`Descarcă Fișă Individuală pentru ${fullName}`}
                  >
                    {downloadingDoc === docKey ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                    ) : (
                      <Download className="w-3 h-3 text-emerald-600" />
                    )}
                    <span>Fișă Individuală</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
