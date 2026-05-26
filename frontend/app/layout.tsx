import type {Metadata, Viewport} from 'next';
import {ColorSchemeScript} from '@mantine/core';
import {getThemeScript} from '@/lib/theme/theme-script';
import './globals.css';
import {Providers} from './providers';

export const metadata: Metadata = {
  title: 'NU-AURA by NULogic: Infinite Innovation',
  description: 'Unified People Platform by NULogic: HR, Recruitment, Performance & Knowledge Management',
  icons: {
    icon: '/images/nulogic-icon.svg',
    apple: '/images/nulogic-icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563EB',
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
      <script dangerouslySetInnerHTML={{__html: getThemeScript()}}/>
      <ColorSchemeScript defaultColorScheme="dark"/>
    </head>
    <body className="font-sans overflow-x-hidden">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:bg-accent-600 focus:text-white focus:rounded"
    >
      Skip to content
    </a>
    <Providers>{children}</Providers>
    </body>
    </html>
  );
}
