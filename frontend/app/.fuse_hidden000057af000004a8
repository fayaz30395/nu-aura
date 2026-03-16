import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Fraunces } from 'next/font/google';
import { ColorSchemeScript } from '@mantine/core';
import { getThemeScript } from '@/lib/theme/theme-script';
import './globals.css';
import { Providers } from './providers';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NU Aura - HRMS Platform',
  description: 'Modern Human Resource Management System',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FOUC prevention — runs synchronously before paint */}
        <script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body className={`${spaceGrotesk.variable} ${fraunces.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
