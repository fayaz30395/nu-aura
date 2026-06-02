'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useActiveApp} from '@/lib/hooks/useActiveApp';
import {useAuth} from '@/lib/hooks/useAuth';
import {ShieldAlert, Rocket, Loader2, ArrowRight, Sparkles} from 'lucide-react';
import {Card, CardContent} from '@/components/ui/Card';
import Link from 'next/link';

/** NU-Grow entry point — redirects to performance hub */
export default function GrowEntryPage() {
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
    if (hasAppAccess('GROW')) {
      router.replace('/performance');
    }
  }, [hasHydrated, isAuthenticated, user, router, hasAppAccess, restoreSession]);

  // Show access denied if authenticated but no access
  if (hasHydrated && isAuthenticated && user && !hasAppAccess('GROW')) {
    return (
      <div className="page-shell-centered fade-slide-up auth-delay-20 p-6">
        <Card className="card-aura fade-slide-up auth-delay-40 float-subtle">
          <CardContent className="py-10">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300">
                <ShieldAlert className="h-5 w-5"/>
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Access denied</p>
                <p className="text-caption">You do not have permission to access NU-Grow.</p>
              </div>
            </div>
            <button
              onClick={() => router.replace('/me/dashboard')}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-800 transition-colors"
            >
              <Sparkles className="h-4 w-4"/>
              Go to Dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-6">
      <Card className="card-aura fade-slide-up auth-delay-40 float-subtle">
        <CardContent className="py-10">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
              <Rocket className="h-5 w-5"/>
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">NU-Grow startup flow</p>
              <p className="text-caption">Loading your app entry route.</p>
            </div>
          </div>
          <Link
            href="/performance"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-800 transition-colors"
          >
            <Loader2 className="h-4 w-4 animate-spin"/>
            Continue to NU-Grow
            <ArrowRight className="h-4 w-4"/>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
