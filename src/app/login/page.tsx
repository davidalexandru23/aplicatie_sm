'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  AlertCircle,
  Building2,
  KeyRound,
  ChevronDown,
} from 'lucide-react';
import type { UserRole } from '@/lib/auth';
import { ROLE_CONFIG } from '@/lib/rbac';

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'SSM', label: 'Specialist SSM' },
  { value: 'HR', label: 'Resurse Umane (HR)' },
  { value: 'IGIENA', label: 'Inspector Igienă' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Autentificare eșuată');
      }

      if (data.user?.role === 'IGIENA') {
        router.push('/hygiene');
      } else if (data.user?.role === 'HR' && redirectPath === '/') {
        router.push('/employees');
      } else {
        router.push(redirectPath);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-10 sm:py-16 px-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-semibold border border-slate-200">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Gestiune SSM &amp; Igienă</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Autentificare
        </h1>
        <p className="text-sm text-slate-500">
          Selectați rolul și introduceți parola.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-rose-800 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="login-role"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Rol de Acces *
            </label>
            <div className="relative">
              <select
                id="login-role"
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value as UserRole);
                  setError(null);
                }}
                disabled={isLoading}
                className="w-full min-h-[44px] pl-3.5 pr-10 py-2.5 text-base sm:text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              {ROLE_CONFIG[selectedRole].description}
            </p>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Parolă *
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Introduceți parola rolului"
              autoComplete="current-password"
              required
              disabled={isLoading}
              className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-blue-400" />
            <span>{isLoading ? 'Se conectează...' : 'Autentificare'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md mx-auto py-16 text-center text-sm text-slate-500">
          Se încarcă pagina de autentificare...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
