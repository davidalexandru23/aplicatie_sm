'use client';

import React, { useState, useEffect } from 'react';
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
  Menu,
  X,
  Building2,
  BookOpen,
  ShieldAlert,
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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Închide drawer-ul la schimbarea rutei
  useEffect(() => {
    setIsMobileDrawerOpen(false);
    setIsDropdownOpen(false);
  }, [pathname]);

  // Dacă utilizatorul este pe pagina de login, ascundem navbar-ul
  if (pathname === '/login') {
    return null;
  }

  const role: UserRole = currentUser?.role || 'ADMIN';
  const roleMeta: RoleMeta = ROLE_CONFIG[role];

  const handleRoleSwitch = async (targetRole: UserRole) => {
    if (targetRole === role) {
      setIsDropdownOpen(false);
      setIsMobileDrawerOpen(false);
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
        setIsMobileDrawerOpen(false);
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

  const navLinks = [
    {
      href: '/clients',
      label: 'Clienți',
      icon: Building2,
      visible: true,
      active: pathname.startsWith('/clients'),
    },
    {
      href: '/employees',
      label: role === 'SSM' ? 'Angajați (SSM)' : role === 'HR' ? 'Angajați (HR)' : role === 'IGIENA' ? 'Angajați (Igienă)' : 'Angajați',
      icon: Users,
      visible: true,
      active: pathname.startsWith('/employees'),
    },
    {
      href: '/risk-assessments',
      label: 'Evaluare Riscuri',
      icon: ShieldAlert,
      visible: role === 'ADMIN' || role === 'SSM',
      active: pathname.startsWith('/risk-assessments'),
    },
    {
      href: '/trainings',
      label: 'Instruiri & IPSSM',
      icon: BookOpen,
      visible: role === 'ADMIN' || role === 'SSM',
      active: pathname.startsWith('/trainings'),
    },
    {
      href: '/hygiene',
      label: 'Cursuri Igienă',
      icon: Award,
      visible: role === 'ADMIN' || role === 'IGIENA',
      active: pathname.startsWith('/hygiene'),
      highlight: true,
    },
    {
      href: '/templates',
      label: 'Catalog Șabloane',
      icon: FileText,
      visible: role === 'ADMIN' || role === 'SSM' || role === 'HR',
      active: pathname.startsWith('/templates'),
    },
    {
      href: '/documents',
      label: 'Documente Emise',
      icon: FileText,
      visible: true,
      active: pathname.startsWith('/documents'),
    },
    {
      href: '/settings',
      label: role === 'IGIENA' ? 'Setări Furnizor Igienă' : role === 'SSM' ? 'Setări Specialiști SSM' : 'Setări SEPP',
      icon: Settings,
      visible: true,
      active: pathname.startsWith('/settings'),
    },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50 border-b border-slate-800">
      <div className="max-w-[1920px] 2xl:max-w-[98vw] mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Left Side: Mobile/Tablet Hamburger + Brand */}
        <div className="flex items-center gap-3">
          {/* Hamburger toggle button (visible on tablet & mobile < xl) */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="xl:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Deschide meniul principal"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo & Platform Name */}
          <Link href={role === 'IGIENA' ? '/hygiene' : '/'} className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-2">
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs sm:text-sm font-black shadow-sm">SSM</span>
            <span className="hidden xs:inline truncate">Platformă Internă</span>
          </Link>

          {/* Desktop Navigation Links (visible on xl and up: >= 1280px) */}
          <nav className="hidden xl:flex items-center space-x-1 text-xs 2xl:text-sm font-medium ml-4">
            {navLinks.filter(l => l.visible).map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1.5 2xl:px-3 2xl:py-2 rounded-md transition flex items-center gap-1.5 ${
                    link.active
                      ? link.highlight
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold'
                        : 'bg-slate-800 text-white font-semibold'
                      : link.highlight
                      ? 'text-emerald-400 hover:bg-slate-800'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {link.highlight && <Icon className="w-3.5 h-3.5" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Quick Action & Role Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Buton Import Excel (vizibil pentru HR și ADMIN pe sm+) */}
          {(role === 'ADMIN' || role === 'HR') && (
            <Link
              href="/imports/new"
              className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 2xl:py-2 rounded-lg shadow transition items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>+ Import Excel</span>
            </Link>
          )}

          {/* Quick Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition text-xs font-semibold text-slate-200"
              title="Click pentru schimbare rapidă rol (RBAC)"
            >
              <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold ${roleMeta.bgColor} ${roleMeta.color}`}>
                {roleMeta.badge}
              </span>
              <span className="hidden md:inline font-medium text-slate-300 max-w-[120px] truncate">
                {currentUser?.name?.split(' ')[0] || 'Utilizator'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in duration-100">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Comutare Rol de Acces
                  </div>
                  <div className="text-xs text-slate-200 font-bold mt-0.5 truncate">
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

      {/* Mobile & Tablet Slide-over Drawer (< xl) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col z-50">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/40">
              <Link
                href={role === 'IGIENA' ? '/hygiene' : '/'}
                onClick={() => setIsMobileDrawerOpen(false)}
                className="font-bold text-base tracking-tight flex items-center gap-2"
              >
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-black shadow-sm">SSM</span>
                <span>Platformă Internă</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current User Summary in Drawer */}
            <div className="px-4 py-3 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">
                  {currentUser?.name || 'Utilizator'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {currentUser?.email || 'admin@ssm.ro'}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleMeta.bgColor} ${roleMeta.color}`}>
                {roleMeta.badge}
              </span>
            </div>

            {/* Drawer Nav Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                Meniu Principal
              </div>
              {navLinks.filter(l => l.visible).map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      link.active
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {(role === 'ADMIN' || role === 'HR') && (
                <div className="pt-2">
                  <Link
                    href="/imports/new"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 transition"
                  >
                    <UploadCloud className="w-4 h-4 text-blue-400" />
                    <span>+ Import Registru Excel</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsPasswordModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition text-left"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                <span>Schimbă Parola</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/40 transition text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Deconectare</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        userName={currentUser?.name}
        userRole={roleMeta.label}
      />
    </header>
  );
}
