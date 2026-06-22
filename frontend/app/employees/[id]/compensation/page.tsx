'use client';

import {FormEvent, useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {ArrowRight, Award, Briefcase, Calendar, DollarSign, Plus, TrendingDown, TrendingUp,} from 'lucide-react';
import {Skeleton} from '@mantine/core';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {EmptyState, ProfileHero} from '@/components/ui';
import {useEmployee} from '@/lib/hooks/queries/useEmployees';
import {useCreateRevision, useEmployeeRevisionHistory} from '@/lib/hooks/queries/useCompensation';
import type {SalaryRevision} from '@/lib/types/hrms/compensation';
import {RevisionStatus, RevisionType} from '@/lib/types/hrms/compensation';
import {format} from 'date-fns';
// RBAC-NEW-01: guard compensation page so salary data is not visible before API auth check
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

// ─── Animation variants ─────────────────────────────────────────────
const pageEnter = {
  hidden: {opacity: 0, y: 8},
  visible: {opacity: 1, y: 0, transition: {duration: 0.25}},
};

const staggerContainer = {
  hidden: {},
  visible: {transition: {staggerChildren: 0.06}},
};

const staggerItem = {
  hidden: {opacity: 0, y: 8},
  visible: {opacity: 1, y: 0, transition: {duration: 0.25}},
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
  return format(new Date(date), 'MMMM d, yyyy');
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
        <Skeleton height={20} width={100}/>
        <Skeleton height={28} width={300}/>
      </div>
      {Array.from({length: 4}).map((_, i) => (
        <div key={i} className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-6">
          <div className="flex items-center gap-4">
            <Skeleton height={40} width={40} radius="xl"/>
            <div className="flex-1 space-y-2">
              <Skeleton height={18} width="40%"/>
              <Skeleton height={14} width="60%"/>
            </div>
            <Skeleton height={24} width={80}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Revision Card ───────────────────────────────────────────────────
function RevisionCard({revision, isFirst}: { revision: SalaryRevision; isFirst: boolean }) {
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
              <div className="flex-1 w-px bg-[var(--border-main)] mt-2"/>
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
                    <Calendar size={14} className="text-[var(--text-muted)]"/>
                    <span className="text-caption">
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
                <ArrowRight size={16} className="text-[var(--text-muted)]"/>
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
                      <TrendingUp size={14} className="text-success-600 dark:text-success-400"/>
                    ) : (
                      <TrendingDown size={14} className="text-danger-600 dark:text-danger-400"/>
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
                  <div className="flex items-center gap-2 mb-4 text-caption">
                    <Briefcase size={12}/>
                    <span>{revision.previousDesignation}</span>
                    <ArrowRight size={12}/>
                    <span className="font-medium text-[var(--text-primary)]">
                    {revision.newDesignation}
                  </span>
                  </div>
                )}

              {/* Justification */}
              {revision.justification && (
                <p className="text-caption italic">
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
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  // RBAC-NEW-01: require COMPENSATION_VIEW (or MANAGE/VIEW_ALL) — redirect to
  // employee profile if the user lacks the permission rather than briefly
  // rendering the salary skeleton before the API returns 403.
  const {hasPermission, isReady} = usePermissions();
  const canViewCompensation =
    hasPermission(Permissions.COMPENSATION_VIEW) ||
    hasPermission(Permissions.COMPENSATION_MANAGE) ||
    hasPermission(Permissions.COMPENSATION_VIEW_ALL);

  useEffect(() => {
    if (isReady && !canViewCompensation) {
      router.replace(`/employees/${employeeId}`);
    }
  }, [isReady, canViewCompensation, router, employeeId]);
  const [newSalary, setNewSalary] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [justification, setJustification] = useState('');

  const {data: employee, isLoading: employeeLoading} = useEmployee(employeeId);
  const {data: revisions, isLoading: revisionsLoading, isError} = useEmployeeRevisionHistory(
    employeeId,
    !!employeeId
  );
  const createRevisionMutation = useCreateRevision();

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

  const closeRevisionModal = () => {
    setIsRevisionModalOpen(false);
    setNewSalary('');
    setNewDesignation('');
    setEffectiveDate('');
    setJustification('');
  };

  const handleCreateRevision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createRevisionMutation.mutateAsync({
      employeeId,
      revisionType: RevisionType.ANNUAL_INCREMENT,
      newSalary: Number(newSalary),
      newDesignation: newDesignation || undefined,
      effectiveDate,
      justification: justification || undefined,
    });
    closeRevisionModal();
  };

  return (
    <AppLayout
      activeMenuItem="employees"
      breadcrumbs={[
        {label: 'Employees', href: '/employees'},
        {label: 'Employee Detail'},
        {label: 'Compensation'},
      ]}
    >
      <motion.div
        className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto"
        variants={pageEnter}
        initial="hidden"
        animate="visible"
      >
        {/* Profile hero (unified) */}
        <div className="mb-8">
          <ProfileHero
            name={employee ? `${employee.firstName} ${employee.lastName}` : ''}
            photoUrl={employee?.profilePhotoUrl}
            subtitle="Compensation History"
            meta={employee?.employeeCode ? <span>{employee.employeeCode}</span> : undefined}
            onBack={() => router.push(`/employees/${employeeId}`)}
            backLabel="Back to Profile"
            actions={
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-accent-700 px-4 py-2 text-sm font-medium text-white hover:bg-accent-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2"
              >
                <Plus size={16}/>
                New Revision
              </button>
            }
          />
        </div>

        {isLoading ? (
          <CompensationSkeleton/>
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
            icon={<DollarSign size={40} className="text-[var(--text-muted)]"/>}
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

      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateRevision}
            className="w-full max-w-lg rounded-lg bg-[var(--bg-card)] p-6 shadow-xl dark:bg-[var(--bg-secondary)]"
          >
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">New Salary Revision</h2>
              {employee && (
                <p className="text-body-muted mt-1">
                  {employee.firstName} {employee.lastName} &middot; {employee.employeeCode}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">New CTC</span>
                <input
                  name="newSalary"
                  type="number"
                  min="1"
                  required
                  placeholder="New CTC"
                  value={newSalary}
                  onChange={(event) => setNewSalary(event.target.value)}
                  className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Designation</span>
                <input
                  name="designation"
                  type="text"
                  placeholder="New designation"
                  value={newDesignation}
                  onChange={(event) => setNewDesignation(event.target.value)}
                  className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Effective Date</span>
                <input
                  name="effectiveDate"
                  type="date"
                  required
                  value={effectiveDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                  className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Justification</span>
                <textarea
                  name="justification"
                  rows={3}
                  value={justification}
                  onChange={(event) => setJustification(event.target.value)}
                  className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={closeRevisionModal}
                className="flex-1 rounded-md border border-[var(--border-main)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createRevisionMutation.isPending}
                className="flex-1 rounded-md bg-accent-700 px-4 py-2 text-sm font-medium text-white hover:bg-accent-800 disabled:opacity-50"
              >
                {createRevisionMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
