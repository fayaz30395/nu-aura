import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import { ColorSchemeScript } from '@mantine/core';
import './globals.css';
import { Providers } from './providers';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
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
        <ColorSchemeScript />
      </head>
      <body className={`${outfit.variable} font-outfit dark:bg-surface-950`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
