import type { Metadata } from 'next';
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
  viewport: 'width=device-width, initial-scale=1',
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
      <body className={`${outfit.variable} font-outfit dark:bg-gray-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
