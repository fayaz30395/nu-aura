'use client';

import { AppLayout } from '@/components/layout';
import { DollarSign } from 'lucide-react';

export default function PayrollComponentsPage() {
  return (
    <AppLayout activeMenuItem="payroll">
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-12 shadow-sm">
            <DollarSign className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Payroll Components</h1>
            <p className="text-[var(--text-secondary)]">
              Configure earnings, deductions, and tax components such as Basic, HRA, DA, and more. Coming soon.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
