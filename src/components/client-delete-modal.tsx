'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X, AlertTriangle, Lock, Eye, EyeOff, RefreshCw, AlertCircle } from 'lucide-react';

export interface ClientDeleteModalProps {
  client: {
    id: string;
    name: string;
    cui: string;
    employeesCount?: number;
  };
  variant?: 'button' | 'icon';
  redirectToClients?: boolean;
}

/**
 * Modal de confirmare pentru dezactivarea (soft-delete) unui client de către Administrator,
 * cu re-autentificare prin parolă. Păstrează datele în PostgreSQL (isActive = false).
 */
export function ClientDeleteModal({
  client,
  variant = 'button',
  redirectToClients = false,
}: ClientDeleteModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openModal = () => {
    setPassword('');
    setShowPassword(false);
    setErrorMessage(null);
    setIsOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    setPassword('');
    setShowPassword(false);
    setErrorMessage(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setIsOpen(false);
        setPassword('');
        setShowPassword(false);
        setErrorMessage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPassword('');
        throw new Error(data.error || 'Eroare la dezactivarea clientului.');
      }

      setIsOpen(false);
      setPassword('');
      setShowPassword(false);

      if (redirectToClients) {
        router.push('/clients');
      }
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Eroare la dezactivarea clientului.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={openModal}
          className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/35 px-2 py-1.5 rounded transition cursor-pointer"
          title="Șterge client (dezactivare cu parolă ADMIN)"
          aria-label={`Șterge client ${client.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="min-h-[40px] flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/35 text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span>Șterge Client</span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-client-title-${client.id}`}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[92dvh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-rose-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Trash2 className="w-5 h-5 text-rose-300 shrink-0" />
                <div className="min-w-0">
                  <h3 id={`delete-client-title-${client.id}`} className="text-sm font-bold leading-tight">
                    Ștergere Client
                  </h3>
                  <p className="text-xs text-rose-200 truncate mt-0.5">
                    {client.name} • CUI {client.cui}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Închide fereastra"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-rose-200 hover:text-white rounded-lg transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="space-y-1 leading-relaxed">
                  <p>
                    Clientul <strong>{client.name}</strong>
                    {typeof client.employeesCount === 'number' && client.employeesCount > 0
                      ? ` (împreună cu cei ${client.employeesCount} salariați și documentele asociate)`
                      : ' (împreună cu angajații și documentele asociate)'}{' '}
                    nu va mai fi afișat în aplicație.
                  </p>
                  <p className="text-[11px] text-rose-700">
                    Datele <strong>nu se șterg fizic</strong> — clientul devine inactiv (
                    <code className="font-mono">isActive = false</code>) în PostgreSQL și poate fi
                    restaurat ulterior din Coolify.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor={`admin-password-delete-${client.id}`}
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Parolă Administrator pentru confirmare *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id={`admin-password-delete-${client.id}`}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    autoFocus
                    disabled={isSubmitting}
                    placeholder="Introduceți parola de Administrator"
                    className="w-full pl-9 pr-11 py-2.5 min-h-[44px] text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[34px] min-w-[34px] flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !password.trim()}
                  className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Se dezactivează...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirmă Ștergerea</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
