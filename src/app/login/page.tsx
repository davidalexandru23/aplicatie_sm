'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ShieldCheck, 
  Shield, 
  Users, 
  Award, 
  Lock, 
  ArrowRight, 
  AlertCircle,
  Building2,
  KeyRound
} from 'lucide-react';
import { UserRole } from '@/lib/auth';

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
    title: 'CLM',
    badge: 'CLM',
    subtitle: 'Cursuri & Adeverințe',
    desc: 'Evidență sesiuni de instruire, cataloage examen, registru salariați, emitere adeverințe DSP (numere anuale & BIS) și predare diplome.',
    icon: Award,
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [username, setUsername] = useState('dev');
  const [password, setPassword] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (
    e?: React.FormEvent,
    customCreds?: { role: UserRole; user?: string; pass?: string }
  ) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

    const loginRole = customCreds ? customCreds.role : selectedRole;
    const loginUsername = customCreds?.user || username;
    const loginPassword = customCreds?.pass || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
          role: loginRole,
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
          Selectați rolul dorit pentru conectare directă sau introduceți datele de acces în formularul de mai jos.
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-rose-800 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROLES.map((r) => {
          const IconComp = r.icon;
          return (
            <button
              key={r.role}
              type="button"
              onClick={() => handleLogin(undefined, { role: r.role, user: 'dev', pass: '1234' })}
              disabled={isLoading}
              className="text-left p-6 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition duration-150 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-blue-600 group-hover:bg-blue-50 transition">
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
                <span className="font-mono text-slate-400">utilizator: dev</span>
                <span className="inline-flex items-center gap-1 font-semibold text-blue-600 group-hover:text-blue-700">
                  Conectare {r.badge} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Formular Manual de Conectare */}
      <div className="max-w-md mx-auto w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <KeyRound className="w-4 h-4 text-blue-600" />
          <span>Formular Conectare Manuală</span>
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
              <option value="IGIENA">CLM (Cursuri & Adeverințe)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nume Utilizator *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="dev"
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
              placeholder="••••"
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
