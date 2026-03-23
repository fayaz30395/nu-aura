'use client';

import { AppLayout } from '@/components/layout';
import { Building2 } from 'lucide-react';

export default function CompliancePage() {
  return (
    <AppLayout activeMenuItem="admin">
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-12 shadow-sm">
            <Building2 className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Compliance</h1>
            <p className="text-[var(--text-secondary)]">
              Manage statutory compliance, labor law adherence, and regulatory reporting. PF, ESI, PT, and TDS management coming soon.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
