'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { motion } from 'framer-motion';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  Banknote,
  FileText,
  Layers,
  ChevronRight,
  Settings,
  TrendingUp,
} from 'lucide-react';

const SUB_PAGES = [
  {
    href: '/payroll/runs',
    label: 'Payroll Runs',
    description: 'Create and manage payroll processing runs for each pay period',
    icon: Banknote,
    gradient: 'from-sky-500 to-sky-700',
    hoverBorder: 'hover:border-sky-300 dark:hover:border-sky-700',
    hoverText: 'group-hover:text-sky-500',
  },
  {
    href: '/payroll/payslips',
    label: 'Payslips',
    description: 'View and download employee payslips with salary breakdowns',
    icon: FileText,
    gradient: 'from-cyan-500 to-cyan-600',
    hoverBorder: 'hover:border-cyan-300 dark:hover:border-cyan-700',
    hoverText: 'group-hover:text-cyan-500',
  },
  {
    href: '/payroll/structures',
    label: 'Salary Structures',
    description: 'Define salary structures with configurable allowances and deductions',
    icon: Layers,
    gradient: 'from-purple-500 to-purple-600',
    hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-700',
    hoverText: 'group-hover:text-purple-500',
  },
  {
    href: '/payroll/bulk-processing',
    label: 'Bulk Processing',
    description: 'Process payroll for multiple employees at once with a guided wizard',
    icon: Settings,
    gradient: 'from-amber-500 to-amber-600',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
    hoverText: 'group-hover:text-amber-500',
  },
] as const;

export default function PayrollPage() {
  const router = useRouter();
  const { hasPermission, isReady: permReady } = usePermissions();

  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.PAYROLL_VIEW)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  if (!permReady) {
    // Show loading skeleton while permissions are being loaded
    return (
      <AppLayout activeMenuItem="payroll">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header skeleton */}
            <div className="mb-8">
              <div className="h-10 bg-[var(--skeleton-base)] rounded-lg w-1/3 mb-4" />
              <div className="h-5 bg-[var(--skeleton-base)] rounded-lg w-2/3" />
            </div>

            {/* Navigation cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!hasPermission(Permissions.PAYROLL_VIEW)) {
    return null;
  }

  return (
    <AppLayout activeMenuItem="payroll">
      <motion.div
        className="p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">Payroll Management</h1>
            </div>
            <p className="text-[var(--text-secondary)] mt-2 ml-1 skeuo-deboss">
              Manage payroll runs, payslips, and salary structures for your organisation
            </p>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SUB_PAGES.map(({ href, label, description, icon: Icon, gradient, hoverBorder, hoverText }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`group bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 hover:shadow-lg ${hoverBorder} transition-all duration-200 text-left skeuo-card`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-lg bg-gradient-to-br ${gradient} group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <ChevronRight className={`h-4 w-4 text-[var(--text-muted)] ${hoverText} group-hover:translate-x-1 transition-all duration-200`} />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-0.5 skeuo-emboss">{label}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{description}</p>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
