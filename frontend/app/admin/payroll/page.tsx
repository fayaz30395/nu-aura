'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DarkModeProvider } from '@/components/layout/DarkModeProvider';
import { Briefcase } from 'lucide-react';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

export default function AdminPayrollPage() {
  const router = useRouter();
  const { hasAnyRole, isReady } = usePermissions();
  const { hasHydrated, isAuthenticated } = useAuth();

  // DEF-56: RBAC gate — placeholder page must still require admin access
  useEffect(() => {
    if (!hasHydrated || !isReady) return;
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    if (!hasAnyRole(...ADMIN_ACCESS_ROLES)) { router.replace('/me/dashboard'); }
  }, [hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);

  return (
    <DarkModeProvider>
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                Payroll Administration
              </h1>
              <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">
                Manage payroll settings and configurations
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-10 flex flex-col items-center text-center skeuo-card">
            <div className="rounded-full bg-accent-50 dark:bg-accent-950/20 p-5 mb-4">
              <Briefcase className="h-10 w-10 text-accent-500" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2 skeuo-emboss">
              Coming Soon
            </h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-md">
              Payroll administration features are currently under development. Use the main{' '}
              <a href="/payroll" className="text-accent-500 hover:underline font-medium">
                Payroll section
              </a>{' '}
              to manage payroll runs, payslips, and salary structures.
            </p>
          </div>
        </div>
      </div>
    </DarkModeProvider>
  );
}
