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
  Sun,
  Moon,
} from 'lucide-react';
import type { UserRole } from '@/lib/auth';
import { ROLE_CONFIG, RoleMeta } from '@/lib/rbac';
import { ChangePasswordModal } from '@/components/change-password-modal';

interface NavbarProps {
  currentUser?: {
    id: string;
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
  const [pendingSwitchRole, setPendingSwitchRole] = useState<UserRole | null>(null);
  const [switchPassword, setSwitchPassword] = useState('');
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch (e) {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('theme', 'light');
      } catch (e) {}
    }
  };

  // Închide drawer-ul la schimbarea rutei
  useEffect(() => {
    setIsMobileDrawerOpen(false);
    setIsDropdownOpen(false);
  }, [pathname]);

  // Blochează scroll-ul paginii și permite închiderea cu Escape când meniul mobil este deschis
  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileDrawerOpen]);

  // Dacă utilizatorul este pe pagina de login, ascundem navbar-ul
  if (pathname === '/login') {
    return null;
  }

  const role: UserRole = currentUser?.role || 'ADMIN';
  const roleMeta: RoleMeta = ROLE_CONFIG[role];

  const executeRoleSwitch = async (targetRole: UserRole, password?: string) => {
    setIsSwitching(true);
    setSwitchError(null);
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, ...(password !== undefined ? { password } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (pendingSwitchRole) {
          setSwitchError(data.error || 'Parolă incorectă.');
        } else {
          setPendingSwitchRole(targetRole);
          setSwitchPassword('');
          setSwitchError(data.error || null);
        }
        return;
      }

      setIsDropdownOpen(false);
      setIsMobileDrawerOpen(false);
      setPendingSwitchRole(null);
      setSwitchPassword('');
      setSwitchError(null);
      if (targetRole === 'IGIENA') {
        router.push('/hygiene');
      } else if (targetRole === 'HR') {
        router.push('/employees');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err) {
      console.error('Error switching role:', err);
      setSwitchError('Eroare de conexiune la comutarea rolului.');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleRoleSwitch = async (targetRole: UserRole) => {
    if (targetRole === role) {
      setIsDropdownOpen(false);
      setIsMobileDrawerOpen(false);
      return;
    }

    if (role === 'ADMIN') {
      await executeRoleSwitch(targetRole);
      return;
    }

    setIsDropdownOpen(false);
    setIsMobileDrawerOpen(false);
    setSwitchPassword('');
    setSwitchError(null);
    setPendingSwitchRole(targetRole);
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
    <>
      <header className="bg-[#0b1120]/95 backdrop-blur-md text-white shadow-md sticky top-0 z-40 border-b border-slate-800/90">
      <div className="max-w-[1920px] 2xl:max-w-[98vw] mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Left Side: Mobile/Tablet Hamburger + Brand */}
        <div className="flex items-center gap-3">
          {/* Hamburger toggle button (visible on tablet & mobile < xl) */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="xl:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label="Deschide meniul principal"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo & Platform Name */}
          <Link href={role === 'IGIENA' ? '/hygiene' : '/'} className="flex items-center gap-2.5 group select-none">
            <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700/90 text-white font-semibold text-xs tracking-wider border border-slate-700/80 shadow-xs group-hover:border-blue-500/50 transition">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>SSM</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100 tracking-tight">Gestiune SSM</span>
              <span className="hidden sm:inline text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                SEPP
              </span>
            </div>
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
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="min-w-[38px] min-h-[38px] flex items-center justify-center p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            title={isDark ? 'Comută la tema luminoasă' : 'Comută la tema întunecată'}
            aria-label="Comută tema"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {/* Buton Import Excel (vizibil pentru HR și ADMIN pe sm+) */}
          {(role === 'ADMIN' || role === 'HR') && (
            <Link
              href="/imports/new"
              className="hidden sm:inline-flex min-h-[38px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 2xl:py-2 rounded-lg shadow transition items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>+ Import Excel</span>
            </Link>
          )}

          {/* Quick Role Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="min-h-[38px] flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition text-xs font-semibold text-slate-200 cursor-pointer"
              title="Schimbă rolul de acces"
            >
              <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold border ${roleMeta.bgColor} ${roleMeta.color} ${roleMeta.borderColor}`}>
                {roleMeta.badge}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-[#111a2e] border border-slate-700/80 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in duration-100">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Rol activ
                    </div>
                    <div className="text-xs text-slate-100 font-bold mt-0.5 truncate">
                      {roleMeta.label}
                    </div>
                  </div>

                  <div className="p-1.5 space-y-1">
                    {(['ADMIN', 'SSM', 'HR', 'IGIENA'] as UserRole[]).map((r) => {
                      const isSelected = r === role;
                      const meta = ROLE_CONFIG[r];
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleRoleSwitch(r)}
                          disabled={isSwitching}
                          className={`w-full min-h-[40px] flex items-center justify-between p-2 rounded-lg text-left transition ${
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
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsPasswordModalOpen(true);
                      }}
                      className="w-full min-h-[40px] flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition text-left font-medium"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                      <span>Schimbă Parola</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full min-h-[40px] flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition text-left font-medium"
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
      </header>

      {/* Backdrop pentru închiderea dropdown-ului de rol la click în afara header-ului */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {/* Mobile & Tablet Slide-over Drawer (< xl) — randat în afara <header> pentru a evita containing block-ul creat de backdrop-blur */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-[60] xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Meniu principal"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="fixed top-0 bottom-0 left-0 h-[100dvh] w-80 max-w-[85vw] bg-[#0f172a] text-white border-r border-slate-800 shadow-2xl flex flex-col z-[61] pb-[env(safe-area-inset-bottom)]">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
              <Link
                href={role === 'IGIENA' ? '/hygiene' : '/'}
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center gap-2 select-none"
              >
                <div className="flex items-center justify-center h-7 px-2.5 rounded-md bg-blue-700 text-white font-bold text-xs tracking-wider border border-blue-600/50 shadow-2xs">
                  SSM
                </div>
                <span className="font-semibold text-sm text-slate-100">Gestiune SSM</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Închide meniul"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Role Summary in Drawer */}
            <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-slate-400">Rol activ</span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border shrink-0 ${roleMeta.bgColor} ${roleMeta.color} ${roleMeta.borderColor}`}>
                {roleMeta.label}
              </span>
            </div>

            {/* Theme Switcher in Mobile Drawer */}
            <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-2">
                {isDark ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
                <span>Temă</span>
              </span>
              <button
                type="button"
                onClick={toggleTheme}
                className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
              >
                {isDark ? 'Întunecat' : 'Luminos'}
              </button>
            </div>

            {/* Drawer Nav Links */}
            <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-1">
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
                    className={`min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      link.active
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${link.active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {(role === 'ADMIN' || role === 'HR') && (
                <div className="pt-2">
                  <Link
                    href="/imports/new"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 transition"
                  >
                    <UploadCloud className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>+ Import Registru Excel</span>
                  </Link>
                </div>
              )}
            </nav>

            {/* Drawer Footer Actions */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsPasswordModalOpen(true);
                }}
                className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition text-left"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                <span>Schimbă Parola</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/40 transition text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Deconectare</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        userName={currentUser?.name}
        userRole={roleMeta.label}
      />

      {pendingSwitchRole && (
        <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full max-h-[92dvh] overflow-y-auto">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold">Comutare Rol de Acces</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingSwitchRole(null);
                  setSwitchPassword('');
                  setSwitchError(null);
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeRoleSwitch(pendingSwitchRole, switchPassword);
              }}
              className="p-5 space-y-4 text-slate-900"
            >
              <p className="text-xs text-slate-600">
                Introduceți parola pentru rolul{' '}
                <strong className="text-slate-900">{ROLE_CONFIG[pendingSwitchRole].label}</strong>.
              </p>

              {switchError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-xs">
                  {switchError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parolă *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={switchPassword}
                  onChange={(e) => setSwitchPassword(e.target.value)}
                  placeholder="Introduceți parola rolului țintă"
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSwitching}
                  onClick={() => {
                    setPendingSwitchRole(null);
                    setSwitchPassword('');
                    setSwitchError(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSwitching}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {isSwitching ? 'Se verifică...' : 'Confirmă Comutarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
