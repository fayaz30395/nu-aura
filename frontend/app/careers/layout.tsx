'use client';

import React from 'react';
import { DarkModeProvider } from '@/components/layout/DarkModeProvider';

/**
 * Careers Layout
 * 
 * This layout is used for public career pages. It does NOT include:
 * - Authenticated app shell
 * - Sidebar navigation
 * - Top navigation bar
 * 
 * It's a standalone marketing page layout.
 */
export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {children}
      </div>
    </DarkModeProvider>
  );
}
