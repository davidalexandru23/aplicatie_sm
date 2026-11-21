'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Users, Award, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

const QUICK_ROLES = [
  {
    role: 'ADMIN',
    email: 'admin@ssm.ro',
    password: 'admin123',
    title: 'Admin Master',
    badge: '👑 Master',
    subtitle: 'Vede și gestionează tot sistemul',
    desc: 'Acces total fără restricții: dosare, setări SEPP, generări, importuri, cataloage.',
    color: 'from-amber-500 to-amber-700',
    borderColor: 'hover:border-amber-500',
    iconBg: 'bg-amber-100 text-amber-700',
    icon: Shield,
  },
  {
    role: 'SSM',
    email: 'ssm@ssm.ro',
    password: 'ssm123',
    title: 'Specialist SSM',
    badge: '🛡️ SSM',
    subtitle: 'Protecția muncii, riscuri & instruiri',
    desc: 'Vede post, nume, adresă, EIP, riscuri, instruiri. FĂRĂ CNP și fără detalii salariale/CIM.',
    color: 'from-blue-600 to-indigo-700',
    borderColor: 'hover:border-blue-500',
    iconBg: 'bg-blue-100 text-blue-700',
    icon: Shield,
  },
  {
    role: 'HR',
    email: 'hr@ssm.ro',
    password: 'hr123',
    title: 'Resurse Umane',
    badge: '📋 HR',
    subtitle: 'Dosar personal, CIM & Medicină',
    desc: 'Vede CNP complet, contracte muncă (CIM), salarii, fișe medicale, import Excel registru.',
    color: 'from-indigo-600 to-purple-700',
    borderColor: 'hover:border-indigo-500',
    iconBg: 'bg-indigo-100 text-indigo-700',
    icon: Users,
  },
  {
    role: 'IGIENA',
    email: 'igiena@ssm.ro',
    password: 'igiena123',
    title: 'Inspector Igienă',
    badge: '🧼 Igienă',
    subtitle: 'Cursuri, sesiuni examen DSP & adeverințe',
    desc: 'Acces dedicat pe sesiuni igienă, cataloage, adeverințe, sufix BIS, predare diplome, module 3 ani.',
    color: 'from-emerald-600 to-teal-700',
    borderColor: 'hover:border-emerald-500',
    iconBg: 'bg-emerald-100 text-emerald-700',
    icon: Award,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customCreds?: { email: string; pass: string }) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

    const loginEmail = customCreds ? customCreds.email : email;
    const loginPassword = customCreds ? customCreds.pass : password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Autentificare eșuată');
      }

      // Redirecționare în funcție de rol sau calea salvată
      if (data.user?.role === 'IGIENA') {
        router.push('/hygiene');
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-black shadow-lg">
            <span>SSM & IGIENĂ</span>
            <span className="bg-blue-800 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded">RBAC v2.0</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Control Acces &amp; Autentificare pe Roluri
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Selectați un rol pentru conectare rapidă (1-click) sau introduceți credențialele dumneavoastră.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto bg-red-950/80 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Role Selection Cards */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
            Conectare Rapidă cu 1-Click (Mediu Intern &amp; Local)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUICK_ROLES.map((r) => {
              const IconComp = r.icon;
              return (
                <button
                  key={r.role}
                  onClick={() => handleLogin(undefined, { email: r.email, pass: r.password })}
                  disabled={isLoading}
                  className={`text-left p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 ${r.borderColor} hover:bg-slate-800 transition-all duration-200 group relative shadow-md hover:shadow-xl flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl ${r.iconBg}`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-700/80 text-slate-200 border border-slate-600">
                        {r.badge}
                      </span>
                    </div>
                    <div className="font-bold text-white text-base group-hover:text-blue-400 transition">
                      {r.title}
                    </div>
                    <div className="text-xs text-blue-300 font-medium mt-0.5">
                      {r.subtitle}
                    </div>
                    <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                      {r.desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400 group-hover:text-white transition">
                    <span className="font-mono text-[11px] text-slate-500">{r.email}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-400">
                      Conectează-te <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Manual Login Card */}
        <div className="max-w-md mx-auto w-full bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-lg backdrop-blur">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Sau introdu datele de conectare manual</span>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplu: admin@ssm.ro"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Parolă</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-2.5 rounded-lg shadow transition disabled:opacity-50"
            >
              {isLoading ? 'Se conectează...' : 'Autentificare'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
