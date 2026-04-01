'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { BulkProcessingWizard } from '@/components/payroll/BulkProcessingWizard';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';

export default function BulkProcessingPage() {
  const router = useRouter();
  const { hasPermission, isReady } = usePermissions();

  useEffect(() => {
    if (!isReady) return;
    if (!hasPermission(Permissions.PAYROLL_PROCESS)) {
      router.replace('/payroll');
    }
  }, [isReady, hasPermission, router]);

  // Render nothing while RBAC state hydrates; the effect above will redirect if unauthorised.
  if (!isReady || !hasPermission(Permissions.PAYROLL_PROCESS)) {
    return null;
  }

  return (
    <AppLayout activeMenuItem="payroll">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold skeuo-emboss">
              Bulk Payroll Processing
            </h1>
            <p className="text-[var(--text-secondary)] mt-2 skeuo-deboss">
              Process payroll for multiple employees at once
            </p>
          </div>

          {/* Wizard Component */}
          <BulkProcessingWizard />
        </div>
      </div>
    </AppLayout>
  );
}
