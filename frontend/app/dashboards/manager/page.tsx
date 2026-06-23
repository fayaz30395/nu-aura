'use client';

import React, {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  FolderKanban,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import {ChartLoadingFallback} from '@/lib/utils/lazy-components';
import {AppLayout} from '@/components/layout';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui';
import {EmptyState} from '@/components/ui/EmptyState';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useManagerDashboard, useManagerTeamProjects} from '@/lib/hooks/queries';
import type {
  ManagerTeamProjectsResponse,
  TeamMemberProjectAllocation,
  TeamMemberWithProjects,
} from '@/lib/types/core/dashboard';
import {formatDateShort} from '@/lib/utils/format/date';
import {MOTION_EASE} from '@/lib/animation';

// Single ease curve — matches the resources page blueprint.
const EASE = MOTION_EASE.outExpo;

const ManagerAttendanceTrendChart = dynamic(
  () => import('./ManagerCharts').then((mod) => ({default: mod.ManagerAttendanceTrendChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

const ManagerPerformanceRadarChart = dynamic(
  () => import('./ManagerCharts').then((mod) => ({default: mod.ManagerPerformanceRadarChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

const formatDate = (dateStr: string) => formatDateShort(dateStr);

const formatRole = (role: string) =>
  role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const getAllocationColor = (pct: number) => {
  if (pct > 100) return 'bg-danger-500';
  if (pct >= 75) return 'bg-accent-600';
  return 'bg-success-500';
};

const getAllocationTextColor = (pct: number) => {
  if (pct > 100) return 'text-danger-700 dark:text-danger-300';
  if (pct >= 75) return 'text-accent-700 dark:text-accent-300';
  return 'text-success-700 dark:text-success-300';
};

const priorityDotColor: Record<string, string> = {
  CRITICAL: 'bg-danger-500',
  HIGH: 'bg-warning-500',
  MEDIUM: 'bg-warning-500',
  LOW: 'bg-success-500',
};

const statusBadgeStyles: Record<string, string> = {
  IN_PROGRESS: 'bg-accent-500/10 text-accent-700 dark:text-accent-400 border-accent-500/20',
  PLANNED: 'bg-surface-500/10 text-surface-600 dark:text-surface-400 border-surface-500/20',
  DRAFT: 'bg-transparent text-surface-500 dark:text-surface-500 border-surface-300 dark:border-surface-600',
  COMPLETED: 'bg-success-500/10 text-success-700 dark:text-success-400 border-success-500/20',
  ON_HOLD: 'bg-warning-500/10 text-warning-700 dark:text-warning-400 border-warning-500/20',
};

export default function ManagerDashboardPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasPermission, isReady: permissionsReady} = usePermissions();
  const hasManagerAccess = hasPermission(Permissions.EMPLOYEE_VIEW_TEAM);
  const {data: dashboardData, isLoading: loading, error} = useManagerDashboard(
    hasHydrated && isAuthenticated && hasManagerAccess
  );
  const {
    data: teamProjectsData,
    isLoading: teamProjectsLoading,
    error: teamProjectsError,
  } = useManagerTeamProjects(hasHydrated && isAuthenticated && hasManagerAccess);
  const teamProjects: ManagerTeamProjectsResponse | undefined = teamProjectsData ?? undefined;

  useEffect(() => {
    if (!hasHydrated || !permissionsReady) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    if (!hasPermission(Permissions.EMPLOYEE_VIEW_TEAM)) {
      router.replace('/me/dashboard?denied=1');
      return;
    }
  }, [hasHydrated, permissionsReady, isAuthenticated, router, hasPermission]);

  if (!hasHydrated || !permissionsReady || !hasManagerAccess) {
    return null;
  }

  if (loading) {
    return (
      <AppLayout activeMenuItem="dashboard">
        <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
          <div className="space-y-2 max-w-2xl">
            <Skeleton className="h-3 w-32 rounded"/>
            <Skeleton className="h-10 w-96 rounded"/>
            <Skeleton className="h-4 w-72 rounded"/>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
                <Skeleton className="h-3 w-24 rounded"/>
                <Skeleton className="mt-3 h-9 w-20 rounded"/>
              </div>
            ))}
          </div>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
            <Skeleton className="h-64 rounded-2xl lg:col-span-7 lg:row-span-2"/>
            <Skeleton className="h-28 rounded-2xl lg:col-span-5"/>
            <Skeleton className="h-28 rounded-2xl lg:col-span-5"/>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !dashboardData) {
    return (
      <AppLayout activeMenuItem="dashboard">
        <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
          <PageHeader departmentName="—" healthStatus={null}/>
          <div role="alert"
               className="flex items-center gap-4 rounded-xl border border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 px-5 py-4">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden="true"/>
            <div className="flex-1 text-sm">
              <p className="font-medium text-danger-700 dark:text-danger-300">Team dashboard data unavailable</p>
              <p className="text-[var(--text-secondary)]">Some metrics may not be displayed.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </div>
          <div
            className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
            {['Team size', 'Present today', 'On leave', 'Pending actions'].map((label) => (
              <div key={label} className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
                <span className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
                <p className="mt-3 font-mono text-3xl sm:text-4xl tabular-nums tracking-tight text-[var(--text-heading)]">—</p>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const {teamOverview, teamAttendance, teamLeave, teamPerformance, actionItems, teamAlerts} = dashboardData;

  const attendanceTrendData = teamAttendance.weeklyTrend.map((day) => ({
    name: day.dayOfWeek.substring(0, 3),
    rate: parseFloat((day.attendanceRate || 0).toFixed(1)),
  }));

  const pulseData = [
    {subject: 'Goals', A: teamPerformance.goalCompletionRate || 0, fullMark: 100},
    {subject: 'Training', A: teamPerformance.trainingCompletionRate || 0, fullMark: 100},
    {subject: 'Feedback', A: (teamPerformance.avgFeedbackScore || 0) * 20, fullMark: 100},
    {subject: 'Engagement', A: teamPerformance.engagementScore || 0, fullMark: 100},
    {subject: 'Attendance', A: teamAttendance.weeklyAttendanceRate || 0, fullMark: 100},
  ];

  const overdueTotal = actionItems.overdueApprovals + actionItems.overdueReviews;

  return (
    <AppLayout activeMenuItem="dashboard">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader departmentName={dashboardData.departmentName} healthStatus={teamOverview.teamHealthStatus}/>

        <StatsRow
          totalTeamSize={teamOverview.totalTeamSize}
          directReports={teamOverview.directReports}
          presentToday={teamAttendance.presentToday}
          workFromHomeToday={teamAttendance.workFromHomeToday}
          onLeaveToday={teamAttendance.onLeaveToday}
          pendingApprovals={teamLeave.pendingApprovals}
          totalActionItems={actionItems.totalActionItems}
          overdueTotal={overdueTotal}
        />

        {/* Bento: hero analytics tile + performance + approvals + action items */}
        <BentoSection
          attendanceTrendData={attendanceTrendData}
          weeklyRate={teamAttendance.weeklyAttendanceRate}
          monthlyRate={teamAttendance.monthlyAttendanceRate}
          monthlyChange={teamAttendance.monthlyAttendanceChange}
          pulseData={pulseData}
          avgPerformanceRating={teamPerformance.avgPerformanceRating}
          goalCompletionRate={teamPerformance.goalCompletionRate}
          pendingLeaveCount={teamLeave.pendingLeaveRequests.length}
          actionItems={actionItems}
        />

        {/* Approval pipeline list (one-line rows, divide-y) */}
        <ApprovalsList
          items={teamLeave.pendingLeaveRequests}
        />

        {/* Team projects & allocations */}
        <TeamProjectsSection
          loading={teamProjectsLoading}
          error={!!teamProjectsError}
          data={teamProjects}
          onEmployee={(id) => router.push(`/employees/${id}`)}
          onProject={(id) => router.push(`/projects/${id}`)}
        />

        {/* Performance metrics: goals + engagement */}
        <PerformanceMetrics
          goalsOnTrack={teamPerformance.goalsOnTrack}
          goalsAtRisk={teamPerformance.goalsAtRisk}
          goalsCompleted={teamPerformance.goalsCompleted}
          goalCompletionRate={teamPerformance.goalCompletionRate}
          oneOnOnesCompletedThisMonth={teamPerformance.oneOnOnesCompletedThisMonth}
          oneOnOnesScheduled={teamPerformance.oneOnOnesScheduled}
          oneOnOnesOverdue={teamPerformance.oneOnOnesOverdue}
          avgFeedbackScore={teamPerformance.avgFeedbackScore}
          pendingFeedbackRequests={teamPerformance.pendingFeedbackRequests}
          trainingCompletionRate={teamPerformance.trainingCompletionRate}
        />

        {/* One-line alerts (strip per alert) */}
        {teamAlerts && teamAlerts.length > 0 && (
          <AlertsStrip alerts={teamAlerts.slice(0, 3).map((a) => ({
            id: String(a.id),
            type: a.type,
            title: a.title,
            description: a.description,
            actionRequired: a.actionRequired,
          }))}/>
        )}
      </div>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader({departmentName, healthStatus}: {departmentName: string; healthStatus: string | null}) {
  const healthTone =
    healthStatus === 'EXCELLENT'
      ? 'border-success-500/30 bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300'
      : healthStatus
        ? 'border-warning-500/30 bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]';

  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Team Pulse
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          Optimizing productivity for {departmentName}.
        </h1>
        <p className="text-body-secondary max-w-[55ch]">
          Track attendance, goals, approvals, and project allocations across your team.
        </p>
      </div>
      <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-1.5 text-xs font-semibold self-start sm:self-end ${healthTone}`}>
        <Activity className="h-3.5 w-3.5" aria-hidden="true"/>
        <span>Health: {healthStatus ? healthStatus.replace(/_/g, ' ') : '—'}</span>
      </div>
    </motion.header>
  );
}

// ── Stats row (border-y, no card boxes) ──────────────────────────────────────
function StatsRow({
                    totalTeamSize, directReports, presentToday, workFromHomeToday,
                    onLeaveToday, pendingApprovals, totalActionItems, overdueTotal,
                  }: {
  totalTeamSize: number;
  directReports: number;
  presentToday: number;
  workFromHomeToday: number;
  onLeaveToday: number;
  pendingApprovals: number;
  totalActionItems: number;
  overdueTotal: number;
}) {
  const items = [
    {label: 'Team force', value: totalTeamSize, sub: `${directReports} direct`, icon: Users, tone: 'neutral' as const},
    {label: 'Present today', value: presentToday, sub: `${workFromHomeToday} WFH`, icon: UserCheck, tone: 'neutral' as const},
    {label: 'Out of office', value: onLeaveToday, sub: `${pendingApprovals} pending`, icon: Calendar, tone: pendingApprovals > 0 ? 'warning' as const : 'neutral' as const},
    {label: 'Action items', value: totalActionItems, sub: overdueTotal > 0 ? `${overdueTotal} overdue` : 'all on track', icon: ClipboardList, tone: overdueTotal > 0 ? 'danger' as const : 'neutral' as const},
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
      aria-label="Team at a glance"
      className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{hidden: {opacity: 0, y: 6}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
          className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0"
        >
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <item.icon className="h-3.5 w-3.5" aria-hidden="true"/>
            <span className="text-2xs font-medium uppercase tracking-wider">{item.label}</span>
          </div>
          <p
            className={`mt-3 font-mono text-3xl sm:text-4xl tabular-nums tracking-tight ${
              item.tone === 'danger' ? 'text-danger-700 dark:text-danger-300'
                : item.tone === 'warning' ? 'text-warning-700 dark:text-warning-300'
                  : 'text-[var(--text-heading)]'
            }`}
          >
            {item.value}
          </p>
          <p className="mt-1 text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{item.sub}</p>
        </motion.div>
      ))}
    </motion.section>
  );
}

// ── Bento section: attendance hero + tiles ───────────────────────────────────
function BentoSection({
                        attendanceTrendData, weeklyRate, monthlyRate, monthlyChange,
                        pulseData, avgPerformanceRating, goalCompletionRate,
                        pendingLeaveCount, actionItems,
                      }: {
  attendanceTrendData: Array<{name: string; rate: number}>;
  weeklyRate: number;
  monthlyRate: number;
  monthlyChange: number;
  pulseData: Array<{subject: string; A: number; fullMark: number}>;
  avgPerformanceRating: number;
  goalCompletionRate: number;
  pendingLeaveCount: number;
  actionItems: {
    leaveApprovals: number;
    timesheetApprovals: number;
    performanceReviewsDue: number;
    oneOnOnesDue: number;
  };
}) {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}}}}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      aria-label="Pulse"
    >
      <BentoHero
        weeklyRate={weeklyRate}
        monthlyRate={monthlyRate}
        monthlyChange={monthlyChange}
        attendanceTrendData={attendanceTrendData}
      />
      <BentoTile
        title="Performance DNA"
        description={`Avg rating ${avgPerformanceRating?.toFixed(1) ?? '—'}/5.0 · ${goalCompletionRate?.toFixed(0) ?? '0'}% goals on track.`}
        icon={Star}
      >
        <div className="h-28">
          <ManagerPerformanceRadarChart data={pulseData}/>
        </div>
      </BentoTile>
      <BentoTile
        title="Approval pipeline"
        description="Leave, timesheet, and review approvals waiting on you."
        icon={FileText}
        badge={pendingLeaveCount > 0 ? pendingLeaveCount : undefined}
      >
        <ActionItemMiniGrid actionItems={actionItems}/>
      </BentoTile>
    </motion.section>
  );
}

function BentoHero({weeklyRate, monthlyRate, monthlyChange, attendanceTrendData}: {
  weeklyRate: number;
  monthlyRate: number;
  monthlyChange: number;
  attendanceTrendData: Array<{name: string; rate: number}>;
}) {
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: EASE}}}}
      className="lg:col-span-7 lg:row-span-2"
    >
      <div
        className="group block h-full rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-7 sm:p-9 transition-all hover:border-[var(--border-main)] hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] active:translate-y-px"
      >
        <div className="flex items-start justify-between">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <Activity className="h-5 w-5" aria-hidden="true"/>
          </div>
          <span className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Real-time</span>
        </div>
        <h2 className="mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-heading)]">
          Attendance flow
        </h2>
        <p className="mt-3 text-body-secondary max-w-[48ch]">
          Weekly and monthly attendance trends across the team.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div>
            <p className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Weekly</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl tabular-nums tracking-tight text-[var(--text-heading)]">
              {weeklyRate?.toFixed(1) ?? '0.0'}%
            </p>
          </div>
          <div>
            <p className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Monthly</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="font-mono text-2xl sm:text-3xl tabular-nums tracking-tight text-[var(--text-heading)]">
                {monthlyRate?.toFixed(1) ?? '0.0'}%
              </p>
              {monthlyChange !== 0 && (
                <span className={`inline-flex items-center gap-1 text-2xs font-semibold ${monthlyChange > 0
                  ? 'text-success-700 dark:text-success-300'
                  : 'text-danger-700 dark:text-danger-300'}`}>
                  {monthlyChange > 0 ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>}
                  {Math.abs(monthlyChange).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 h-36 w-full">
          <ManagerAttendanceTrendChart data={attendanceTrendData}/>
        </div>
      </div>
    </motion.div>
  );
}

function BentoTile({title, description, icon: Icon, badge, children}: {
  title: string;
  description: string;
  icon: React.ElementType;
  badge?: number;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
      className="lg:col-span-5"
    >
      <div
        className="group flex h-full flex-col gap-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 transition-all hover:border-[var(--border-main)] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.07)] active:translate-y-px"
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            <Icon className="h-4 w-4" aria-hidden="true"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-semibold text-[var(--text-heading)]">{title}</h3>
              {badge !== undefined && (
                <span
                  className="inline-flex items-center justify-center min-w-6 px-2 h-5 text-2xs font-semibold rounded-full bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300">
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function ActionItemMiniGrid({actionItems}: {
  actionItems: {
    leaveApprovals: number;
    timesheetApprovals: number;
    performanceReviewsDue: number;
    oneOnOnesDue: number;
  };
}) {
  const items = [
    {label: 'Leaves', count: actionItems.leaveApprovals, icon: Calendar},
    {label: 'Timesheets', count: actionItems.timesheetApprovals, icon: Clock},
    {label: 'Reviews', count: actionItems.performanceReviewsDue, icon: Target},
    {label: '1-on-1s', count: actionItems.oneOnOnesDue, icon: Users},
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 px-4 py-2"
        >
          <div className="flex items-center gap-2">
            <item.icon className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true"/>
            <span className="text-xs font-medium text-[var(--text-secondary)]">{item.label}</span>
          </div>
          <span className="font-mono text-sm tabular-nums font-semibold text-[var(--text-heading)]">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Approval pipeline list ───────────────────────────────────────────────────
function ApprovalsList({items}: {
  items: Array<{
    requestId: string | number;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    urgency?: string;
  }>;
}) {
  if (items.length === 0) {
    return (
      <motion.section
        initial={{opacity: 0, y: 6}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.45, ease: EASE, delay: 0.32}}
        className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-4"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300">
          <CheckCircle className="h-4 w-4" aria-hidden="true"/>
        </div>
        <div className="flex-1 text-sm">
          <p className="font-medium text-[var(--text-heading)]">Clear pipeline</p>
          <p className="text-[var(--text-secondary)]">All approvals are up to date.</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.32}}
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
          Approvals waiting on you
        </h2>
        <span className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {items.length} active
        </span>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {items.slice(0, 5).map((leave) => (
          <li key={leave.requestId} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 sm:gap-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 font-semibold text-xs">
              {leave.employeeName?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--text-heading)] truncate">{leave.employeeName}</p>
                {leave.urgency === 'HIGH' && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger-500" aria-label="High urgency"/>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {leave.leaveType} · {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
              </p>
            </div>
            <p className="font-mono text-sm font-semibold tabular-nums text-[var(--text-heading)]">
              {leave.days}d
            </p>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

// ── Team projects & allocations ──────────────────────────────────────────────
function TeamProjectsSection({loading, error, data, onEmployee, onProject}: {
  loading: boolean;
  error: boolean;
  data: {
    summary?: {totalReports: number; allocatedCount: number; unallocatedCount: number; avgAllocation: number};
    teamMembers: TeamMemberWithProjects[];
  } | undefined;
  onEmployee: (id: string | number) => void;
  onProject: (id: string | number) => void;
}) {
  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.38}}
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
            Team projects & allocations
          </h2>
          {data?.summary && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {data.summary.totalReports} reports · {data.summary.allocatedCount} allocated · {data.summary.unallocatedCount} unallocated · avg {data.summary.avgAllocation}%
            </p>
          )}
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({length: 3}).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl"/>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <Briefcase className="h-4 w-4" aria-hidden="true"/>
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-[var(--text-heading)]">Coming soon</p>
            <p className="text-[var(--text-secondary)]">Team project allocations will appear here once the feature is deployed.</p>
          </div>
        </div>
      )}

      {!loading && !error && data && data.teamMembers.length === 0 && (
        <EmptyState
          icon={<FolderKanban className="h-8 w-8"/>}
          title="No project data"
          description="No team members have project allocations yet."
        />
      )}

      {!loading && !error && data && data.teamMembers.length > 0 && (
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {data.teamMembers.map((member) => (
            <li key={member.employeeId} className="py-5 space-y-4">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 font-semibold text-xs">
                  {member.employeeName?.charAt(0) ?? '?'}
                </div>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onEmployee(member.employeeId)}
                    className="text-sm font-medium text-[var(--text-heading)] hover:text-accent-700 dark:hover:text-accent-300 transition-colors text-left truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
                  >
                    {member.employeeName}
                  </button>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {member.designation} · {member.employeeCode}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {member.isOverAllocated && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300 px-2 py-0.5 text-2xs font-semibold">
                      <AlertTriangle className="h-3 w-3"/>
                      Over
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getAllocationColor(member.totalAllocation)}`}
                        style={{width: `${Math.min(member.totalAllocation, 100)}%`}}
                      />
                    </div>
                    <span className={`font-mono text-sm font-semibold tabular-nums ${getAllocationTextColor(member.totalAllocation)}`}>
                      {member.totalAllocation}%
                    </span>
                  </div>
                </div>
              </div>

              {member.projects.length > 0 ? (
                <ul className="ml-13 space-y-1.5 pl-13">
                  {member.projects.map((project: TeamMemberProjectAllocation) => (
                    <li
                      key={project.projectId}
                      className="flex items-center justify-between gap-4 rounded-xl bg-[var(--bg-surface)]/50 hover:bg-[var(--bg-surface)] transition-colors px-4 py-2 group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${priorityDotColor[project.projectPriority] || 'bg-surface-400'}`}
                          aria-hidden="true"
                        />
                        <button
                          type="button"
                          onClick={() => onProject(project.projectId)}
                          className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-heading)] hover:text-accent-700 dark:hover:text-accent-300 transition-colors truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
                        >
                          <span className="truncate">{project.projectName}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"/>
                        </button>
                        <Badge
                          variant="outline"
                          className={`text-2xs font-semibold uppercase tracking-wider border ${statusBadgeStyles[project.projectStatus] || statusBadgeStyles.DRAFT}`}
                        >
                          {project.projectStatus?.replace(/_/g, ' ') ?? '-'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] shrink-0">
                        <span className="hidden sm:inline">{formatRole(project.role)}</span>
                        <span className="font-mono tabular-nums font-semibold text-[var(--text-heading)]">{project.allocationPercentage}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ml-13 pl-13 text-xs italic text-[var(--text-muted)]">
                  No active project assignments
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}

// ── Performance metrics: goals + engagement ──────────────────────────────────
function PerformanceMetrics({
                              goalsOnTrack, goalsAtRisk, goalsCompleted, goalCompletionRate,
                              oneOnOnesCompletedThisMonth, oneOnOnesScheduled, oneOnOnesOverdue,
                              avgFeedbackScore, pendingFeedbackRequests, trainingCompletionRate,
                            }: {
  goalsOnTrack: number;
  goalsAtRisk: number;
  goalsCompleted: number;
  goalCompletionRate: number;
  oneOnOnesCompletedThisMonth: number;
  oneOnOnesScheduled: number;
  oneOnOnesOverdue: number;
  avgFeedbackScore: number;
  pendingFeedbackRequests: number;
  trainingCompletionRate: number;
}) {
  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.44}}
      className="grid gap-4 lg:grid-cols-2"
    >
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true"/>
          <h3 className="text-base font-semibold text-[var(--text-heading)]">Team goals</h3>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
          {[
            {label: 'On track', value: goalsOnTrack, tone: 'success' as const},
            {label: 'At risk', value: goalsAtRisk, tone: 'warning' as const},
            {label: 'Completed', value: goalsCompleted, tone: 'neutral' as const},
          ].map((g, i) => (
            <div key={g.label} className={`py-4 ${i === 0 ? 'pl-0 pr-3' : i === 2 ? 'pl-3 pr-0' : 'px-4'}`}>
              <p className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{g.label}</p>
              <p className={`mt-1 font-mono text-2xl tabular-nums tracking-tight ${
                g.tone === 'success' ? 'text-success-700 dark:text-success-300'
                  : g.tone === 'warning' ? 'text-warning-700 dark:text-warning-300'
                    : 'text-[var(--text-heading)]'
              }`}>
                {g.value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Completion rate</span>
            <span className="font-mono tabular-nums font-semibold text-[var(--text-heading)]">{goalCompletionRate?.toFixed(0) ?? 0}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--bg-surface)] overflow-hidden">
            <div className="h-full rounded-full bg-accent-600 transition-all duration-500" style={{width: `${goalCompletionRate ?? 0}%`}}/>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true"/>
          <h3 className="text-base font-semibold text-[var(--text-heading)]">Engagement & feedback</h3>
        </div>
        <ul className="mt-5 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          <li className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-heading)]">One-on-ones this month</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Scheduled: {oneOnOnesScheduled}
                {oneOnOnesOverdue > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-danger-700 dark:text-danger-300">
                    <AlertCircle className="h-3 w-3"/>
                    {oneOnOnesOverdue} overdue
                  </span>
                )}
              </p>
            </div>
            <p className="font-mono text-lg font-semibold tabular-nums text-[var(--text-heading)]">{oneOnOnesCompletedThisMonth}</p>
          </li>
          <li className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-heading)]">Average feedback score</p>
              {pendingFeedbackRequests > 0 && (
                <p className="text-xs text-warning-700 dark:text-warning-300 inline-flex items-center gap-1">
                  <Clock className="h-3 w-3"/>
                  {pendingFeedbackRequests} pending
                </p>
              )}
            </div>
            <p className="font-mono text-lg font-semibold tabular-nums text-[var(--text-heading)]">{avgFeedbackScore?.toFixed(1) ?? '—'}</p>
          </li>
          <li className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
            <p className="text-sm font-medium text-[var(--text-heading)]">Training completion</p>
            <p className="font-mono text-lg font-semibold tabular-nums text-[var(--text-heading)]">{trainingCompletionRate?.toFixed(0) ?? 0}%</p>
          </li>
        </ul>
      </div>
    </motion.section>
  );
}

// ── One-line alerts strip ────────────────────────────────────────────────────
function AlertsStrip({alerts}: {
  alerts: Array<{id: string; type: string; title: string; description: string; actionRequired: string}>;
}) {
  return (
    <motion.aside
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.5}}
      role="status"
      aria-live="polite"
      className="space-y-2"
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 px-5 py-4"
        >
          <div className="flex items-center gap-4 text-sm min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden="true"/>
            <div className="min-w-0">
              <p className="text-[var(--text-primary)] truncate">
                <span className="font-semibold">{alert.title}</span>
                <span className="text-[var(--text-secondary)]"> · {alert.description}</span>
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0">
            {alert.actionRequired || 'Resolve'}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true"/>
          </Button>
        </div>
      ))}
    </motion.aside>
  );
}
