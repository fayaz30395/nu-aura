'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout';
import {Loader2} from 'lucide-react';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

function AllocationRedirectState({message}: { message: string }) {
  return (
    <AppLayout>
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="card-aura flex items-center gap-2 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)] motion-reduce:animate-none"/>
          <span className="text-body-secondary">{message}</span>
        </div>
      </div>
    </AppLayout>
  );
}

export default function AllocationsPage() {
  const router = useRouter();
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();
  const hasAccess = hasAnyPermission(Permissions.ALLOCATION_VIEW, Permissions.PROJECT_VIEW, Permissions.ALLOCATION_MANAGE);

  useEffect(() => {
    if (permissionsReady && !hasAccess) {
      router.replace('/me/dashboard?denied=1');
      return;
    }
    if (permissionsReady && hasAccess) {
      router.replace('/allocations/summary');
    }
  }, [router, permissionsReady, hasAccess]);

  if (!permissionsReady) {
    return <AllocationRedirectState message="Preparing allocation workspace..."/>;
  }

  if (!hasAccess) {
    return <AllocationRedirectState message="Redirecting to your dashboard..."/>;
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="card-aura flex items-center gap-2 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)] motion-reduce:animate-none"/>
          <span className="text-body-secondary">Opening allocation summary...</span>
        </div>
      </div>
    </AppLayout>
  );
}
