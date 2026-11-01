import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistem Intern SSM & Cursuri Igienă',
  description: 'Gestiune dosar clienți, import registru și generare automată a celor 25 de documente SSM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" className="h-full bg-slate-50 text-slate-900">
      <body className={`${inter.className} min-h-full flex flex-col`}>
        {/* Top Navbar */}
        <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <div className="flex items-center space-x-6">
              <Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-2">
                <span className="bg-blue-600 text-white px-2.5 py-1 rounded text-sm font-black shadow-sm">SSM</span>
                <span>Platformă Internă</span>
              </Link>
              <nav className="hidden md:flex space-x-1 text-sm font-medium">
                <Link href="/clients" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
                  Clienți
                </Link>
                <Link href="/employees" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
                  Angajați
                </Link>
                <Link href="/risk-assessments" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
                  Evaluare Riscuri
                </Link>
                <Link href="/trainings" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
                  Instruiri & IPSSM
                </Link>
                <Link href="/hygiene" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
                  Cursuri Igienă
                </Link>
                <Link href="/templates" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
                  Catalog Șabloane (25)
                </Link>
                <Link href="/documents" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
                  Documente Emise
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/imports/new"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded shadow transition flex items-center gap-1.5"
              >
                <span>+ Import Excel</span>
              </Link>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                Operator Intern
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 text-center">
          Sistem Intern de Gestiune SSM & Igienă • PostgreSQL & Prisma • Fără evaluări autonome AI • Semnare olografă pe hârtie
        </footer>
      </body>
    </html>
  );
}
