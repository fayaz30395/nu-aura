'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function CompliancePage() {
  return (
    <AppLayout activeMenuItem="compliance">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/20 dark:to-primary-800/10 mb-6">
          <ShieldCheck className="h-12 w-12 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] skeuo-emboss mb-3">
          Compliance
        </h1>
        <p className="text-[var(--text-secondary)] max-w-md mb-8">
          Manage statutory compliance, labor law adherence, and regulatory reporting.
          PF, ESI, PT, and TDS management coming soon.
        </p>
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-muted)] text-sm">
          <span>Expected in next release</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </AppLayout>
  );
}
