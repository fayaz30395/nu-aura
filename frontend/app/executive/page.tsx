'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

/** /executive redirect — the actual page lives at /dashboards/executive */
export default function ExecutiveRedirectPage() {
  const router = useRouter();
  const {hasPermission, isReady} = usePermissions();

  const hasAccess = hasPermission(Permissions.DASHBOARD_EXECUTIVE);

  useEffect(() => {
    if (!isReady) return;
    if (!hasAccess) {
      router.replace('/me/dashboard');
    } else {
      router.replace('/dashboards/executive');
    }
  }, [isReady, hasAccess, router]);

  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}
