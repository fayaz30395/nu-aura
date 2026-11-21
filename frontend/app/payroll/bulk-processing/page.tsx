'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {BulkProcessingWizard} from '@/components/payroll/BulkProcessingWizard';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

export default function BulkProcessingPage() {
  const router = useRouter();
  const {hasPermission, isPermissionReady} = usePermissions();

  useEffect(() => {
    if (!isPermissionReady) return;
    if (!hasPermission(Permissions.PAYROLL_PROCESS)) {
      router.replace('/payroll');
    }
  }, [isPermissionReady, hasPermission, router]);

  // Render nothing while RBAC state hydrates; the effect above will redirect if unauthorised.
  if (!isPermissionReady || !hasPermission(Permissions.PAYROLL_PROCESS)) {
    return null;
  }

  return (
    <AppLayout activeMenuItem="payroll">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <PageHeader title="Bulk Payroll Processing" description="Process payroll for multiple employees at once"/>

          {/* Wizard Component */}
          <BulkProcessingWizard/>
        </div>
      </div>
    </AppLayout>
  );
}
