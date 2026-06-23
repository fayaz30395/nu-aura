'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui/Skeleton';
import {ResourceManagementApiError} from '@/lib/services/hrms/resource-management.service';
import {useMyPendingApprovals, useWorkloadDashboard} from '@/lib/hooks/queries/useResources';
import {CreateAllocationModal} from '@/components/resource-management/CreateAllocationModal';
import {MOTION_EASE} from '@/lib/animation';

// Single ease curve for every transition on this page. Avoids the cubic-bezier
// drift that compounds when each motion spec picks its own easing.
const EASE = MOTION_EASE.outExpo;

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const router = useRouter();
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();
  const hasAccess = hasAnyPermission(Permissions.RESOURCE_VIEW, Permissions.RESOURCE_MANAGE);

  useEffect(() => {
    if (permissionsReady && !hasAccess) router.replace('/me/dashboard?denied=1');
  }, [permissionsReady, hasAccess, router]);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useWorkloadDashboard({});
  const {data: pendingData, isLoading: pendingLoading, error: pendingError} = useMyPendingApprovals(0, 5);

  const isApiNotAvailable =
    (dashboardError instanceof Error &&
      (dashboardError as unknown as ResourceManagementApiError).isApiNotAvailable) ?? false;
  const isLoading = dashboardLoading || pendingLoading;
  const error = dashboardError || pendingError;

  if (!permissionsReady || !hasAccess) return null;

  const summary = dashboardData?.summary ?? null;
  const pendingApprovals = pendingData?.content ?? [];

  if (isApiNotAvailable) {
    return (
      <AppLayout>
        <ApiUnavailable onRetry={() => refetchDashboard()} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader onCreate={() => setShowCreateModal(true)} />

        <CreateAllocationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => refetchDashboard()}
        />

        {error && !isApiNotAvailable && (
          <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load data'}
                       onRetry={() => refetchDashboard()} />
        )}

        {/* Stats row — borders, not card boxes, for breathable density */}
        {isLoading ? (
          <StatsSkeleton />
        ) : summary ? (
          <StatsRow
            totalEmployees={summary.totalEmployees}
            averageAllocation={Math.round(summary.averageAllocation)}
            overAllocatedCount={summary.overAllocatedCount}
            pendingApprovals={summary.pendingApprovals}
          />
        ) : null}

        {/* Bento — one wide entry + four refined tiles, asymmetric layout */}
        <BentoNavigation pendingCount={pendingApprovals.length} />

        {/* Optional sections, conditional */}
        {pendingApprovals.length > 0 && (
          <PendingApprovalsPreview items={pendingApprovals.slice(0, 3)} />
        )}

        {summary && summary.overAllocatedCount > 0 && (
          <AttentionStrip count={summary.overAllocatedCount} />
        )}
      </div>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader({onCreate}: {onCreate: () => void}) {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Resource Management
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          Capacity, allocations, and availability in one place.
        </h1>
        <p className="text-body-secondary max-w-[55ch]">
          Plan ahead, prevent over-allocation, and keep delivery teams predictable.
        </p>
      </div>
      <Button variant="primary" onClick={onCreate} className="self-start sm:self-end">
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Create allocation
      </Button>
    </motion.header>
  );
}

// ── Stats row (no card boxes, borders divide instead) ────────────────────────
function StatsRow({totalEmployees, averageAllocation, overAllocatedCount, pendingApprovals}: {
  totalEmployees: number;
  averageAllocation: number;
  overAllocatedCount: number;
  pendingApprovals: number;
}) {
  const items = [
    {label: 'Headcount', value: totalEmployees, icon: Users, tone: 'neutral' as const},
    {label: 'Average allocation', value: `${averageAllocation}%`, icon: TrendingUp, tone: 'neutral' as const},
    {label: 'Over-allocated', value: overAllocatedCount, icon: AlertTriangle, tone: overAllocatedCount > 0 ? 'danger' as const : 'neutral' as const},
    {label: 'Pending approvals', value: pendingApprovals, icon: Clock, tone: pendingApprovals > 0 ? 'warning' as const : 'neutral' as const},
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
      aria-label="Workload at a glance"
      className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{hidden: {opacity: 0, y: 6}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
          className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0"
        >
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
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
function BentoNavigation({pendingCount}: {pendingCount: number}) {
  const hero = {
    title: 'Workload dashboard',
    description: 'Allocation heatmaps and utilization across the org. Spot the patterns before they become incidents.',
    icon: BarChart3,
    href: '/resources/workload',
  };

  const tiles = [
    {
      title: 'Resource pool',
      description: 'Browse every employee, filter by department, see live allocation bars.',
      icon: Users,
      href: '/resources/pool',
    },
    {
      title: 'Capacity timeline',
      description: 'Horizontal bars per employee, sorted by utilization.',
      icon: TrendingUp,
      href: '/resources/capacity',
    },
    {
      title: 'Availability calendar',
      description: 'Team availability against leaves and holidays.',
      icon: Calendar,
      href: '/resources/availability',
    },
    {
      title: 'Pending approvals',
      description: 'Review over-allocation requests waiting on your decision.',
      icon: Clock,
      href: '/resources/approvals',
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}}}}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      aria-label="Explore"
    >
      <BentoHero {...hero} />
      {tiles.map((tile) => (
        <BentoTile key={tile.href} {...tile} />
      ))}
    </motion.section>
  );
}

function BentoHero({title, description, icon: Icon, href}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: EASE}}}}
      className="lg:col-span-7 lg:row-span-2"
    >
      <Link
        href={href}
        className="group block h-full rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-7 sm:p-9 transition-all hover:border-[var(--border-main)] hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
        <h2 className="mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-heading)]">
          {title}
        </h2>
        <p className="mt-3 text-body-secondary max-w-[48ch]">
          {description}
        </p>
        <div className="mt-10 flex items-end justify-between gap-6">
          <BentoHeroBars />
          <p className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Live data
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

// Decorative non-interactive bars hinting at the dashboard content.
function BentoHeroBars() {
  const widths = [42, 78, 63, 91, 55, 70, 38, 84];
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

function BentoTile({title, description, icon: Icon, href, badge}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}) {
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
      className="lg:col-span-5"
    >
      <Link
        href={href}
        className="group flex h-full items-start gap-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 transition-all hover:border-[var(--border-main)] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.07)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-[var(--text-heading)]">{title}</h3>
            {badge !== undefined && (
              <span className="inline-flex items-center justify-center min-w-6 px-2 h-5 text-2xs font-semibold rounded-full bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 self-center text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}

// ── Pending approvals preview ────────────────────────────────────────────────
function PendingApprovalsPreview({items}: {
  items: Array<{
    id: string | number;
    employeeName: string;
    projectName: string;
    requestedAllocation: number;
    resultingAllocation: number;
    requestedByName: string;
  }>;
}) {
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
        <Link
          href="/resources/approvals"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 dark:text-accent-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {items.map((a) => (
          <li key={a.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 sm:gap-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
              <Users className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-heading)] truncate">{a.employeeName}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {a.projectName} · requested {a.requestedAllocation}% by {a.requestedByName}
              </p>
            </div>
            <p className="font-mono text-sm font-semibold tabular-nums text-danger-700 dark:text-danger-300">
              {a.resultingAllocation}%
            </p>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

// ── Attention strip (replaces former alert card) ─────────────────────────────
function AttentionStrip({count}: {count: number}) {
  return (
    <motion.aside
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.42}}
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-xl border border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 px-5 py-4"
    >
      <div className="flex items-center gap-4 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden="true" />
        <p className="text-[var(--text-primary)]">
          <span className="font-semibold">{count}</span>{' '}
          {count === 1 ? 'employee is' : 'employees are'} above 100% allocation. Review before delivery slips.
        </p>
      </div>
      <Link href="/resources/workload?status=OVER_ALLOCATED">
        <Button variant="outline" size="sm">
          Review
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </Link>
    </motion.aside>
  );
}

// ── Error + API-unavailable variants ─────────────────────────────────────────
function ErrorBanner({message, onRetry}: {message: string; onRetry: () => void}) {
  return (
    <div role="alert" className="flex items-center gap-4 rounded-xl border border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 px-5 py-4">
      <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-danger-700 dark:text-danger-300">Could not load data</p>
        <p className="text-[var(--text-secondary)]">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

function ApiUnavailable({onRetry}: {onRetry: () => void}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center space-y-6">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300">
        <Settings className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-heading)]">
          Resource Management API isn&apos;t online yet
        </h1>
        <p className="text-body-secondary max-w-[60ch] mx-auto">
          The backend endpoints that power workload heatmaps, capacity, and availability are not yet
          deployed. Once they are reachable this page will populate automatically.
        </p>
      </div>
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Retry connection
        </Button>
        <Link href="/dashboard">
          <Button variant="primary">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
