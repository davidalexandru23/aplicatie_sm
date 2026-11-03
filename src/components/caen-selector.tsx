'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, AlertTriangle, ShieldCheck, Flame, Award, X } from 'lucide-react';
import { CAEN_CATALOG, CaenEntry, searchCaen, getCaenEntry, normalizeCaenCode } from '@/lib/caen-catalog';

export interface CaenSelectorProps {
  value?: string;
  onChange: (code: string, entry?: CaenEntry) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CaenSelector({
  value = '',
  onChange,
  className = '',
  placeholder = 'Caută cod CAEN sau denumire activitate (ex: 6201, restaurant, constructii)...',
  disabled = false,
}: CaenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [selectedEntry, setSelectedEntry] = useState<CaenEntry | undefined>(
    value ? getCaenEntry(value) : undefined
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state if prop value changes externally
  useEffect(() => {
    setSearchQuery(value);
    setSelectedEntry(value ? getCaenEntry(value) : undefined);
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEntries = searchCaen(searchQuery);

  const handleSelect = (entry: CaenEntry) => {
    setSelectedEntry(entry);
    setSearchQuery(entry.code);
    setIsOpen(false);
    onChange(entry.code, entry);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setSearchQuery(rawVal);
    setIsOpen(true);

    const norm = normalizeCaenCode(rawVal);
    const matched = getCaenEntry(norm);
    setSelectedEntry(matched);
    onChange(rawVal, matched);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedEntry(undefined);
    onChange('', undefined);
  };

  const getRiskClassBadge = (riskClass: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (riskClass) {
      case 'LOW':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            Risc Scăzut
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Risc Mediu
          </span>
        );
      case 'HIGH':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
            Risc Ridicat
          </span>
        );
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full text-xs pl-9 pr-16 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400 font-mono disabled:bg-slate-100 disabled:text-slate-400"
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {searchQuery && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
              title="Șterge selecția"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selected summary badge if matched */}
      {selectedEntry && (
        <div className="mt-1.5 p-2 rounded-lg bg-blue-50/70 border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 text-[11px]">
              CAEN {selectedEntry.code}
            </span>
            <span className="font-medium text-slate-800 text-[11px] line-clamp-1 max-w-xs sm:max-w-sm">
              {selectedEntry.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getRiskClassBadge(selectedEntry.riskClass)}
            <span className="text-[10px] text-slate-600 font-medium">
              SSM: {selectedEntry.defaultSsmIntervalMonths}m • PSI: {selectedEntry.defaultPsiIntervalMonths}m
            </span>
            {selectedEntry.requiresHygieneCourse && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Curs Igienă
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dropdown Options */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 text-center">
              Nicio activitate CAEN găsită pentru &ldquo;{searchQuery}&rdquo;. Poți tasta un cod CAEN personalizat.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => {
                const isSelected = selectedEntry?.code === entry.code;
                return (
                  <button
                    key={entry.code}
                    type="button"
                    onClick={() => handleSelect(entry)}
                    className={`w-full text-left p-3 hover:bg-slate-50 transition flex items-start justify-between gap-3 ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 text-xs bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {entry.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 leading-snug">
                          {entry.name}
                        </span>
                      </div>
                      {entry.division && (
                        <div className="text-[11px] text-slate-500">
                          {entry.division}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {getRiskClassBadge(entry.riskClass)}
                        <span className="text-[10px] text-slate-500">
                          Instruire SSM: <strong>{entry.defaultSsmIntervalMonths} luni</strong>
                        </span>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-[10px] text-slate-500">
                          PSI: <strong>{entry.defaultPsiIntervalMonths} luni</strong>
                        </span>
                        {entry.requiresHygieneCourse && (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            Necesită curs igienă ({entry.hygieneModule || 'Modul standard'})
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
