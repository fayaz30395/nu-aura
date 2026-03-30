'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Building2 } from 'lucide-react';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';

export default function CompliancePage() {
  const { hasAnyPermission, isReady } = usePermissions();
  const router = useRouter();

  const hasAccess = hasAnyPermission(Permissions.COMPLIANCE_VIEW, Permissions.SYSTEM_ADMIN);

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  if (!isReady || !hasAccess) return null;

  return (
    <AppLayout activeMenuItem="admin">
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-12 shadow-sm">
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
