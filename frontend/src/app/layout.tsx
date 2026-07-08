import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import ThemeBackground from '@/components/layout/ThemeBackground';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AI Data Enrichment Platform',
  description:
    'Production-grade AI-powered business data enrichment platform. Automate contact and company data gathering at scale.',
  keywords: ['AI', 'data enrichment', 'automation', 'business data', 'investor data'],
  authors: [{ name: 'AI Enrichment Platform' }],
  robots: 'noindex',
  openGraph: {
    title: 'AI Data Enrichment Platform',
    description: 'Automate business data gathering with AI',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
      </head>
      <body className={`${inter.variable} font-sans bg-[#030712] text-slate-100 antialiased`}>
        {/* 3D Particle Background */}
        <ThemeBackground />

        {/* App Shell */}
        <div className="relative z-10 flex min-h-screen">
          <Sidebar />

          <div className="flex-1 flex flex-col min-h-screen min-w-0">
            <TopBar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
