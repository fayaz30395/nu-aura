'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import Link from 'next/link';
import {Card, CardContent} from '@/components/ui/Card';
import {Loader2, ArrowRight, Building2} from 'lucide-react';

/** /executive redirect — the actual page lives at /dashboards/executive */
export default function ExecutiveRedirectPage() {
  const router = useRouter();
  const {hasPermission, isReady} = usePermissions();

  const hasAccess = hasPermission(Permissions.DASHBOARD_EXECUTIVE);

  useEffect(() => {
    if (!isReady) return;
    if (!hasAccess) {
      router.replace('/me/dashboard?denied=1');
    } else {
      router.replace('/dashboards/executive');
    }
  }, [isReady, hasAccess, router]);

  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-6">
      <Card className="card-aura fade-slide-up auth-delay-40 float-subtle">
        <CardContent className="py-10">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
              <Building2 className="h-5 w-5"/>
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Executive route</p>
              <p className="text-caption">
                {hasAccess ? 'Redirecting to the executive dashboard.' : 'Access restricted, routing you to your dashboard.'}
              </p>
            </div>
          </div>
          <Link
            href={hasAccess ? '/dashboards/executive' : '/me/dashboard'}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-800 transition-colors"
          >
            <Loader2 className="h-4 w-4 animate-spin"/>
            Continue
            <ArrowRight className="h-4 w-4"/>
          </Link>
          {!hasAccess && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              You do not have executive dashboard rights.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
