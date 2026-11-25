'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Shield,
  Users,
  Award,
  Lock,
  Check,
  AlertCircle,
  Building2,
  KeyRound,
} from 'lucide-react';
import type { UserRole } from '@/lib/auth';

interface RoleCard {
  role: UserRole;
  title: string;
  badge: string;
  subtitle: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
}

const ROLES: RoleCard[] = [
  {
    role: 'ADMIN',
    title: 'Admin Master',
    badge: 'Master',
    subtitle: 'Administrare completă & gestiune clienți',
    desc: 'Acces integral la toate modulele: fișe salariați, generare documente, setări SEPP și cataloage.',
    icon: Shield,
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    role: 'SSM',
    title: 'Specialist SSM',
    badge: 'SSM',
    subtitle: 'Protecția muncii, riscuri & instruiri',
    desc: 'Gestionare evaluări de risc profesional, instruiri periodice SSM/PSI, mărimi echipamente EIP și decizii interne.',
    icon: ShieldCheck,
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  {
    role: 'HR',
    title: 'Resurse Umane',
    badge: 'HR',
    subtitle: 'Dosare salariați & contracte CIM',
    desc: 'Gestionare dosar complet de personal, contracte de muncă, evidență medicală și import registru Excel.',
    icon: Users,
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  {
    role: 'IGIENA',
    title: 'Inspector Igienă',
    badge: 'Igienă',
    subtitle: 'Cursuri, sesiuni examen DSP & adeverințe',
    desc: 'Evidență sesiuni de instruire, cataloage examen, registru salariați, emitere adeverințe DSP (numere anuale & BIS) și predare diplome.',
    icon: Award,
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [username, setUsername] = useState('');
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
          username: username.trim(),
          password,
          role: selectedRole,
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
    <div className="w-full max-w-5xl mx-auto py-8 space-y-8">
      {/* Header Enterprise */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-semibold border border-slate-200">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Sistem Integrat de Management SSM &amp; Igienă</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Autentificare în Sistem
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Selectați profilul de acces și introduceți utilizatorul și parola primite de la administrator.
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-rose-800 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Selector Grid (fără autentificare 1-click) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROLES.map((r) => {
          const IconComp = r.icon;
          const isSelected = selectedRole === r.role;
          return (
            <button
              key={r.role}
              type="button"
              onClick={() => setSelectedRole(r.role)}
              disabled={isLoading}
              className={`text-left p-6 rounded-xl bg-white border transition duration-150 flex flex-col justify-between group cursor-pointer ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200 hover:border-blue-400 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2.5 rounded-lg border transition ${
                      isSelected
                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                        : 'bg-slate-50 border-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${r.badgeColor}`}>
                    {r.badge}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition">
                  {r.title}
                </div>
                <div className="text-xs font-medium text-slate-600 mt-0.5">
                  {r.subtitle}
                </div>
                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                  {r.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Profil rol: {r.role}</span>
                {isSelected ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                    <Check className="w-3.5 h-3.5" /> Selectat
                  </span>
                ) : (
                  <span className="font-medium text-slate-500 group-hover:text-blue-600">
                    Selectează rolul
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Formular Conectare */}
      <div className="max-w-md mx-auto w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <KeyRound className="w-4 h-4 text-blue-600" />
          <span>Date de Autentificare</span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rol de Acces *
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ADMIN">Admin Master</option>
              <option value="SSM">Specialist SSM</option>
              <option value="HR">Resurse Umane (HR)</option>
              <option value="IGIENA">Inspector Igienă (Cursuri &amp; Adeverințe)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Utilizator sau Email *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: admin sau admin@ssm.ro"
              autoComplete="username"
              required
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parolă *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Introduceți parola"
              autoComplete="current-password"
              required
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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
