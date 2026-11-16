import type {Metadata, Viewport} from 'next';
import {headers} from 'next/headers';
import {Geist, Geist_Mono} from 'next/font/google';
import {ColorSchemeScript} from '@mantine/core';
import {getThemeScript} from '@/lib/theme/theme-script';
import './globals.css';
import {Providers} from './providers';
import {PersistentShell} from '@/components/layout/PersistentShell';

// Brand fonts are fetched once at build time and self-hosted from /_next/static,
// so the CSP (font-src 'self') is unchanged. The variables are consumed by the
// --font-sans / --font-display / --font-mono stacks in globals.css, which keep
// system fallbacks. Builds therefore need network access to Google Fonts.
const fontSans = Geist({subsets: ['latin'], display: 'swap', variable: '--font-brand-sans'});
const fontMono = Geist_Mono({subsets: ['latin'], display: 'swap', variable: '--font-brand-mono'});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://hrms-frontend-vert.vercel.app'),
  title: {
    template: '%s | NU-AURA',
    default: 'NU-AURA — Unified People Platform',
  },
  description: 'Unified People Platform by NULogic: HR, Recruitment, Performance & Knowledge Management',
  icons: {
    icon: '/images/nulogic-icon.svg',
    apple: '/images/nulogic-icon.svg',
  },
  openGraph: {
    siteName: 'NU-AURA',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@nulogic',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F5F5F7',
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable}`}
    >
    <head>
      {/* FOUC prevention — runs synchronously before paint */}
      <script nonce={nonce} dangerouslySetInnerHTML={{__html: getThemeScript()}}/>
      <ColorSchemeScript nonce={nonce} defaultColorScheme="light"/>
    </head>
    <body
      className="font-sans overflow-x-hidden antialiased bg-[var(--bg-page)] text-[var(--text-primary)]">
    {/* Skip link targets #main-content, the <main> inside the persistent
        shell, so it bypasses the product rail + nav panel. */}
    <a
      href="#main-content"
      className="skip-link"
    >
      Skip to content
    </a>
    <Providers>
      <PersistentShell>{children}</PersistentShell>
    </Providers>
    </body>
    </html>
  );
}
