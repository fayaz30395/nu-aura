'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import dynamic from 'next/dynamic';
import {motion} from 'framer-motion';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {Skeleton} from '@/components/ui/Skeleton';
import {ChartLoadingFallback} from '@/lib/utils/lazy-components';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import type {DashboardAnalyticsParams} from '@/lib/hooks/queries/useAnalytics';
import {useDashboardAnalytics} from '@/lib/hooks/queries/useAnalytics';
import type {
  DepartmentDistribution,
  LeaveTypeDistribution,
  PayrollTrendData,
  TrendData,
} from '@/lib/types/core/analytics';
import {chartColors} from '@/lib/utils/theme-colors';
import {formatCurrency} from '@/lib/utils';
import {BarChart3 as BarChart3Icon, PieChart as PieChartIcon} from 'lucide-react';
import {MOTION_EASE} from '@/lib/animation';

const AnalyticsAttendanceTrendChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsAttendanceTrendChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const AnalyticsAttendancePieChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsAttendancePieChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const AnalyticsDeptBarChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsDeptBarChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const AnalyticsLeavePieChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsLeavePieChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const AnalyticsPayrollChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsPayrollChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const AnalyticsHeadcountChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsHeadcountChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

// Single ease curve for every transition on this page.
const EASE = MOTION_EASE.outExpo;

const COLORS = chartColors.palette();

type TimeRange = '7d' | '30d' | '90d' | 'custom';

export default function AnalyticsPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyPermission, isReady: permReady} = usePermissions();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const analyticsParams: DashboardAnalyticsParams | undefined =
    timeRange === 'custom' && customStart && customEnd
      ? {startDate: customStart, endDate: customEnd}
      : undefined;

  const {data: analytics, isLoading, error, refetch} = useDashboardAnalytics(
    isAuthenticated && hasHydrated,
    analyticsParams
  );

  React.useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) router.replace('/auth/login');
  }, [hasHydrated, isAuthenticated, router]);

  const canViewAnalytics = hasAnyPermission(Permissions.REPORT_VIEW, Permissions.ANALYTICS_VIEW);
  React.useEffect(() => {
    if (!permReady) return;
    if (!canViewAnalytics) router.replace('/me/dashboard?denied=1');
  }, [permReady, canViewAnalytics, router]);

  if (!permReady || !canViewAnalytics) return null;

  const showLoading = !hasHydrated || isLoading;

  return (
    <AppLayout activeMenuItem="analytics">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          onRefresh={() => refetch()}
        />

        {error && !showLoading && (
          <ErrorBanner
            message={error instanceof Error ? error.message : 'Unable to load analytics data'}
            onRetry={() => refetch()}
          />
        )}

        {showLoading ? (
          <>
            <StatsSkeleton/>
            <BentoSkeleton/>
          </>
        ) : analytics ? (
          <>
            <StatsRow
              total={analytics.headcount.total}
              growth={analytics.headcount.growthPercentage}
              attendance={analytics.attendance.attendancePercentage}
              leaveUtil={analytics.leave.utilizationPercentage}
              payroll={analytics.payroll ? formatCurrency(analytics.payroll.currentMonth.total) : '—'}
            />

            <BentoCharts
              attendanceTrend={analytics.attendance.trend || []}
              attendancePie={[
                {name: 'Present', value: analytics.attendance.present, color: chartColors.success()},
                {name: 'On Leave', value: analytics.attendance.onLeave, color: chartColors.warning()},
                {name: 'Absent', value: analytics.attendance.absent, color: chartColors.danger()},
              ].filter((d) => d.value > 0)}
              departments={analytics.headcount.departmentDistribution || []}
              leave={analytics.leave.distribution || []}
              payrollTrend={analytics.payroll?.costTrend || []}
              headcountTrend={analytics.headcount.trend || []}
              hasPayroll={Boolean(analytics.payroll)}
            />

            <QuickStatsList
              onTime={analytics.attendance.onTime}
              late={analytics.attendance.late}
              newJoiners={analytics.headcount.newJoinees}
              exits={analytics.headcount.exits}
            />

            <LeaveSummaryList
              pending={analytics.leave.pending}
              approved={analytics.leave.approved}
              rejected={analytics.leave.rejected}
            />

            {analytics.headcount.growthPercentage < 0 && (
              <AttentionStrip
                tone="warning"
                message={
                  <>
                    <span className="font-semibold">Headcount dropped {Math.abs(analytics.headcount.growthPercentage)}%</span>{' '}
                    versus last month. Review attrition before it compounds.
                  </>
                }
              />
            )}
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader({
  timeRange,
  onTimeRangeChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  onRefresh,
}: {
  timeRange: TimeRange;
  onTimeRangeChange: (v: TimeRange) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
  onRefresh: () => void;
}) {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Analytics
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          People, attendance, and payroll signals in one view.
        </h1>
        <p className="text-body-secondary max-w-[55ch]">
          Watch the trends that matter. Catch the drift before it shows up in delivery.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4 self-start sm:self-end">
        <div className="inline-flex items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-1">
          {(['7d', '30d', '90d', 'custom'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onTimeRangeChange(range)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 ${
                timeRange === range
                  ? 'bg-accent-700 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
              }`}
              aria-pressed={timeRange === range}
            >
              {range === '7d' ? '7 days' : range === '30d' ? '30 days' : range === '90d' ? '90 days' : 'Custom'}
            </button>
          ))}
        </div>
        {timeRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => onCustomStartChange(e.target.value)}
              className="input-aura px-4 py-1.5 text-xs"
              aria-label="Start date"
            />
            <span className="text-xs text-[var(--text-muted)]">to</span>
            <input
              type="date"
              value={customEnd}
              min={customStart || undefined}
              onChange={(e) => onCustomEndChange(e.target.value)}
              className="input-aura px-4 py-1.5 text-xs"
              aria-label="End date"
            />
          </div>
        )}
        <Button variant="outline" size="sm" onClick={onRefresh} leftIcon={<RefreshCw className="h-4 w-4"/>}>
          Refresh
        </Button>
      </div>
    </motion.header>
  );
}

// ── Stats row (border-y + divide-x, no card boxes) ───────────────────────────
function StatsRow({
  total,
  growth,
  attendance,
  leaveUtil,
  payroll,
}: {
  total: number;
  growth: number;
  attendance: number;
  leaveUtil: number;
  payroll: string;
}) {
  const TrendIcon = growth >= 0 ? TrendingUp : TrendingDown;
  const items = [
    {
      label: 'Headcount',
      value: total.toLocaleString(),
      hint: (
        <span className="inline-flex items-center gap-1 text-xs">
          <TrendIcon className={`h-3 w-3 ${growth >= 0 ? 'text-success-600' : 'text-danger-600'}`} aria-hidden="true"/>
          <span className={growth >= 0 ? 'text-success-700 dark:text-success-300' : 'text-danger-700 dark:text-danger-300'}>
            {Math.abs(growth)}%
          </span>
          <span className="text-[var(--text-muted)]">vs last month</span>
        </span>
      ),
    },
    {label: 'Attendance', value: `${attendance}%`, hint: <span className="text-xs text-[var(--text-muted)]">present today</span>},
    {label: 'Leave utilization', value: `${leaveUtil}%`, hint: <span className="text-xs text-[var(--text-muted)]">pending approvals tracked</span>},
    {label: 'Monthly payroll', value: payroll, hint: <span className="text-xs text-[var(--text-muted)]">current cycle</span>},
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
      aria-label="Key metrics"
      className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{hidden: {opacity: 0, y: 6}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
          className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0"
        >
          <p className="text-micro">{item.label}</p>
          <p className="text-stat-large mt-3 tracking-tight">{item.value}</p>
          <div className="mt-2">{item.hint}</div>
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
          <Skeleton className="h-3 w-24 rounded"/>
          <Skeleton className="mt-3 h-9 w-24 rounded"/>
          <Skeleton className="mt-2 h-3 w-32 rounded"/>
        </div>
      ))}
    </div>
  );
}

// ── Bento charts (varied tile sizes — not a 3-col grid) ──────────────────────
function BentoCharts({
  attendanceTrend,
  attendancePie,
  departments,
  leave,
  payrollTrend,
  headcountTrend,
  hasPayroll,
}: {
  attendanceTrend: TrendData[];
  attendancePie: Array<{name: string; value: number; color: string}>;
  departments: DepartmentDistribution[];
  leave: LeaveTypeDistribution[];
  payrollTrend: PayrollTrendData[];
  headcountTrend: TrendData[];
  hasPayroll: boolean;
}) {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}}}}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12 lg:grid-rows-[auto_auto]"
      aria-label="Charts"
    >
      {/* Wide: attendance trend */}
      <BentoTile
        className="lg:col-span-8 lg:row-span-1"
        title="Attendance trend"
        description="Daily attendance over the selected range"
        icon={Activity}
        accent
      >
        <div className="h-[260px]">
          {attendanceTrend.length > 0 ? (
            <AnalyticsAttendanceTrendChart data={attendanceTrend}/>
          ) : (
            <EmptyState
              icon={<TrendingUp className="h-8 w-8"/>}
              title="No attendance trend data"
              description="Daily attendance data will appear once entries are logged."
            />
          )}
        </div>
      </BentoTile>

      {/* Narrow: today's attendance pie */}
      <BentoTile
        className="lg:col-span-4 lg:row-span-1"
        title="Today"
        description="Attendance breakdown"
        icon={UserCheck}
      >
        <div className="h-[260px] flex items-center">
          {attendancePie.length > 0 ? (
            <AnalyticsAttendancePieChart data={attendancePie}/>
          ) : (
            <EmptyState
              icon={<PieChartIcon className="h-7 w-7"/>}
              title="No attendance data"
              description="Today's breakdown appears once entries are recorded."
            />
          )}
        </div>
      </BentoTile>

      {/* Medium: departments */}
      <BentoTile
        className="lg:col-span-5"
        title="Department distribution"
        description="Employees by department"
        icon={Users}
      >
        <div className="h-[260px]">
          {departments.length > 0 ? (
            <AnalyticsDeptBarChart data={departments}/>
          ) : (
            <EmptyState
              icon={<BarChart3Icon className="h-7 w-7"/>}
              title="No department data"
              description="Headcount by department appears once employees are assigned."
            />
          )}
        </div>
      </BentoTile>

      {/* Medium: leave */}
      <BentoTile
        className="lg:col-span-4"
        title="Leave by type"
        description="Requests by category"
        icon={Calendar}
      >
        <div className="h-[260px]">
          {leave.length > 0 ? (
            <AnalyticsLeavePieChart data={leave} colors={COLORS}/>
          ) : (
            <EmptyState
              icon={<Calendar className="h-7 w-7"/>}
              title="No leave data"
              description="Leave requests grouped by category appear once filed."
            />
          )}
        </div>
      </BentoTile>

      {/* Narrow: headcount trend strip */}
      <BentoTile
        className="lg:col-span-3"
        title="Headcount"
        description="Employee count over time"
        icon={TrendingUp}
      >
        <div className="h-[260px]">
          {headcountTrend.length > 0 ? (
            <AnalyticsHeadcountChart data={headcountTrend}/>
          ) : (
            <EmptyState
              icon={<TrendingUp className="h-7 w-7"/>}
              title="No trend yet"
              description="Headcount over time appears once tracked."
            />
          )}
        </div>
      </BentoTile>

      {/* Full-width: payroll only if available */}
      {hasPayroll && payrollTrend.length > 0 && (
        <BentoTile
          className="lg:col-span-12"
          title="Payroll trend"
          description="Monthly payroll costs over time"
          icon={DollarSign}
          accent
        >
          <div className="h-[280px]">
            <AnalyticsPayrollChart data={payrollTrend}/>
          </div>
        </BentoTile>
      )}
    </motion.section>
  );
}

function BentoTile({
  className,
  title,
  description,
  icon: Icon,
  accent,
  children,
}: {
  className?: string;
  title: string;
  description: string;
  icon: React.ElementType;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.45, ease: EASE}}}}
      className={className}
    >
      <div className="h-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 transition-all hover:border-[var(--border-main)]">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              accent
                ? 'bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true"/>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[var(--text-heading)] truncate">{title}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </motion.div>
  );
}

function BentoSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
      <Skeleton className="lg:col-span-8 h-[340px] rounded-xl"/>
      <Skeleton className="lg:col-span-4 h-[340px] rounded-xl"/>
      <Skeleton className="lg:col-span-5 h-[340px] rounded-xl"/>
      <Skeleton className="lg:col-span-4 h-[340px] rounded-xl"/>
      <Skeleton className="lg:col-span-3 h-[340px] rounded-xl"/>
    </div>
  );
}

// ── Drill-down lists (divide-y, no nested cards) ─────────────────────────────
function QuickStatsList({
  onTime,
  late,
  newJoiners,
  exits,
}: {
  onTime: number;
  late: number;
  newJoiners: number;
  exits: number;
}) {
  const rows = [
    {label: 'On time today', value: onTime, tone: 'success' as const},
    {label: 'Late today', value: late, tone: 'warning' as const},
    {label: 'New joiners', value: newJoiners, tone: 'accent' as const},
    {label: 'Exits this month', value: exits, tone: 'danger' as const},
  ];

  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.32}}
      className="space-y-4"
      aria-label="Today at a glance"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
          Today at a glance
        </h2>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {rows.map((row) => (
          <li key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
            <p className="text-sm text-[var(--text-primary)]">{row.label}</p>
            <p
              className={`font-mono text-lg font-semibold tabular-nums ${
                row.tone === 'success' ? 'text-success-700 dark:text-success-300'
                  : row.tone === 'warning' ? 'text-warning-700 dark:text-warning-300'
                  : row.tone === 'danger' ? 'text-danger-700 dark:text-danger-300'
                  : 'text-accent-700 dark:text-accent-300'
              }`}
            >
              {row.value.toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function LeaveSummaryList({
  pending,
  approved,
  rejected,
}: {
  pending: number;
  approved: number;
  rejected: number;
}) {
  const rows = [
    {label: 'Pending', value: pending, tone: 'warning' as const},
    {label: 'Approved', value: approved, tone: 'success' as const},
    {label: 'Rejected', value: rejected, tone: 'danger' as const},
  ];

  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.38}}
      className="space-y-4"
      aria-label="Leave request summary"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
          Leave requests
        </h2>
        <p className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Current cycle
        </p>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {rows.map((row) => (
          <li key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
            <p className="text-sm text-[var(--text-primary)]">{row.label}</p>
            <p
              className={`font-mono text-lg font-semibold tabular-nums ${
                row.tone === 'success' ? 'text-success-700 dark:text-success-300'
                  : row.tone === 'warning' ? 'text-warning-700 dark:text-warning-300'
                  : 'text-danger-700 dark:text-danger-300'
              }`}
            >
              {row.value.toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

// ── Attention strip (one-line alert) ─────────────────────────────────────────
function AttentionStrip({tone, message}: {tone: 'warning' | 'danger'; message: React.ReactNode}) {
  const styles =
    tone === 'danger'
      ? 'border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30'
      : 'border-warning-200 bg-warning-50/40 dark:border-warning-700/40 dark:bg-warning-950/30';
  const iconColor = tone === 'danger' ? 'text-danger-600 dark:text-danger-400' : 'text-warning-600 dark:text-warning-400';

  return (
    <motion.aside
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.42}}
      role="status"
      aria-live="polite"
      className={`flex items-center gap-4 rounded-xl border ${styles} px-5 py-4`}
    >
      <AlertTriangle className={`h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true"/>
      <p className="text-sm text-[var(--text-primary)]">{message}</p>
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
      <AlertCircle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden="true"/>
      <div className="flex-1 text-sm">
        <p className="font-medium text-danger-700 dark:text-danger-300">Could not load analytics</p>
        <p className="text-[var(--text-secondary)]">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true"/>
        Retry
      </Button>
    </div>
  );
}
