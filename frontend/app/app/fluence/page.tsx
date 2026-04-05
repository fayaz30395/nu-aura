'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useActiveApp} from '@/lib/hooks/useActiveApp';
import {useAuth} from '@/lib/hooks/useAuth';
import {ShieldAlert} from 'lucide-react';

/** NU-Fluence entry page — redirect to wiki */
export default function FluenceEntryPage() {
  const router = useRouter();
  const {hasHydrated, isAuthenticated} = useAuth();
  const {hasAppAccess} = useActiveApp();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    // DEF-40: Check app-level RBAC before redirecting
    // DEF-39: Use router.replace (not push) to avoid back-button loop
    if (hasAppAccess('FLUENCE')) {
      router.replace('/fluence/wiki');
    }
  }, [hasHydrated, isAuthenticated, router, hasAppAccess]);

  // Show access denied if authenticated but no access
  if (hasHydrated && isAuthenticated && !hasAppAccess('FLUENCE')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="skeuo-card p-8 text-center max-w-md">
          <ShieldAlert
            className="h-12 w-12 text-danger-500 mx-auto mb-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Access Denied</h2>
          <p className="text-[var(--text-muted)] mb-4">You do not have permission to access NU-Fluence.</p>
          <button
            onClick={() => router.replace('/me/dashboard')}
            className="px-4 py-2 bg-accent-700 text-white rounded-lg hover:bg-accent-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeuo-card p-8 text-center">
        <p className="text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}
