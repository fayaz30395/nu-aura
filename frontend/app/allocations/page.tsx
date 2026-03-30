'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Loader2 } from 'lucide-react';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';

export default function AllocationsPage() {
  const router = useRouter();
  const { hasAnyPermission, isReady: permissionsReady } = usePermissions();
  const hasAccess = hasAnyPermission(Permissions.ALLOCATION_VIEW, Permissions.PROJECT_VIEW, Permissions.ALLOCATION_MANAGE);

  useEffect(() => {
    if (permissionsReady && !hasAccess) {
      router.replace('/me/dashboard');
      return;
    }
    if (permissionsReady && hasAccess) {
      router.replace('/allocations/summary');
    }
  }, [router, permissionsReady, hasAccess]);

  if (!permissionsReady || !hasAccess) return null;

  return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="skeuo-card p-8 flex items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading Allocations...</span>
        </div>
      </div>
    </AppLayout>
  );
}
