'use client';

import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  DollarSign,
  Award,
  Briefcase,
} from 'lucide-react';
import { Skeleton } from '@mantine/core';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui';
import { useEmployee } from '@/lib/hooks/queries/useEmployees';
import { useEmployeeRevisionHistory } from '@/lib/hooks/queries/useCompensation';
import type { SalaryRevision } from '@/lib/types/hrms/compensation';
import { RevisionStatus, RevisionType } from '@/lib/types/hrms/compensation';

// ─── Animation variants ─────────────────────────────────────────────
const pageEnter = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// ─── Helpers ─────────────────────────────────────────────────────────
function formatCurrency(amount: number | undefined | null, currency = 'USD'): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | undefined | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatPercentage(value: number | undefined | null): string {
  if (value == null) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatRevisionType(type: RevisionType): string {
  const labels: Record<RevisionType, string> = {
    [RevisionType.ANNUAL_INCREMENT]: 'Annual Increment',
    [RevisionType.PROMOTION]: 'Promotion',
    [RevisionType.ROLE_CHANGE]: 'Role Change',
    [RevisionType.MARKET_ADJUSTMENT]: 'Market Adjustment',
    [RevisionType.PERFORMANCE_BONUS]: 'Performance Bonus',
    [RevisionType.SPECIAL_INCREMENT]: 'Special Increment',
    [RevisionType.PROBATION_CONFIRMATION]: 'Probation Confirmation',
    [RevisionType.RETENTION]: 'Retention',
    [RevisionType.CORRECTION]: 'Correction',
  };
  return labels[type] ?? type;
}

function getStatusColor(status: RevisionStatus): string {
  switch (status) {
    case RevisionStatus.APPLIED:
      return 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400';
    case RevisionStatus.APPROVED:
      return 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-400';
    case RevisionStatus.PENDING_REVIEW:
    case RevisionStatus.PENDING_APPROVAL:
    case RevisionStatus.REVIEWED:
      return 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400';
    case RevisionStatus.REJECTED:
    case RevisionStatus.CANCELLED:
      return 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400';
    default:
      return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
  }
}

function getStatusLabel(status: RevisionStatus): string {
  const labels: Record<RevisionStatus, string> = {
    [RevisionStatus.DRAFT]: 'Draft',
    [RevisionStatus.PENDING_REVIEW]: 'Pending Review',
    [RevisionStatus.REVIEWED]: 'Reviewed',
    [RevisionStatus.PENDING_APPROVAL]: 'Pending Approval',
    [RevisionStatus.APPROVED]: 'Approved',
    [RevisionStatus.REJECTED]: 'Rejected',
    [RevisionStatus.CANCELLED]: 'Cancelled',
    [RevisionStatus.APPLIED]: 'Applied',
  };
  return labels[status] ?? status;
}

function getRevisionIcon(type: RevisionType) {
  switch (type) {
    case RevisionType.PROMOTION:
      return Award;
    case RevisionType.ROLE_CHANGE:
      return Briefcase;
    default:
      return DollarSign;
  }
}

// ─── Skeleton Loader ─────────────────────────────────────────────────
function CompensationSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton height={20} width={100} />
        <Skeleton height={28} width={300} />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-6">
          <div className="flex items-center gap-4">
            <Skeleton height={40} width={40} radius="xl" />
            <div className="flex-1 space-y-2">
              <Skeleton height={18} width="40%" />
              <Skeleton height={14} width="60%" />
            </div>
            <Skeleton height={24} width={80} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Revision Card ───────────────────────────────────────────────────
function RevisionCard({ revision, isFirst }: { revision: SalaryRevision; isFirst: boolean }) {
  const Icon = getRevisionIcon(revision.revisionType);
  const isPositive = (revision.incrementAmount ?? 0) >= 0;

  return (
    <motion.div variants={staggerItem}>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center px-4 py-6">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isFirst
                    ? 'bg-accent-100 dark:bg-accent-900/30'
                    : 'bg-[var(--bg-secondary)]'
                }`}
              >
                <Icon
                  size={18}
                  className={
                    isFirst
                      ? 'text-accent-700 dark:text-accent-400'
                      : 'text-[var(--text-muted)]'
                  }
                />
              </div>
              <div className="flex-1 w-px bg-[var(--border-main)] mt-2" />
            </div>

            {/* Content */}
            <div className="flex-1 py-6 pr-6">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatRevisionType(revision.revisionType)}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={14} className="text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">
                      Effective {formatDate(revision.effectiveDate)}
                    </span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    revision.status
                  )}`}
                >
                  {getStatusLabel(revision.status)}
                </span>
              </div>

              {/* Salary change row */}
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Previous CTC
                  </p>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    {formatCurrency(revision.previousSalary, revision.currency)}
                  </p>
                </div>
                <ArrowRight size={16} className="text-[var(--text-muted)]" />
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    New CTC
                  </p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatCurrency(revision.newSalary, revision.currency)}
                  </p>
                </div>
                {revision.incrementPercentage != null && (
                  <div className="flex items-center gap-1 ml-2">
                    {isPositive ? (
                      <TrendingUp size={14} className="text-success-600 dark:text-success-400" />
                    ) : (
                      <TrendingDown size={14} className="text-danger-600 dark:text-danger-400" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        isPositive
                          ? 'text-success-700 dark:text-success-400'
                          : 'text-danger-700 dark:text-danger-400'
                      }`}
                    >
                      {formatPercentage(revision.incrementPercentage)}
                    </span>
                  </div>
                )}
              </div>

              {/* Designation change */}
              {revision.newDesignation && revision.previousDesignation &&
                revision.newDesignation !== revision.previousDesignation && (
                <div className="flex items-center gap-2 mb-4 text-xs text-[var(--text-muted)]">
                  <Briefcase size={12} />
                  <span>{revision.previousDesignation}</span>
                  <ArrowRight size={12} />
                  <span className="font-medium text-[var(--text-primary)]">
                    {revision.newDesignation}
                  </span>
                </div>
              )}

              {/* Justification */}
              {revision.justification && (
                <p className="text-xs text-[var(--text-muted)] italic">
                  {revision.justification}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function EmployeeCompensationPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const { data: employee, isLoading: employeeLoading } = useEmployee(employeeId);
  const { data: revisions, isLoading: revisionsLoading, isError } = useEmployeeRevisionHistory(
    employeeId,
    !!employeeId
  );

  const isLoading = employeeLoading || revisionsLoading;

  // Sort revisions by effective date descending (most recent first)
  const sortedRevisions = [...(revisions ?? [])].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  // Summary stats
  const currentSalary = sortedRevisions.length > 0 ? sortedRevisions[0].newSalary : null;
  const totalRevisions = sortedRevisions.length;
  const appliedRevisions = sortedRevisions.filter(
    (r) => r.status === RevisionStatus.APPLIED
  ).length;

  return (
    <AppLayout>
      <motion.div
        className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto"
        variants={pageEnter}
        initial="hidden"
        animate="visible"
      >
        {/* Back navigation */}
        <button
          onClick={() => router.push(`/employees/${employeeId}`)}
          className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2 rounded-sm"
          aria-label="Back to employee profile"
        >
          <ChevronLeft size={16} />
          Back to Profile
        </button>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-page-title text-[var(--text-primary)]">
            Compensation History
          </h1>
          {employee && (
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {employee.firstName} {employee.lastName} &middot; {employee.employeeCode}
            </p>
          )}
        </div>

        {isLoading ? (
          <CompensationSkeleton />
        ) : isError ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-danger-600 dark:text-danger-400">
                Failed to load compensation history. Please try again.
              </p>
            </CardContent>
          </Card>
        ) : sortedRevisions.length === 0 ? (
          <EmptyState
            icon={<DollarSign size={40} className="text-[var(--text-muted)]" />}
            title="No compensation records"
            description="No salary revisions have been recorded for this employee yet."
          />
        ) : (
          <>
            {/* Summary cards */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={staggerItem}>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Current CTC
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {formatCurrency(currentSalary)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={staggerItem}>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Total Revisions
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {totalRevisions}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={staggerItem}>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Applied
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {appliedRevisions}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Timeline of revisions */}
            <motion.div
              className="space-y-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {sortedRevisions.map((revision, index) => (
                <RevisionCard
                  key={revision.id}
                  revision={revision}
                  isFirst={index === 0}
                />
              ))}
            </motion.div>
          </>
        )}
      </motion.div>
    </AppLayout>
  );
}
