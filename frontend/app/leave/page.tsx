'use client';

import React, {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarDays,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  Wallet,
} from 'lucide-react';

import {AppLayout} from '@/components/layout/AppLayout';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui/Skeleton';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {LEAVE_STATUS} from '@/lib/status/vocabulary';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useActiveLeaveTypes,
  useEmployeeBalancesForYear,
  useEmployeeLeaveRequests,
} from '@/lib/hooks/queries/useLeaves';
import {formatDate} from '@/lib/utils/format/date';

// Single ease curve for every transition on this page. Avoids the cubic-bezier
// drift that compounds when each motion spec picks its own easing.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function LeavePage() {
  const router = useRouter();
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, hasHydrated, router]);

  const year = new Date().getFullYear();
  const employeeId = user?.employeeId ?? '';

  const canRequest = hasAnyPermission(Permissions.LEAVE_REQUEST, Permissions.LEAVE_MANAGE);
  const canApprove = hasAnyPermission(Permissions.LEAVE_APPROVE, Permissions.LEAVE_MANAGE);
  const canViewTeam = hasAnyPermission(
    Permissions.LEAVE_VIEW_TEAM,
    Permissions.LEAVE_VIEW_ALL,
    Permissions.LEAVE_MANAGE,
  );

  const {
    data: balancesData = [],
    isLoading: isBalancesLoading,
    error: balancesError,
    fetchStatus: balancesFetchStatus,
    refetch: refetchBalances,
  } = useEmployeeBalancesForYear(employeeId, year, !!employeeId);
  const {
    data: leaveTypesData = [],
    isLoading: isTypesLoading,
    error: typesError,
    fetchStatus: typesFetchStatus,
  } = useActiveLeaveTypes(!!employeeId);
  const {
    data: requestsData,
    isLoading: isRequestsLoading,
    error: requestsError,
    fetchStatus: requestsFetchStatus,
  } = useEmployeeLeaveRequests(employeeId, 0, 5, !!employeeId);

  const balances = balancesData;
  const leaveTypes = leaveTypesData;
  const recentRequests = requestsData?.content ?? [];

  const error =
    balancesError instanceof Error
      ? balancesError.message
      : requestsError instanceof Error
        ? requestsError.message
        : typesError instanceof Error
          ? typesError.message
          : !employeeId && hasHydrated
            ? 'Employee ID not found'
            : null;

  const isAnyFetching =
    balancesFetchStatus === 'fetching' ||
    typesFetchStatus === 'fetching' ||
    requestsFetchStatus === 'fetching';
  const loading =
    !error && (isBalancesLoading || isTypesLoading || isRequestsLoading) && isAnyFetching;

  // Aggregate stats derived from balance + request data
  const totalAvailable = balances.reduce((sum, b) => sum + (b.available ?? 0), 0);
  const totalUsedYTD = balances.reduce((sum, b) => sum + (b.used ?? 0), 0);
  const totalPending = balances.reduce((sum, b) => sum + (b.pending ?? 0), 0);
  const pendingRequestCount = recentRequests.filter((r) => r.status === 'PENDING').length;

  if (!permissionsReady || !hasHydrated) return null;

  return (
    <AppLayout activeMenuItem="leave">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader canRequest={canRequest} onApply={() => router.push('/leave/apply')} />

        {error && (
          <ErrorBanner message={error} onRetry={() => refetchBalances()} />
        )}

        {loading ? (
          <StatsSkeleton />
        ) : !error ? (
          <StatsRow
            available={totalAvailable}
            used={totalUsedYTD}
            pending={totalPending}
            showApprovals={canApprove}
            pendingApprovals={pendingRequestCount}
          />
        ) : null}

        <BentoNavigation
          canRequest={canRequest}
          canApprove={canApprove}
          canViewTeam={canViewTeam}
          pendingCount={pendingRequestCount}
        />

        {!error && (
          <RecentRequests
            loading={loading}
            requests={recentRequests}
            leaveTypes={leaveTypes}
            onViewAll={() => router.push('/leave/my-leaves')}
          />
        )}

        {!loading && !error && balances.length > 0 && (
          <BalanceByType balances={balances} leaveTypes={leaveTypes} />
        )}

        {!loading && !error && totalAvailable > 0 && totalAvailable < 3 && (
          <AttentionStrip available={totalAvailable} />
        )}
      </div>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader({canRequest, onApply}: {canRequest: boolean; onApply: () => void}) {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Time Away
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          Your leave, balances, and approvals in one quiet view.
        </h1>
        <p className="text-body-secondary max-w-[55ch]">
          Plan time off without surprises. Track what you have, what you&apos;ve used, and what&apos;s waiting on a decision.
        </p>
      </div>
      {canRequest && (
        <Button variant="primary" onClick={onApply} className="self-start sm:self-end">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Request leave
        </Button>
      )}
    </motion.header>
  );
}

// ── Stats row (borders, not card boxes) ──────────────────────────────────────
function StatsRow({
  available,
  used,
  pending,
  showApprovals,
  pendingApprovals,
}: {
  available: number;
  used: number;
  pending: number;
  showApprovals: boolean;
  pendingApprovals: number;
}) {
  const items: Array<{
    label: string;
    value: string;
    icon: React.ElementType;
    tone: 'neutral' | 'warning' | 'danger';
  }> = [
    {label: 'Available', value: available.toFixed(1), icon: Wallet, tone: 'neutral'},
    {label: 'Used YTD', value: used.toFixed(1), icon: TrendingDown, tone: 'neutral'},
    {
      label: 'Pending',
      value: pending.toFixed(1),
      icon: Clock,
      tone: pending > 0 ? 'warning' : 'neutral',
    },
  ];

  if (showApprovals) {
    items.push({
      label: 'Approvals',
      value: String(pendingApprovals),
      icon: ShieldCheck,
      tone: pendingApprovals > 0 ? 'warning' : 'neutral',
    });
  }

  const gridCols = items.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3';

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
      aria-label="Leave at a glance"
      className={`grid grid-cols-2 ${gridCols} border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]`}
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{
            hidden: {opacity: 0, y: 6},
            visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}},
          }}
          className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0"
        >
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-2xs font-medium uppercase tracking-wider">{item.label}</span>
          </div>
          <p
            className={`mt-3 font-mono text-3xl sm:text-4xl tabular-nums tracking-tight ${
              item.tone === 'danger'
                ? 'text-danger-700 dark:text-danger-300'
                : item.tone === 'warning'
                  ? 'text-warning-700 dark:text-warning-300'
                  : 'text-[var(--text-heading)]'
            }`}
          >
            {item.value}
          </p>
          {item.label === 'Available' || item.label === 'Used YTD' ? (
            <p className="mt-1 text-2xs uppercase tracking-wider text-[var(--text-muted)]">days</p>
          ) : null}
        </motion.div>
      ))}
    </motion.section>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
      {Array.from({length: 4}).map((_, i) => (
        <div key={i} className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="mt-3 h-9 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Bento navigation ─────────────────────────────────────────────────────────
function BentoNavigation({
  canRequest,
  canApprove,
  canViewTeam,
  pendingCount,
}: {
  canRequest: boolean;
  canApprove: boolean;
  canViewTeam: boolean;
  pendingCount: number;
}) {
  const heroIsApprovals = canApprove && pendingCount > 0;

  const hero = heroIsApprovals
    ? {
        title: 'Approvals waiting on you',
        description:
          'Review pending leave requests from your team. Approve, reject, or send back for clarification in a single screen.',
        icon: ShieldCheck,
        href: '/leave/approvals',
        live: `${pendingCount} pending`,
      }
    : canRequest
      ? {
          title: 'Request leave',
          description:
            'Pick a date range, a leave type, and let your manager know. Balances update the moment a request is approved.',
          icon: Plus,
          href: '/leave/apply',
          live: 'Self-serve',
        }
      : {
          title: 'My leave history',
          description: 'Every request you have ever filed, with status, days, and approval trail.',
          icon: FileText,
          href: '/leave/my-leaves',
          live: 'Read-only',
        };

  const tiles: Array<{
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    badge?: number;
    show: boolean;
  }> = [
    {
      title: 'My leaves',
      description: 'Filter your request history by status, type, or year.',
      icon: FileText,
      href: '/leave/my-leaves',
      show: true,
    },
    {
      title: 'Team calendar',
      description: 'See who is away when. Avoid clashes before they happen.',
      icon: CalendarDays,
      href: '/leave/calendar',
      show: canViewTeam || true,
    },
    {
      title: 'Approvals',
      description: canApprove ? 'Decide on pending requests from your reports.' : 'Track requests awaiting your manager.',
      icon: ShieldCheck,
      href: '/leave/approvals',
      badge: pendingCount > 0 ? pendingCount : undefined,
      show: canApprove,
    },
    {
      title: 'Encashment',
      description: 'Convert eligible balance into payable days, per policy.',
      icon: Wallet,
      href: '/leave/encashment',
      show: true,
    },
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}}}}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      aria-label="Explore leave"
    >
      <BentoHero {...hero} />
      {tiles.filter((t) => t.show).map((tile) => (
        <BentoTile key={tile.href} {...tile} />
      ))}
    </motion.section>
  );
}

function BentoHero({
  title,
  description,
  icon: Icon,
  href,
  live,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  live: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: {opacity: 0, y: 8},
        visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: EASE}},
      }}
      className="lg:col-span-7 lg:row-span-2"
    >
      <Link
        href={href}
        className="group block h-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-7 sm:p-9 transition-all hover:border-[var(--border-main)] hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <ArrowRight
            className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>
        <h2 className="mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-heading)]">
          {title}
        </h2>
        <p className="mt-3 text-body-secondary max-w-[48ch]">{description}</p>
        <div className="mt-10 flex items-end justify-between gap-6">
          <BentoHeroBars />
          <p className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {live}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

// Decorative non-interactive bars hinting at calendar density.
function BentoHeroBars() {
  const widths = [48, 36, 72, 58, 84, 42, 66, 30];
  return (
    <div className="flex items-end gap-1.5 h-16 flex-1" aria-hidden="true">
      {widths.map((w, i) => (
        <motion.span
          key={i}
          initial={{height: '0%'}}
          animate={{height: `${w}%`}}
          transition={{duration: 0.7, ease: EASE, delay: 0.35 + i * 0.04}}
          className="flex-1 max-w-3 rounded-sm bg-gradient-to-t from-accent-100 to-accent-300 dark:from-accent-900/60 dark:to-accent-700/80"
        />
      ))}
    </div>
  );
}

function BentoTile({
  title,
  description,
  icon: Icon,
  href,
  badge,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: {opacity: 0, y: 8},
        visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}},
      }}
      className="lg:col-span-5"
    >
      <Link
        href={href}
        className="group flex h-full items-start gap-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 transition-all hover:border-[var(--border-main)] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.07)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-[var(--text-heading)]">{title}</h3>
            {badge !== undefined && (
              <span className="inline-flex items-center justify-center min-w-6 px-2 h-5 text-2xs font-semibold rounded-full bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
        </div>
        <ArrowRight
          className="h-4 w-4 self-center text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </motion.div>
  );
}

// ── Recent requests (divide-y, no nested cards) ──────────────────────────────
function RecentRequests({
  loading,
  requests,
  leaveTypes,
  onViewAll,
}: {
  loading: boolean;
  requests: Array<{
    id: string | number;
    requestNumber: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    isHalfDay?: boolean;
    status: string;
    appliedOn: string;
  }>;
  leaveTypes: Array<{id: string; leaveName: string; leaveCode: string}>;
  onViewAll: () => void;
}) {
  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.28}}
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
          Recent requests
        </h2>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 dark:text-accent-300 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {loading ? (
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {Array.from({length: 3}).map((_, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 sm:gap-6">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-40 rounded" />
                <Skeleton className="h-3 w-64 rounded" />
              </div>
              <Skeleton className="h-5 w-16 rounded" />
            </li>
          ))}
        </ul>
      ) : requests.length === 0 ? (
        <div className="border-y border-[var(--border-subtle)] py-10 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No requests yet. Time off starts with a single click.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {requests.map((r) => {
            const leaveType = leaveTypes.find((t) => t.id === r.leaveTypeId);
            return (
              <li
                key={r.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 sm:gap-6"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-heading)] truncate">
                    {leaveType?.leaveName ?? 'Leave'}{' '}
                    <span className="text-[var(--text-muted)] font-normal">· {r.requestNumber}</span>
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {formatDate(r.startDate)} – {formatDate(r.endDate)} ·{' '}
                    <span className="font-mono tabular-nums">{r.totalDays}</span>{' '}
                    {r.totalDays === 1 ? 'day' : 'days'}
                    {r.isHalfDay ? ' (half day)' : ''} · applied {formatDate(r.appliedOn)}
                  </p>
                </div>
                <StatusBadge status={r.status} domain={LEAVE_STATUS} />
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}

// ── Balance by type (divide-y, no nested cards) ──────────────────────────────
function BalanceByType({
  balances,
  leaveTypes,
}: {
  balances: Array<{
    id: string | number;
    leaveTypeId: string;
    openingBalance: number;
    accrued: number;
    used: number;
    pending: number;
    available: number;
  }>;
  leaveTypes: Array<{id: string; leaveName: string; leaveCode: string}>;
}) {
  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.34}}
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
          Balance by type
        </h2>
        <p className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Year {new Date().getFullYear()}
        </p>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {balances.map((b) => {
          const leaveType = leaveTypes.find((t) => t.id === b.leaveTypeId);
          const total = (b.openingBalance ?? 0) + (b.accrued ?? 0);
          const usedPct = total > 0 ? Math.min(100, (b.used / total) * 100) : 0;
          return (
            <li key={b.id} className="grid grid-cols-[1fr_auto] items-center gap-4 py-4 sm:gap-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--text-heading)] truncate">
                    {leaveType?.leaveName ?? 'Leave'}
                  </p>
                  {leaveType?.leaveCode && (
                    <span className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      {leaveType.leaveCode}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <div
                    className="h-1.5 w-40 sm:w-64 rounded-full bg-[var(--bg-surface)] overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(usedPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${leaveType?.leaveName ?? 'Leave'} used`}
                  >
                    <div
                      className="h-full bg-accent-500 transition-all"
                      style={{width: `${usedPct}%`}}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    <span className="font-mono tabular-nums">{b.used.toFixed(1)}</span> used ·{' '}
                    <span className="font-mono tabular-nums">{b.pending.toFixed(1)}</span> pending
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl tabular-nums tracking-tight text-[var(--text-heading)]">
                  {b.available.toFixed(1)}
                </p>
                <p className="text-2xs uppercase tracking-wider text-[var(--text-muted)]">
                  of {total.toFixed(1)} days
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

// ── Attention strip (one-line alert) ─────────────────────────────────────────
function AttentionStrip({available}: {available: number}) {
  return (
    <motion.aside
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.42}}
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-xl border border-warning-200 bg-warning-50/40 dark:border-warning-700/40 dark:bg-warning-950/30 px-5 py-4"
    >
      <div className="flex items-center gap-4 text-sm">
        <AlertTriangle
          className="h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400"
          aria-hidden="true"
        />
        <p className="text-[var(--text-primary)]">
          You have <span className="font-mono font-semibold tabular-nums">{available.toFixed(1)}</span> day
          {available === 1 ? '' : 's'} left this year. Plan ahead before things bunch up in December.
        </p>
      </div>
      <Link href="/leave/my-leaves">
        <Button variant="outline" size="sm">
          Plan ahead
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </Link>
    </motion.aside>
  );
}

// ── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({message, onRetry}: {message: string; onRetry: () => void}) {
  return (
    <div
      role="alert"
      className="flex items-center gap-4 rounded-xl border border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 px-5 py-4"
    >
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400"
        aria-hidden="true"
      />
      <div className="flex-1 text-sm">
        <p className="font-medium text-danger-700 dark:text-danger-300">Could not load leave data</p>
        <p className="text-[var(--text-secondary)]">
          {message.includes('500')
            ? 'The server encountered an error. Please try again in a moment.'
            : message}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

