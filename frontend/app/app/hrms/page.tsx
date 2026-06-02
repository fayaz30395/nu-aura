'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useActiveApp} from '@/lib/hooks/useActiveApp';
import {useAuth} from '@/lib/hooks/useAuth';
import Link from 'next/link';
import {Card, CardContent} from '@/components/ui/Card';
import {Building2, Loader2, ShieldAlert, ArrowRight} from 'lucide-react';

/** NU-HRMS entry point — redirects to the employee dashboard */
export default function HrmsEntryPage() {
  const router = useRouter();
  const {hasHydrated, isAuthenticated, user, restoreSession} = useAuth();
  const {hasAppAccess} = useActiveApp();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user) {
      restoreSession().then((restored) => {
        if (!restored) router.replace('/auth/login');
      });
      return;
    }
    // DEF-40: Check app-level RBAC before redirecting
    if (hasAppAccess('HRMS')) {
      router.replace('/me/dashboard');
    }
  }, [hasHydrated, isAuthenticated, user, router, hasAppAccess, restoreSession]);

  // Show access denied if authenticated but no access
  if (hasHydrated && isAuthenticated && user && !hasAppAccess('HRMS')) {
    return (
      <div className="page-shell-centered fade-slide-up auth-delay-20">
        <Card className="card-aura fade-slide-up auth-delay-40 float-subtle max-w-md">
          <CardContent className="py-10">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300">
                <ShieldAlert className="h-5 w-5"/>
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Access denied</p>
                <p className="text-caption">You do not have permission to access NU-HRMS.</p>
              </div>
            </div>
            <Link
              href="/me/dashboard"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-800 transition-colors"
            >
              <Loader2 className="h-4 w-4 animate-spin"/>
              Go to dashboard
              <ArrowRight className="h-4 w-4"/>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20">
      <Card className="card-aura fade-slide-up auth-delay-40 float-subtle">
        <CardContent className="py-10">
          <div className="flex items-center gap-4 text-center">
            <Building2 className="h-5 w-5 text-[var(--text-muted)]"/>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">NU-HRMS route</p>
              <p className="text-caption">
                Routing you to your assigned workspace.
              </p>
            </div>
          </div>
          <p className="mt-4 text-caption">This page redirects to the employee dashboard when session checks complete.</p>
          <Link
            href="/me/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-800 transition-colors"
          >
            <Loader2 className="h-4 w-4 animate-spin"/>
            Continue
            <ArrowRight className="h-4 w-4"/>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
