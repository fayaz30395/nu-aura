'use client';

import React, {useMemo} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {format as formatDateFns} from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Fingerprint,
  Palmtree,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

import {Tooltip} from '@mantine/core';

import {AppLayout} from '@/components/layout/AppLayout';
import {PageTransition, Reveal} from '@/components/motion';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {Segmented} from '@/components/ui/Segmented';
import {Skeleton} from '@/components/ui/Skeleton';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Ring} from '@/components/charts/aura';
import {LEAVE_STATUS} from '@/lib/status/vocabulary';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useActiveLeaveTypes,
  useEmployeeBalancesForYear,
  useEmployeeLeaveRequests,
} from '@/lib/hooks/queries/useLeaves';

// Single ease curve for every transition on this page. Avoids the cubic-bezier
// drift that compounds when each motion spec picks its own easing.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function LeavePage() {
  const router = useRouter();
  const {user, hasHydrated} = useAuth();
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();

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

  const balancesErrorMsg = balancesError instanceof Error ? balancesError.message : null;
  const requestsErrorMsg = requestsError instanceof Error ? requestsError.message : null;
  const error =
    typesError instanceof Error
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
  const pendingRequestCount = recentRequests.filter((r) => r.status === 'PENDING').length;

  if (!permissionsReady || !hasHydrated) return null;

  return (
    <AppLayout activeMenuItem="leave">
      <PageTransition className="mx-auto w-full max-w-7xl px-6 py-8 space-y-8">
        <PageHeader
          view="leave"
          onViewChange={(v) => router.push(v === 'attendance' ? '/attendance' : '/leave')}
        />

        {error && (
          <ErrorBanner message={error} onRetry={() => refetchBalances()} />
        )}

        {/* Aura split: balance rings + pending (left) · month calendar (right) */}
        {!error && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-1">
              <BalanceRings
                loading={loading}
                error={balancesErrorMsg}
                balances={balances}
                leaveTypes={leaveTypes}
                canRequest={canRequest}
                onRequest={() => router.push('/leave/apply')}
              />
              <PendingRequests
                loading={loading}
                error={requestsErrorMsg}
                requests={recentRequests}
                leaveTypes={leaveTypes}
                pendingCount={pendingRequestCount}
                onViewAll={() => router.push('/leave/my-leaves')}
              />
            </div>
            <div className="lg:col-span-2">
              {!loading && <LeaveCalendar requests={recentRequests} leaveTypes={leaveTypes} />}
            </div>
          </div>
        )}

        {totalAvailable > 0 && totalAvailable < 3 && !loading && !error && (
          <AttentionStrip available={totalAvailable} />
        )}

        <BentoNavigation
          canRequest={canRequest}
          canApprove={canApprove}
          canViewTeam={canViewTeam}
          pendingCount={pendingRequestCount}
        />
      </PageTransition>
    </AppLayout>
  );
}

// ── Header (title + Attendance/Leave segmented + Export) ─────────────────────
function PageHeader({
  view,
  onViewChange,
}: {
  view: 'attendance' | 'leave';
  onViewChange: (next: 'attendance' | 'leave') => void;
}) {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start"
    >
      <div className="space-y-1.5 max-w-2xl">
        <h1 className="text-aura-title text-[var(--text-1)]">Leave</h1>
        <p className="text-sm text-[var(--text-3)]">
          Balances, requests and the team time-off calendar.
        </p>
      </div>
      <div className="flex items-center gap-4 self-start">
        <Segmented
          aria-label="Attendance or Leave"
          value={view}
          onChange={onViewChange}
          options={[
            {value: 'attendance', label: 'Attendance', icon: <Fingerprint className="h-[15px] w-[15px]" aria-hidden="true" />},
            {value: 'leave', label: 'Leave', icon: <Palmtree className="h-[15px] w-[15px]" aria-hidden="true" />},
          ]}
        />
        <Button variant="ghost" leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}>
          Export
        </Button>
      </div>
    </motion.header>
  );
}

// ── Page-local avatar (initials chip) — no shared Avatar primitive exists ─────
function LeaveAvatar({name}: {name: string}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      aria-hidden="true"
      className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[11.5px] font-semibold text-[var(--accent-text)]"
    >
      {initials || 'NA'}
    </span>
  );
}

// ── My balance (4 Rings from real LeaveBalance data) ─────────────────────────
const RING_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

// Annual balances reset on Jan 1 of the following year — shown in the card sub.
const RESET_LABEL = `Jan ${new Date().getFullYear() + 1}`;

function BalanceRings({
  loading,
  error,
  balances,
  leaveTypes,
  canRequest,
  onRequest,
}: {
  loading: boolean;
  error: string | null;
  balances: Array<{id: string | number; leaveTypeId: string; openingBalance: number; accrued: number; used: number; available: number}>;
  leaveTypes: Array<{id: string; leaveName: string; leaveCode: string}>;
  canRequest: boolean;
  onRequest: () => void;
}) {
  const items = balances.slice(0, 4);
  return (
    <Reveal delay={0.12}>
      <Card className="p-5">
        <div className="mb-4">
          <h2 className="text-[15px] font-bold leading-tight text-[var(--text-1)]">My balance</h2>
          <p className="mt-1 text-xs text-[var(--text-3)]">Resets {RESET_LABEL}</p>
        </div>

        {error ? (
          <p className="py-4 text-sm text-[var(--err-fg)]">{error}</p>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-[52px] w-[52px] rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-3)]">No balances for this year yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {items.map((b, i) => {
              const total = (b.openingBalance ?? 0) + (b.accrued ?? 0);
              const remaining = b.available ?? Math.max(0, total - (b.used ?? 0));
              const pct = total > 0 ? (remaining / total) * 100 : 0;
              const type = leaveTypes.find((t) => t.id === b.leaveTypeId);
              return (
                <div key={b.id} className="flex items-center gap-4">
                  <Tooltip
                    label={`${type?.leaveName ?? 'Leave'}: ${Number.isInteger(remaining) ? remaining : remaining.toFixed(1)} remaining of ${total.toFixed(0)} total · ${(b.used ?? 0).toFixed(0)} used`}
                    withArrow
                    position="top"
                    withinPortal
                  >
                    <div>
                      <Ring
                        value={pct}
                        size={52}
                        thickness={6}
                        color={RING_COLORS[i % RING_COLORS.length]}
                        label={<>{Number.isInteger(remaining) ? remaining : remaining.toFixed(1)}</>}
                        ariaLabel={`${type?.leaveName ?? 'Leave'}: ${remaining} of ${total} remaining`}
                      />
                    </div>
                  </Tooltip>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-[var(--text-1)]">
                      {type?.leaveName ?? 'Leave'}
                    </div>
                    <div className="num text-2xs text-[var(--text-3)]">
                      {(b.used ?? 0).toFixed(0)} used · {total.toFixed(0)} total
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {canRequest && (
          <Button
            variant="primary"
            className="mt-5 w-full"
            onClick={() => {
              onRequest();
              if (typeof window !== 'undefined' && window.nuToast) {
                window.nuToast('Time-off request', { msg: 'Opening the request form…', type: 'info' });
              }
            }}
            leftIcon={<CalendarPlus className="h-4 w-4" aria-hidden="true" />}
          >
            Request time off
          </Button>
        )}
      </Card>
    </Reveal>
  );
}

// ── Pending requests (real recent requests, filtered to pending) ─────────────
function PendingRequests({
  loading,
  error,
  requests,
  leaveTypes,
  pendingCount,
  onViewAll,
}: {
  loading: boolean;
  error: string | null;
  requests: Array<{id: string | number; requestNumber: string; leaveTypeId: string; totalDays: number; status: string}>;
  leaveTypes: Array<{id: string; leaveName: string; leaveCode: string}>;
  pendingCount: number;
  onViewAll: () => void;
}) {
  const pending = requests.filter((r) => r.status === 'PENDING');
  return (
    <Reveal delay={0.18}>
      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between gap-4">
          <h2 className="text-[15px] font-bold leading-tight text-[var(--text-1)]">Pending requests</h2>
          <span className="num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--warn-bg)] px-1.5 text-2xs font-bold text-[var(--warn-fg)]">
            {pendingCount}
          </span>
        </div>

        {error ? (
          <p className="py-4 text-sm text-[var(--err-fg)]">{error}</p>
        ) : loading ? (
          <div className="mt-2 flex flex-col">
            {Array.from({length: 2}).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-t border-[var(--border-soft)] py-3 first:border-t-0">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-3)]">No requests awaiting a decision.</p>
        ) : (
          <div className="mt-1 flex flex-col">
            {pending.map((r, i) => {
              const type = leaveTypes.find((t) => t.id === r.leaveTypeId);
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-4 py-3 ${i ? 'border-t border-[var(--border-soft)]' : ''}`}
                >
                  <LeaveAvatar name={type?.leaveName ?? 'Leave'} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--text-1)]">
                      {type?.leaveName ?? 'Leave'}
                    </div>
                    <div className="truncate text-2xs text-[var(--text-3)]">
                      <span className="num">{r.totalDays}</span> {r.totalDays === 1 ? 'day' : 'days'} · {r.requestNumber}
                    </div>
                  </div>
                  <StatusBadge status={r.status} domain={LEAVE_STATUS} />
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onViewAll}
          className="mt-3 inline-flex items-center gap-1 rounded text-xs font-medium text-[var(--accent-text)] hover:underline focus-visible:shadow-[var(--sh-focus)] focus-visible:outline-none"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </Card>
    </Reveal>
  );
}

// ── Month calendar (current month, real leave requests → event chips) ────────
const LEAVE_CHIP_COLOR = 'var(--chart-4)';

function LeaveCalendar({
  requests,
  leaveTypes,
}: {
  requests: Array<{id: string | number; leaveTypeId: string; startDate: string; endDate: string; status: string}>;
  leaveTypes: Array<{id: string; leaveName: string; leaveCode: string}>;
}) {
  const today = useMemo(() => new Date(), []);
  const [monthOffset, setMonthOffset] = React.useState(0);
  const viewMonth = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return d;
  }, [today, monthOffset]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first offset for the 1st of the month.
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  // Map day-of-month → events from real leave requests overlapping the month.
  const eventsByDay = useMemo(() => {
    const map = new Map<number, Array<{label: string; color: string}>>();
    for (const r of requests) {
      if (r.status === 'REJECTED' || r.status === 'CANCELLED') continue;
      const start = new Date(r.startDate + 'T00:00:00');
      const end = new Date(r.endDate + 'T00:00:00');
      const type = leaveTypes.find((t) => t.id === r.leaveTypeId);
      const label = type?.leaveCode || type?.leaveName?.split(' ')[0] || 'Leave';
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          const list = map.get(day) ?? [];
          list.push({label, color: LEAVE_CHIP_COLOR});
          map.set(day, list);
        }
      }
    }
    return map;
  }, [requests, leaveTypes, year, month]);

  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Reveal delay={0.16}>
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-bold leading-tight text-[var(--text-1)]">
              {formatDateFns(viewMonth, 'MMMM yyyy')}
            </h2>
            <p className="mt-1 text-xs text-[var(--text-3)]">Team time off &amp; remote days</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => setMonthOffset((m) => m - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => setMonthOffset((m) => m + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {dows.map((d) => (
            <div key={d} className="text-aura-micro text-[var(--text-3)] pb-1">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const isWeekend = i % 7 >= 5;
            const events = day != null ? eventsByDay.get(day) : undefined;
            const isToday =
              day != null &&
              monthOffset === 0 &&
              day === today.getDate();
            return (
              <div
                key={i}
                className={`min-h-[78px] rounded-aura-sm border p-1.5 ${
                  day == null
                    ? 'border-transparent'
                    : isWeekend
                      ? 'border-[var(--border-soft)] bg-[var(--surface-sunken)]'
                      : 'border-[var(--border-soft)] bg-[var(--surface)]'
                }`}
              >
                {day != null && (
                  <span
                    className={`num text-xs ${
                      isToday
                        ? 'inline-grid h-5 w-5 place-items-center rounded-full bg-[var(--accent)] font-bold text-white'
                        : 'text-[var(--text-2)]'
                    }`}
                  >
                    {day}
                  </span>
                )}
                {events && (
                  <div className="mt-1 flex flex-col gap-1">
                    {events.slice(0, 3).map((e, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 truncate rounded-aura-xs bg-[color-mix(in_srgb,var(--chart-4)_16%,transparent)] px-1.5 py-0.5 text-2xs font-medium text-[var(--chart-4)]"
                      >
                        <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--chart-4)]" />
                        <span className="truncate">{e.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </Reveal>
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
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
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
