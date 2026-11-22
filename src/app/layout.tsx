import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import { Navbar } from '@/components/navbar';
import { verifySessionToken, SESSION_COOKIE_NAME, UserRole } from '@/lib/auth';

const inter = Inter({ 
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

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
    <html lang="ro" className="h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col`}>
        {/* Dynamic RBAC Navbar */}
        <Navbar currentUser={currentUser} />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-[1920px] 2xl:max-w-[98vw] min-w-0 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 transition-all">
          {children}
        </main>
      </body>
    </html>
  );
}
