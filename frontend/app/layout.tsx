import type {Metadata, Viewport} from 'next';
import {ColorSchemeScript} from '@mantine/core';
import {Montserrat, Open_Sans, Roboto_Mono} from 'next/font/google';
import {getThemeScript} from '@/lib/theme/theme-script';
import './globals.css';
import {Providers} from './providers';

// Aura redesign typography (self-hosted via next/font — no external Google CDN call):
//   --font-sans     Open Sans   (body)
//   --font-display  Montserrat  (display / headings, 600–800)
//   --font-mono     Roboto Mono (all numerics — money, IDs, stats, counts; tabular-nums)
const bodyTypeface = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

const displayTypeface = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  // Non-critical headings face — keep available, but stop eagerly preloading
  // so only the body family (Open Sans) competes for the critical-path budget.
  preload: false,
  variable: '--font-display',
});

const monoTypeface = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  // Numerics-only face — not above-the-fold critical; load without eager preload.
  preload: false,
  variable: '--font-mono',
});

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
    <body
      className={`${bodyTypeface.variable} ${displayTypeface.variable} ${monoTypeface.variable} font-sans overflow-x-hidden antialiased bg-[var(--bg-page)] text-[var(--text-primary)]`}>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:bg-accent-600 focus:text-white focus:rounded"
    >
      Skip to content
    </a>
    <Providers>
      <div id="main-content" className="relative fade-slide-up">
        <div className="stagger-children">
          {children}
        </div>
      </div>
    </Providers>
    </body>
    </html>
  );
}
