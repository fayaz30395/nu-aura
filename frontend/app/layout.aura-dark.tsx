/**
 * ROOT LAYOUT - Aura Dark Theme
 *
 * This is the updated root layout that enables the dark theme globally.
 * Replace your current app/layout.tsx with this file.
 */

import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import { ColorSchemeScript } from '@mantine/core';
import './globals.css';
import { Providers } from './providers';

// Import fonts with Next.js optimization
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NU Aura - HRMS Platform',
  description: 'Modern Human Resource Management System with Executive Analytics',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0B0F19', // Aura background color
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="dark" // ← Enable dark mode by default
      data-mantine-color-scheme="dark"
      suppressHydrationWarning
    >
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Enable dark mode by default
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-mantine-color-scheme', 'dark');
                try {
                  localStorage.setItem('darkMode', 'true');
                  localStorage.setItem('mantine-color-scheme-value', 'dark');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        style={{
          background: '#0B0F19', // Aura background
          color: '#F1F5F9',      // Aura text
        }}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
