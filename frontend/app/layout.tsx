import type {Metadata, Viewport} from 'next';
import {headers} from 'next/headers';
import {ColorSchemeScript} from '@mantine/core';
import {getThemeScript} from '@/lib/theme/theme-script';
import './globals.css';
import {Providers} from './providers';

// Aura redesign typography.
//
// Keep the CSS variables stable without next/font/google so restricted CI,
// Vercel/Railway deploy hooks, and offline smoke builds do not fail while
// fetching Google Fonts. The actual font families are declared in globals.css
// with system fallbacks.
//   --font-sans     Open Sans   (body)
//   --font-display  Montserrat  (display / headings, 600–800)
//   --font-mono     Roboto Mono (all numerics — money, IDs, stats, counts; tabular-nums)

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

export default async function RootLayout({
                                           children,
                                         }: {
  children: React.ReactNode;
}) {
  // Per-request CSP nonce set by proxy.ts (middleware). In production this
  // stamps the two app-owned inline scripts below so they pass the nonce-based
  // CSP without 'unsafe-inline'. May be empty during static prerender, where
  // no middleware runs and no dynamic inline scripts are emitted.
  //
  // Only stamp the nonce in production. The dev CSP uses 'unsafe-inline'
  // (proxy.ts), so dev scripts don't need it — and stamping a per-request nonce
  // in dev triggers a React hydration mismatch when HMR keeps the stale document
  // (nonce A) while a re-render reads a freshly generated per-request nonce
  // (nonce B). Prod renders a single request with a stable nonce, so it matches.
  const requestNonce = (await headers()).get('x-nonce') ?? undefined;
  const nonce = process.env.NODE_ENV === 'production' ? requestNonce : undefined;

  return (
    <html lang="en" suppressHydrationWarning>
    <head>
      {/* FOUC prevention — runs synchronously before paint */}
      <script nonce={nonce} dangerouslySetInnerHTML={{__html: getThemeScript()}}/>
      <ColorSchemeScript nonce={nonce} defaultColorScheme="dark"/>
    </head>
    <body
      className="font-sans overflow-x-hidden antialiased bg-[var(--bg-page)] text-[var(--text-primary)]">
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
