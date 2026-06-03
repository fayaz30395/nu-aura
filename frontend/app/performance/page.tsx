'use client';

import React, {useMemo} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Flag,
  Grid3X3,
  MessageSquare,
  Sliders,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';
import {PageErrorFallback} from '@/components/errors/PageErrorFallback';
import {Skeleton} from '@/components/ui/Skeleton';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {Button} from '@/components/ui/Button';
import {MOTION_DURATION, MOTION_EASE, MOTION_RISE_DISTANCE, MOTION_STAGGER, useReducedMotionSafe} from '@/lib/animation';
import {
  useAllGoals,
  useMyPending360Reviews,
  useOkrDashboardSummary,
  usePerformanceActiveCycles,
} from '@/lib/hooks/queries/usePerformance';

const EASE = MOTION_EASE.outExpo;

const PERFORMANCE_ALLOWED_ROLES = [
  'SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'HR_MANAGER',
  'MANAGER', 'TEAM_LEAD', 'SKIP_LEVEL_MANAGER', 'REPORTING_MANAGER',
  'EMPLOYEE',
];

interface DashboardStats {
  activeGoals: number;
  completedGoals: number;
  averageProgress: number;
  activeReviewCycles: number;
  okrObjectives: number;
  okrProgress: number;
  pending360Reviews: number;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PerformancePage() {
  const router = useRouter();
  const {hasAnyRole, isReady} = usePermissions();
  const hasAccess = hasAnyRole(...PERFORMANCE_ALLOWED_ROLES);

  // All hooks called before any early return
  const goalsQuery = useAllGoals(0, 20);
  const cyclesQuery = usePerformanceActiveCycles();
  const okrQuery = useOkrDashboardSummary();
  const pending360Query = useMyPending360Reviews();

  const stats: DashboardStats = useMemo(() => {
    const goals = goalsQuery.data?.content || [];
    const cycles = cyclesQuery.data || [];
    const okrSummary = okrQuery.data;
    const pending360 = pending360Query.data || [];

    const activeGoals = goals.filter((g) => g.status === 'ACTIVE' || g.status === 'IN_PROGRESS');
    const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
    const avgProgress = goals.length > 0
      ? Math.round(goals.reduce((acc: number, g) => acc + (g.progressPercentage || 0), 0) / goals.length)
      : 0;

    return {
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      averageProgress: avgProgress,
      activeReviewCycles: cycles.length,
      okrObjectives: okrSummary?.totalObjectives || 0,
      okrProgress: Math.round(okrSummary?.averageProgress || 0),
      pending360Reviews: pending360.length,
    };
  }, [goalsQuery.data, cyclesQuery.data, okrQuery.data, pending360Query.data]);

  const isLoading =
    goalsQuery.isLoading || cyclesQuery.isLoading || okrQuery.isLoading || pending360Query.isLoading;
  const hasError =
    goalsQuery.isError || cyclesQuery.isError || okrQuery.isError || pending360Query.isError;

  if (isReady && !hasAccess) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center space-y-6">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-aura-lg bg-[var(--warn-bg)] text-[var(--warn-fg)]">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-aura-title text-[var(--text-1)]">
              Access restricted
            </h1>
            <p className="text-body-secondary max-w-[60ch] mx-auto text-[var(--text-2)]">
              You don&apos;t have permission to access the Performance hub. View your goals and reviews from My Dashboard.
            </p>
          </div>
          <Button variant="primary" onClick={() => router.push('/me/dashboard')}>
            Go to My Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (hasError) {
    return (
      <AppLayout activeMenuItem="performance">
        <PageErrorFallback
          title="Failed to load performance data"
          error={new Error('Unable to fetch performance metrics. Please check your connection and try again.')}
          onReset={() => {
            goalsQuery.refetch();
            cyclesQuery.refetch();
            okrQuery.refetch();
            pending360Query.refetch();
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="performance">
      <PageTransition className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader />

        {isLoading ? <StatsSkeleton /> : <StatsRow stats={stats} />}

        <BentoNavigation pending360={stats.pending360Reviews} activeCycles={stats.activeReviewCycles} />

        {stats.pending360Reviews > 0 && <Pending360Strip count={stats.pending360Reviews} />}
      </PageTransition>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader() {
  const {pick} = useReducedMotionSafe();
  return (
    <Reveal variants={pick({hidden: {opacity: 0, y: MOTION_RISE_DISTANCE}, visible: {opacity: 1, y: 0, transition: {duration: MOTION_DURATION.base, ease: EASE}}})}>
      <header className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2 max-w-2xl">
          <p className="text-aura-micro text-[var(--text-3)]">
            Performance Management
          </p>
          <h1 className="text-aura-title text-[var(--text-1)] leading-[1.05]">
            Goals, reviews, and growth in one steady rhythm.
          </h1>
          <p className="text-body-secondary max-w-[55ch] text-[var(--text-2)]">
            Track progress, run cycles, and finalise ratings without losing the thread.
          </p>
        </div>
        <Link href="/performance/goals" className="self-start sm:self-end">
          <Button variant="primary">
            Set a goal
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </header>
    </Reveal>
  );
}

// ── Stats row ────────────────────────────────────────────────────────────────
function StatsRow({stats}: {stats: DashboardStats}) {
  const {pick} = useReducedMotionSafe();
  const items = [
    {label: 'Active goals', value: stats.activeGoals, icon: Flag, tone: 'neutral' as const},
    {label: 'Goal progress', value: `${stats.averageProgress}%`, icon: TrendingUp, tone: 'neutral' as const},
    {label: 'OKR progress', value: `${stats.okrProgress}%`, icon: SlidersHorizontal, tone: 'neutral' as const},
    {
      label: 'Pending reviews',
      value: stats.pending360Reviews,
      icon: Clock,
      tone: stats.pending360Reviews > 0 ? ('warning' as const) : ('neutral' as const),
    },
  ];

  return (
    <Stagger
      variants={pick({
        visible: {transition: {staggerChildren: MOTION_STAGGER, delayChildren: 0.08}},
      })}
      aria-label="Performance at a glance"
      className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border)] divide-x divide-[var(--border-soft)]"
    >
      {items.map((item) => (
        <StaggerItem
          key={item.label}
          variants={pick({hidden: {opacity: 0, y: MOTION_RISE_DISTANCE}, visible: {opacity: 1, y: 0, transition: {duration: MOTION_DURATION.base, ease: EASE}}})}
          className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0"
        >
          <div className="flex items-center gap-2 text-[var(--text-3)]">
            <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-aura-micro">{item.label}</span>
          </div>
          <p
            className={`mt-3 num text-aura-stat ${
              item.tone === 'warning'
                ? 'text-[var(--warn-fg)]'
                : 'text-[var(--text-1)]'
            }`}
          >
            {item.value}
          </p>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border)] divide-x divide-[var(--border-soft)]">
      {Array.from({length: 4}).map((_, i) => (
        <div key={i} className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
          <Skeleton className="h-3 w-24 rounded-aura-xs" />
          <Skeleton className="mt-3 h-9 w-20 rounded-aura-xs" />
        </div>
      ))}
    </div>
  );
}

// ── Bento navigation ─────────────────────────────────────────────────────────
interface NavTile {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  permission: string | null;
  badge?: number;
}

function BentoNavigation({pending360, activeCycles}: {pending360: number; activeCycles: number}) {
  const {pick} = useReducedMotionSafe();
  const hero: NavTile & {meta: string} = {
    title: 'Performance reviews',
    description: 'Run review cycles end-to-end. Track completion, nudge stragglers, and finalise outcomes.',
    icon: ClipboardCheck,
    href: '/performance/reviews',
    permission: Permissions.REVIEW_VIEW,
    meta: activeCycles > 0 ? `${activeCycles} active ${activeCycles === 1 ? 'cycle' : 'cycles'}` : 'No active cycles',
  };

  const tiles: NavTile[] = [
    {title: 'Goals', description: 'Set and track individual, team, and org goals.', icon: Flag, href: '/performance/goals', permission: null},
    {title: 'OKR management', description: 'Objectives and key results for strategic alignment.', icon: SlidersHorizontal, href: '/performance/okr', permission: null},
    {title: '360 feedback', description: 'Multi-rater feedback from peers, managers, reports.', icon: Users, href: '/performance/360-feedback', permission: Permissions.FEEDBACK_360_VIEW, badge: pending360 > 0 ? pending360 : undefined},
    {title: 'Continuous feedback', description: 'Give and receive ongoing feedback all year.', icon: MessageSquare, href: '/performance/feedback', permission: Permissions.FEEDBACK_CREATE},
    {title: 'Review cycles', description: 'Manage review periods and deadlines.', icon: CalendarDays, href: '/performance/cycles', permission: Permissions.REVIEW_VIEW},
    {title: 'PIPs', description: 'Track Performance Improvement Plans with check-ins.', icon: AlertCircle, href: '/performance/pip', permission: Permissions.PIP_VIEW},
    {title: 'Calibration', description: 'Finalise ratings with distribution and bell-curve view.', icon: Sliders, href: '/performance/calibration', permission: Permissions.CALIBRATION_VIEW},
    {title: '9-box grid', description: 'Talent segmentation by performance and potential.', icon: Grid3X3, href: '/performance/9box', permission: Permissions.REVIEW_VIEW},
    {title: 'Competency matrix', description: 'Frameworks, skill assessments, and gap analysis.', icon: BarChart3, href: '/performance/competency-matrix', permission: Permissions.REVIEW_VIEW},
  ];

  return (
    <Stagger
      variants={pick({visible: {transition: {staggerChildren: MOTION_STAGGER, delayChildren: 0.18}}})}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      aria-label="Explore performance"
    >
      <BentoHeroWrap permission={hero.permission}>
        <BentoHero {...hero} />
      </BentoHeroWrap>
      {tiles.map((tile) =>
        tile.permission ? (
          <PermissionGate key={tile.href} permission={tile.permission} fallback={null}>
            <BentoTile {...tile} />
          </PermissionGate>
        ) : (
          <BentoTile key={tile.href} {...tile} />
        )
      )}
    </Stagger>
  );
}

function BentoHeroWrap({permission, children}: {permission: string | null; children: React.ReactNode}) {
  if (!permission) return <>{children}</>;
  return <PermissionGate permission={permission} fallback={null}>{children}</PermissionGate>;
}

function BentoHero({title, description, icon: Icon, href, meta}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  meta: string;
}) {
  const {pick} = useReducedMotionSafe();
  return (
    <StaggerItem
      variants={pick({hidden: {opacity: 0, y: MOTION_RISE_DISTANCE}, visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: EASE}}})}
      className="lg:col-span-7 lg:row-span-2"
    >
      <Link
        href={href}
        className="group block h-full rounded-aura-lg bg-[var(--surface)] border border-[var(--border-soft)] p-7 sm:p-9 transition-all hover:border-[var(--border)] hover:shadow-[var(--sh-md)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-aura-md bg-[var(--accent-soft)] text-[var(--accent)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-3)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
        <h2 className="mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-1)]">
          {title}
        </h2>
        <p className="mt-3 text-body-secondary max-w-[48ch] text-[var(--text-2)]">{description}</p>
        <div className="mt-10 flex items-end justify-between gap-6">
          <BentoHeroBars />
          <p className="text-aura-micro text-[var(--text-3)]">
            {meta}
          </p>
        </div>
      </Link>
    </StaggerItem>
  );
}

function BentoHeroBars() {
  const widths = [38, 72, 55, 88, 48, 80, 42, 66];
  return (
    <div className="flex items-end gap-1.5 h-16 flex-1" aria-hidden="true">
      {widths.map((w, i) => (
        <motion.span
          key={i}
          initial={{height: '0%'}}
          animate={{height: `${w}%`}}
          transition={{duration: 0.7, ease: EASE, delay: 0.35 + i * 0.04}}
          className="flex-1 max-w-3 rounded-sm bg-[var(--chart-1)] dark:bg-[var(--chart-1)]/60"
        />
      ))}
    </div>
  );
}

function BentoTile({title, description, icon: Icon, href, badge}: NavTile) {
  const {pick} = useReducedMotionSafe();
  return (
    <StaggerItem
      variants={pick({hidden: {opacity: 0, y: MOTION_RISE_DISTANCE}, visible: {opacity: 1, y: 0, transition: {duration: MOTION_DURATION.base, ease: EASE}}})}
      className="lg:col-span-5"
    >
      <Link
        href={href}
        className="group flex h-full items-start gap-4 rounded-aura-lg bg-[var(--surface)] border border-[var(--border-soft)] p-5 sm:p-6 transition-all hover:border-[var(--border)] hover:shadow-[var(--sh-sm)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-aura-md bg-[var(--surface-aura-2)] border border-[var(--border-soft)] text-[var(--text-2)]">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-[var(--text-1)]">{title}</h3>
            {badge !== undefined && (
              <span className="inline-flex items-center justify-center min-w-6 px-2 h-5 text-2xs font-semibold rounded-aura-full bg-[var(--warn-bg)] text-[var(--warn-fg)] num">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--text-2)] leading-relaxed">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 self-center text-[var(--text-3)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </StaggerItem>
  );
}

// ── Pending 360 alert ────────────────────────────────────────────────────────
function Pending360Strip({count}: {count: number}) {
  const {pick} = useReducedMotionSafe();
  return (
    <Reveal
      variants={pick({
        hidden: {opacity: 0, y: MOTION_RISE_DISTANCE},
        visible: {opacity: 1, y: 0, transition: {duration: MOTION_DURATION.base, ease: EASE, delay: 0.42}},
      })}
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-aura-lg border border-[var(--warn-bd)] bg-[var(--warn-bg)]/40 px-5 py-4"
    >
      <div className="flex items-center gap-4 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warn-fg)]" aria-hidden="true" />
        <p className="text-[var(--text-1)]">
          <span className="font-semibold num">{count}</span>{' '}
          {count === 1 ? '360 feedback request is' : '360 feedback requests are'} waiting on you.
        </p>
      </div>
      <Link href="/performance/360-feedback">
        <Button variant="outline" size="sm">
          Review now
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </Link>
    </Reveal>
  );
}
