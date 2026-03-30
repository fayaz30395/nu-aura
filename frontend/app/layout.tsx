import type { Metadata, Viewport } from 'next';
import { Montserrat, Open_Sans, Roboto_Mono } from 'next/font/google';
import { ColorSchemeScript } from '@mantine/core';
import { getThemeScript } from '@/lib/theme/theme-script';
import './globals.css';
import { Providers } from './providers';

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NU-AURA by NULogic — Infinite Innovation',
  description: 'Unified People Platform by NULogic — HR, Recruitment, Performance & Knowledge Management',
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
      <body className={`${openSans.variable} ${montserrat.variable} ${robotoMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
