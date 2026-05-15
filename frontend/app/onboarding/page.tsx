'use client';

import React, {useMemo} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckSquare,
  ClipboardList,
  Clock,
  FileText,
  Layout as LayoutIcon,
  RefreshCw,
  UserPlus,
  Users,
} from 'lucide-react';

import {useAuth} from '@/lib/hooks/useAuth';
import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui/Skeleton';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {REVIEW_STATUS} from '@/lib/status/vocabulary';
import {useOnboardingProcesses} from '@/lib/hooks/queries/useOnboarding';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {formatDate} from '@/lib/utils/format/date';
import type {OnboardingProcess} from '@/lib/types/hire/onboarding';

// Single ease curve for every transition on this page.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function OnboardingPage() {
  const router = useRouter();
  useAuth();
  const {hasAnyPermission} = usePermissions();
  const canView = hasAnyPermission(
    Permissions.ONBOARDING_VIEW,
    Permissions.ONBOARDING_MANAGE,
    Permissions.ONBOARDING_CREATE,
  );

  const {data, isLoading, isError, error, refetch} = useOnboardingProcesses(0, 100);
  // Memoised so the derived useMemo hooks below don't churn every render
  // when `data` is undefined and the fallback `[]` would be a new array each
  // time. Keeps `processes` referentially stable while data is loading.
  const processes: OnboardingProcess[] = useMemo(() => data?.content ?? [], [data]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(now.getDate() + 7);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const active = processes.filter((p) => p.status === 'IN_PROGRESS').length;
    const joiningThisWeek = processes.filter((p) => {
      const start = new Date(p.startDate);
      return start >= now && start <= weekAhead;
    }).length;
    const overdue = processes.filter((p) => {
      if (p.status === 'COMPLETED' || p.status === 'CANCELLED') return false;
      if (!p.expectedCompletionDate) return false;
      return new Date(p.expectedCompletionDate) < now;
    }).length;
    const completedYtd = processes.filter((p) => {
      if (p.status !== 'COMPLETED') return false;
      const done = p.actualCompletionDate ?? p.updatedAt;
      return new Date(done) >= yearStart;
    }).length;

    return {active, joiningThisWeek, overdue, completedYtd};
  }, [processes]);

  const joiningThisWeekList = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(now.getDate() + 7);
    return processes
      .filter((p) => {
        const start = new Date(p.startDate);
        return start >= now && start <= weekAhead;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  }, [processes]);

  if (!canView) {
    return (
      <AppLayout activeMenuItem="recruitment" breadcrumbs={[{label: 'Onboarding', href: '/onboarding'}]}>
        <div className="mx-auto w-full max-w-7xl px-6 py-16 text-center">
          <p className="text-body-secondary">You do not have access to onboarding.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="recruitment" breadcrumbs={[{label: 'Onboarding', href: '/onboarding'}]}>
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader
          onInitiate={() => router.push('/onboarding/new')}
          onTemplates={() => router.push('/onboarding/templates')}
        />

        {isError && (
          <ErrorBanner
            message={error instanceof Error ? error.message : 'Failed to load onboarding data'}
            onRetry={() => refetch()}
          />
        )}

        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <StatsRow
            active={stats.active}
            joiningThisWeek={stats.joiningThisWeek}
            overdue={stats.overdue}
            completedYtd={stats.completedYtd}
          />
        )}

        <BentoNavigation activeCount={stats.active} />

        {joiningThisWeekList.length > 0 && (
          <JoiningThisWeek items={joiningThisWeekList} onOpen={(id) => router.push(`/onboarding/${id}`)} />
        )}

        {stats.overdue > 0 && <AttentionStrip count={stats.overdue} />}
      </div>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader({onInitiate, onTemplates}: {onInitiate: () => void; onTemplates: () => void}) {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Talent Onboarding
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          The first ninety days, orchestrated with care.
        </h1>
        <p className="text-body-secondary max-w-[55ch]">
          Templates, checklists, and documents that keep every new joiner on track from offer to day one.
        </p>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-end">
        <PermissionGate permission={Permissions.ONBOARDING_MANAGE}>
          <Button variant="outline" onClick={onTemplates}>
            <LayoutIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            Templates
          </Button>
        </PermissionGate>
        <PermissionGate permission={Permissions.ONBOARDING_CREATE}>
          <Button variant="primary" onClick={onInitiate}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            New hire
          </Button>
        </PermissionGate>
      </div>
    </motion.header>
  );
}

// ── Stats row (borders, not card boxes) ──────────────────────────────────────
function StatsRow({active, joiningThisWeek, overdue, completedYtd}: {
  active: number;
  joiningThisWeek: number;
  overdue: number;
  completedYtd: number;
}) {
  const items = [
    {label: 'Active onboardings', value: active, icon: Users, tone: 'neutral' as const},
    {label: 'Joining this week', value: joiningThisWeek, icon: Calendar, tone: 'neutral' as const},
    {label: 'Overdue', value: overdue, icon: AlertTriangle, tone: overdue > 0 ? 'danger' as const : 'neutral' as const},
    {label: 'Completed YTD', value: completedYtd, icon: CheckSquare, tone: 'neutral' as const},
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
      aria-label="Onboarding at a glance"
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
function BentoNavigation({activeCount}: {activeCount: number}) {
  const tiles = [
    {
      title: 'Templates',
      description: 'Reusable checklists by role, department, and location.',
      icon: LayoutIcon,
      href: '/onboarding/templates',
    },
    {
      title: 'Documents',
      description: 'Offer letters, contracts, and personal records for every joiner.',
      icon: FileText,
      href: '/me/documents',
    },
    {
      title: 'Preboarding portal',
      description: 'Pre-day-one experience for joiners — paperwork, welcome, intros.',
      icon: ClipboardList,
      href: '/preboarding',
    },
    {
      title: 'Checklists',
      description: 'Task lists for buddies, managers, IT, and people ops.',
      icon: CheckSquare,
      href: '/onboarding/templates',
    },
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}}}}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      aria-label="Onboarding modules"
    >
      <BentoHero count={activeCount} />
      {tiles.map((tile) => (
        <BentoTile key={tile.href + tile.title} {...tile} />
      ))}
    </motion.section>
  );
}

function BentoHero({count}: {count: number}) {
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: EASE}}}}
      className="lg:col-span-7 lg:row-span-2"
    >
      <Link
        href="/onboarding?status=IN_PROGRESS"
        className="group block h-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-7 sm:p-9 transition-all hover:border-[var(--border-main)] hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
        <h2 className="mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-heading)]">
          Active onboarding cohort
        </h2>
        <p className="mt-3 text-body-secondary max-w-[48ch]">
          See every joiner currently in motion — momentum, buddy, expected completion. Catch the silent slips.
        </p>
        <div className="mt-10 flex items-end justify-between gap-6">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl sm:text-5xl tabular-nums tracking-tight text-[var(--text-heading)]">
              {count}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">in progress</span>
          </div>
          <p className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Live cohort
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

function BentoTile({title, description, icon: Icon, href}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
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
          <h3 className="text-base font-semibold text-[var(--text-heading)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 self-center text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}

// ── Joining this week ────────────────────────────────────────────────────────
function JoiningThisWeek({items, onOpen}: {
  items: OnboardingProcess[];
  onOpen: (id: string) => void;
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
          Joining this week
        </h2>
        <Link
          href="/onboarding?status=NOT_STARTED"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 dark:text-accent-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {items.map((p) => {
          const initial = p.employeeName?.charAt(0)?.toUpperCase() ?? 'U';
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-4 sm:gap-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 font-semibold text-sm">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-heading)] truncate">
                    {p.employeeName ?? `Employee ${p.employeeId.substring(0, 8)}`}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    Starts {formatDate(p.startDate)}
                    {p.assignedBuddyName ? ` · Buddy: ${p.assignedBuddyName}` : ''}
                  </p>
                </div>
                <p className="hidden sm:block font-mono text-sm tabular-nums text-[var(--text-secondary)]">
                  {p.completionPercentage}%
                </p>
                <StatusBadge status={p.status} domain={REVIEW_STATUS} />
              </button>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

// ── Attention strip ──────────────────────────────────────────────────────────
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
        <Clock className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden="true" />
        <p className="text-[var(--text-primary)]">
          <span className="font-semibold">{count}</span>{' '}
          {count === 1 ? 'onboarding is' : 'onboardings are'} past expected completion. Nudge owners before day-one slips.
        </p>
      </div>
      <Link href="/onboarding?status=IN_PROGRESS">
        <Button variant="outline" size="sm">
          Review
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </Link>
    </motion.aside>
  );
}

// ── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({message, onRetry}: {message: string; onRetry: () => void}) {
  return (
    <div role="alert" className="flex items-center gap-4 rounded-xl border border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 px-5 py-4">
      <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-danger-700 dark:text-danger-300">Could not load onboarding data</p>
        <p className="text-[var(--text-secondary)]">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}
