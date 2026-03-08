
import type { Metadata } from 'next';
import './globals.css';
import { prisma } from '@/lib/prisma';
import { ClientProviders } from '@/components/providers/client-providers';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
    return {
      title: settings?.academyName || 'FusionArte',
      description: settings?.welcomeMessage || 'Sistema de gestión integral para escuela de baile.',
      icons: {
        icon: settings?.faviconUrl || '/favicon.ico',
      },
      manifest: '/manifest.json',
      themeColor: '#673AB7',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
    };
  } catch (e) {
    return {
      title: 'FusionArte',
      description: 'Sistema de gestión integral para escuela de baile.',
    };
  }
}

import { Montserrat, Playfair_Display } from 'next/font/google';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${montserrat.variable} ${playfair.variable}`}>
      <head>
      </head>
      <body className="font-sans antialiased text-foreground bg-background selection:bg-gold/30 overflow-x-hidden">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
