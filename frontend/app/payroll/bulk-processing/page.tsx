'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout';
import {BulkProcessingWizard} from '@/components/payroll/BulkProcessingWizard';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

export default function BulkProcessingPage() {
  const router = useRouter();
  const {hasPermission, isReady} = usePermissions();

  useEffect(() => {
    if (!isReady) return;
    if (!hasPermission(Permissions.PAYROLL_PROCESS)) {
      router.replace('/payroll');
    }
  }, [isReady, hasPermission, router]);

  // Show skeleton while RBAC state hydrates; the effect above will redirect if unauthorised.
  if (!isReady) {
    return (
      <AppLayout activeMenuItem="payroll">
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-[var(--skeleton-base)] rounded animate-pulse" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!hasPermission(Permissions.PAYROLL_PROCESS)) {
    return (
      <AppLayout activeMenuItem="payroll">
        <div className="p-6">
          <p className="text-danger-600">You do not have permission to process payroll.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="payroll">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-xl font-bold skeuo-emboss">
              Bulk Payroll Processing
            </h1>
            <p className="text-[var(--text-secondary)] mt-2 skeuo-deboss">
              Process payroll for multiple employees at once
            </p>
          </div>

          {/* Wizard Component */}
          <BulkProcessingWizard/>
        </div>
      </div>
    </AppLayout>
  );
}
