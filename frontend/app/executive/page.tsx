'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowRight, Building2} from 'lucide-react';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

/** /executive redirect — the actual page lives at /dashboards/executive */
export default function ExecutiveRedirectPage() {
  const router = useRouter();
  const {hasPermission, isPermissionReady} = usePermissions();

  const hasAccess = hasPermission(Permissions.DASHBOARD_EXECUTIVE);

  // DASHBOARD_EXECUTIVE differs from the route config (ANALYTICS_VIEW / SYSTEM_ADMIN), so this check stays.
  useEffect(() => {
    if (!isPermissionReady) return;
    if (!hasAccess) {
      router.replace('/me/dashboard?denied=1');
    } else {
      router.replace('/dashboards/executive');
    }
  }, [isPermissionReady, hasAccess, router]);

  return (
    <div className="mx-auto w-full max-w-xl p-4 sm:p-6">
      <section role="status" className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
            <Building2 className="h-4 w-4" aria-hidden="true"/>
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-sm font-semibold text-text-1">Executive route</h1>
            <p className="text-xs text-text-2">
              {hasAccess ? 'Redirecting to the executive dashboard.' : 'Access restricted, routing you to your dashboard.'}
            </p>
          </div>
        </div>
        <Link
          href={hasAccess ? '/dashboards/executive' : '/me/dashboard'}
          className="mt-4 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden="true"/>
        </Link>
        {!hasAccess && (
          <p className="mt-2 text-xs text-text-3">You do not have executive dashboard rights.</p>
        )}
      </section>
    </div>
  );
}
