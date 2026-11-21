'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Shield, 
  Users, 
  Award, 
  Settings, 
  FileText, 
  UploadCloud, 
  ChevronDown, 
  LogOut, 
  RefreshCw,
  Check,
  KeyRound,
} from 'lucide-react';
import { UserRole } from '@/lib/auth';
import { ROLE_CONFIG, RoleMeta } from '@/lib/rbac';
import { ChangePasswordModal } from '@/components/change-password-modal';

interface NavbarProps {
  currentUser?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  } | null;
}

export function Navbar({ currentUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Dacă utilizatorul este pe pagina de login, ascundem navbar-ul
  if (pathname === '/login') {
    return null;
  }

  const role: UserRole = currentUser?.role || 'ADMIN';
  const roleMeta: RoleMeta = ROLE_CONFIG[role];

  const handleRoleSwitch = async (targetRole: UserRole) => {
    if (targetRole === role) {
      setIsDropdownOpen(false);
      return;
    }
    setIsSwitching(true);
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole }),
      });
      if (res.ok) {
        setIsDropdownOpen(false);
        // Redirecționare către ruta optimă a rolului
        if (targetRole === 'IGIENA') {
          router.push('/hygiene');
        } else {
          router.push('/');
        }
        router.refresh();
      }
    } catch (err) {
      console.error('Error switching role:', err);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50 border-b border-slate-800">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo & Platform Name */}
        <div className="flex items-center space-x-6">
          <Link href={role === 'IGIENA' ? '/hygiene' : '/'} className="font-bold text-lg tracking-tight flex items-center gap-2">
            <span className="bg-blue-600 text-white px-2.5 py-1 rounded text-sm font-black shadow-sm">SSM</span>
            <span>Platformă Internă</span>
          </Link>

          {/* Dynamic Navigation Links based on Role */}
          <nav className="hidden md:flex space-x-1 text-sm font-medium">
            {/* Rute pentru ADMIN, SSM, HR & IGIENA */}
            <Link
              href="/clients"
              className={`px-3 py-2 rounded-md transition ${
                pathname.startsWith('/clients') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Clienți
            </Link>
            <Link
              href="/employees"
              className={`px-3 py-2 rounded-md transition ${
                pathname.startsWith('/employees') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {role === 'SSM' ? 'Angajați (SSM)' : role === 'HR' ? 'Angajați (HR)' : role === 'IGIENA' ? 'Angajați (Igienă)' : 'Angajați'}
            </Link>

            {/* Rute specifice SSM & ADMIN */}
            {(role === 'ADMIN' || role === 'SSM') && (
              <>
                <Link
                  href="/risk-assessments"
                  className={`px-3 py-2 rounded-md transition ${
                    pathname.startsWith('/risk-assessments') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Evaluare Riscuri
                </Link>
                <Link
                  href="/trainings"
                  className={`px-3 py-2 rounded-md transition ${
                    pathname.startsWith('/trainings') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Instruiri & IPSSM
                </Link>
              </>
            )}

            {/* Cursuri Igienă - accesibil pentru IGIENA și ADMIN */}
            {(role === 'ADMIN' || role === 'IGIENA') && (
              <Link
                href="/hygiene"
                className={`px-3 py-2 rounded-md transition flex items-center gap-1.5 ${
                  pathname.startsWith('/hygiene') ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold' : 'text-emerald-400 hover:bg-slate-800'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Cursuri Igienă</span>
              </Link>
            )}

            {/* Șabloane & Documente */}
            {(role === 'ADMIN' || role === 'SSM' || role === 'HR') && (
              <Link
                href="/templates"
                className={`px-3 py-2 rounded-md transition ${
                  pathname.startsWith('/templates') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                Catalog Șabloane
              </Link>
            )}

            <Link
              href="/documents"
              className={`px-3 py-2 rounded-md transition ${
                pathname.startsWith('/documents') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Documente Emise
            </Link>

            {/* Setări */}
            <Link
              href="/settings"
              className={`px-3 py-2 rounded-md transition ${
                pathname.startsWith('/settings') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {role === 'IGIENA' ? 'Setări Furnizor Igienă' : role === 'SSM' ? 'Setări Specialiști SSM' : 'Setări SEPP'}
            </Link>
          </nav>
        </div>

        {/* Right Side: Import Button & Role Switcher */}
        <div className="flex items-center space-x-3">
          {/* Buton Import Excel (vizibil pentru HR și ADMIN) */}
          {(role === 'ADMIN' || role === 'HR') && (
            <Link
              href="/imports/new"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow transition flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>+ Import Excel</span>
            </Link>
          )}

          {/* Quick Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition text-xs font-semibold text-slate-200"
              title="Click pentru schimbare rapidă rol (RBAC)"
            >
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${roleMeta.bgColor} ${roleMeta.color}`}>
                {roleMeta.badge}
              </span>
              <span className="hidden sm:inline font-medium text-slate-300 max-w-[130px] truncate">
                {currentUser?.name?.split(' ')[0] || 'Utilizator'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Comutare Rol de Acces
                  </div>
                  <div className="text-xs text-slate-200 font-bold mt-0.5">
                    {currentUser?.name || 'Utilizator Conectat'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    utilizator: dev
                  </div>
                </div>

                <div className="p-1.5 space-y-1">
                  {(['ADMIN', 'SSM', 'HR', 'IGIENA'] as UserRole[]).map((r) => {
                    const isSelected = r === role;
                    const meta = ROLE_CONFIG[r];
                    return (
                      <button
                        key={r}
                        onClick={() => handleRoleSwitch(r)}
                        disabled={isSwitching}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition ${
                          isSelected
                            ? 'bg-slate-800 text-white font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${meta.bgColor} ${meta.color}`}>
                            {meta.badge}
                          </span>
                          <span>{meta.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>

                <div className="p-1.5 border-t border-slate-800 space-y-0.5">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsPasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition text-left font-medium"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                    <span>Schimbă Parola</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition text-left font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Deconectare</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        userName={currentUser?.name}
        userRole={roleMeta.label}
      />
    </header>
  );
}
