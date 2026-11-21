import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import { Navbar } from '@/components/navbar';
import { verifySessionToken, SESSION_COOKIE_NAME, UserRole } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistem Intern SSM & Cursuri Igienă',
  description: 'Gestiune dosar clienți, import registru și generare automată a celor 25 de documente SSM',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? verifySessionToken(sessionToken) : null;

  const currentUser = session
    ? {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      }
    : {
        id: 'default',
        email: 'admin@ssm.ro',
        name: 'Administrator Master',
        role: 'ADMIN' as UserRole,
      };

  return (
    <html lang="ro" className="h-full bg-slate-50 text-slate-900">
      <body className={`${inter.className} min-h-full flex flex-col`}>
        {/* Dynamic RBAC Navbar */}
        <Navbar currentUser={currentUser} />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
