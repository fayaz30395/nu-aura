'use client';

import React from 'react';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  TrendingUp,
} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {
  MOTION_DURATION,
  MOTION_EASE,
  MOTION_RISE_DISTANCE,
  MOTION_STAGGER,
  useReducedMotionSafe,
} from '@/lib/animation';
import {Button} from '@/components/ui/Button';
import {Stagger, StaggerItem} from '@/components/motion';
import {Skeleton} from '@/components/ui/Skeleton';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {
  useEnrollCourse,
  useLearningDashboard,
  useMyCertificates,
  useMyEnrollments,
  usePublishedCourses,
} from '@/lib/hooks/queries/useLearning';
import type {Certificate, CourseEnrollment} from '@/lib/services/grow/lms.service';
import {formatDate} from '@/lib/utils/format/date';

// Motion on this page consolidates onto the shared foundation tokens
// (lib/animation) so it is one system with the rest of Studio Slate v2.
const EASE = MOTION_EASE.outExpo;
const RISE = MOTION_RISE_DISTANCE;

const itemVariants = {
  hidden: {opacity: 0, y: RISE},
  visible: {opacity: 1, y: 0, transition: {duration: MOTION_DURATION.base, ease: EASE}},
};

export default function LearningPage() {
  const {data: dashboard, isLoading: dashboardLoading, isError: dashboardError} = useLearningDashboard();
  const {data: enrollmentsData, isLoading: enrollmentsLoading} = useMyEnrollments(0, 5, true);
  const {data: certificatesData, isLoading: certificatesLoading} = useMyCertificates(0, 5, true);
  const {data: coursesData} = usePublishedCourses(0, 1, true);
  const enrollMutation = useEnrollCourse();

  const enrollments: CourseEnrollment[] = Array.isArray(enrollmentsData) ? enrollmentsData : [];
  const certificates: Certificate[] = Array.isArray(certificatesData) ? certificatesData : [];

  const inProgress = enrollments
    .filter((e) => e.status === 'IN_PROGRESS' || e.status === 'ENROLLED')
    .slice(0, 4);

  const featured = inProgress[0];
  const featuredCourseTitle = coursesData?.content?.[0]?.title;

  return (
    <AppLayout activeMenuItem="learning">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader />

        {dashboardError && (
          <ErrorBanner message="Failed to load learning dashboard. Please try refreshing the page." />
        )}

        {/* Stats — borders, not card boxes */}
        {dashboardLoading ? (
          <StatsSkeleton />
        ) : dashboard ? (
          <StatsRow
            totalEnrollments={dashboard.totalEnrollments}
            averageProgress={Math.round(dashboard.averageProgress ?? 0)}
            certificatesEarned={dashboard.certificatesEarned}
            completed={dashboard.completed}
          />
        ) : null}

        {/* Bento — one wide hero + four refined tiles */}
        <BentoNavigation
          featuredEnrollment={featured}
          featuredCourseTitle={featuredCourseTitle}
          certificatesCount={certificates.length}
        />

        {/* In-progress courses list */}
        {enrollmentsLoading ? (
          <InProgressSkeleton />
        ) : inProgress.length > 0 ? (
          <InProgressList items={inProgress} />
        ) : null}

        {/* Mandatory / overdue alert */}
        {!certificatesLoading && dashboard && dashboard.inProgress > 0 && dashboard.averageProgress < 40 && (
          <AttentionStrip count={dashboard.inProgress} />
        )}

        {/* Hidden mount to retain enrollment mutation wiring for catalog tiles */}
        <PermissionGate permission={Permissions.LMS_ENROLL}>
          <span className="sr-only" aria-hidden="true">
            {enrollMutation.isPending ? 'Enrolling…' : ''}
          </span>
        </PermissionGate>
      </div>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader() {
  const {pick} = useReducedMotionSafe();
  return (
    <motion.header
      variants={pick(itemVariants)}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Learning &amp; Development
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          Build skills at your pace. Earn credit for the work.
        </h1>
        <p className="text-body-secondary max-w-[55ch]">
          Courses, quizzes, certificates, and programs — everything you need to grow on the job.
        </p>
      </div>
      <Link href="/training/catalog" className="self-start sm:self-end">
        <Button variant="primary">
          <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
          Browse catalog
        </Button>
      </Link>
    </motion.header>
  );
}

// ── Stats row ────────────────────────────────────────────────────────────────
function StatsRow({totalEnrollments, averageProgress, certificatesEarned, completed}: {
  totalEnrollments: number;
  averageProgress: number;
  certificatesEarned: number;
  completed: number;
}) {
  const {pick} = useReducedMotionSafe();
  const items = [
    {label: 'Courses enrolled', value: totalEnrollments, icon: BookOpen, tone: 'neutral' as const},
    {label: 'Completion', value: `${averageProgress}%`, icon: TrendingUp, tone: 'neutral' as const},
    {label: 'Certificates', value: certificatesEarned, icon: Award, tone: 'neutral' as const},
    {label: 'Completed', value: completed, icon: CheckCircle2, tone: completed > 0 ? 'success' as const : 'neutral' as const},
  ];

  return (
    <Stagger
      variants={pick({visible: {transition: {staggerChildren: MOTION_STAGGER, delayChildren: 0.08}}})}
      aria-label="Learning at a glance"
      className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border)] divide-x divide-[var(--border-soft)]"
    >
      {items.map((item) => (
        <StaggerItem
          key={item.label}
          variants={pick({hidden: {opacity: 0, y: RISE}, visible: {opacity: 1, y: 0, transition: {duration: MOTION_DURATION.base, ease: EASE}}})}
          className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0"
        >
          <div className="flex items-center gap-2 text-[var(--text-3)]">
            <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-aura-micro">{item.label}</span>
          </div>
          <p
            className={`mt-3 num text-aura-stat ${
              item.tone === 'success' ? 'text-[var(--ok-fg)]'
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
function BentoNavigation({featuredEnrollment, featuredCourseTitle, certificatesCount}: {
  featuredEnrollment?: CourseEnrollment;
  featuredCourseTitle?: string;
  certificatesCount: number;
}) {
  const {pick} = useReducedMotionSafe();
  const heroLabel = featuredEnrollment
    ? `Continue learning: Course #${featuredEnrollment.courseId.slice(0, 8)}`
    : featuredCourseTitle
      ? `Start with: ${featuredCourseTitle}`
      : 'Explore the catalog';

  const heroDescription = featuredEnrollment
    ? 'Pick up where you left off. Your progress is saved automatically.'
    : 'Hand-picked courses, quizzes, and programs. Filter by skill, role, or duration.';

  const heroHref = featuredEnrollment
    ? `/learning/courses/${featuredEnrollment.courseId}`
    : '/training/catalog';

  const heroProgress = featuredEnrollment?.progressPercentage ?? 0;

  const tiles = [
    {
      title: 'Course catalog',
      description: 'Every published course, filtered by difficulty and duration.',
      icon: BookOpen,
      href: '/training/catalog',
    },
    {
      title: 'My courses',
      description: 'Track progress across active and completed enrollments.',
      icon: GraduationCap,
      href: '/training/my-learning',
    },
    {
      title: 'Programs',
      description: 'Structured learning paths that bundle courses by competency.',
      icon: Layers,
      href: '/learning/paths',
    },
    {
      title: 'Certificates',
      description: 'Download, share, and verify the credentials you have earned.',
      icon: Award,
      href: '/learning/certificates',
      badge: certificatesCount > 0 ? certificatesCount : undefined,
    },
  ];

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={pick({
        hidden: {opacity: 1},
        visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}},
      })}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      aria-label="Explore learning"
    >
      <BentoHero
        title={heroLabel}
        description={heroDescription}
        href={heroHref}
        progress={featuredEnrollment ? heroProgress : undefined}
      />
      {tiles.map((tile) => (
        <BentoTile key={tile.href} {...tile} />
      ))}
    </motion.section>
  );
}

function BentoHero({title, description, href, progress}: {
  title: string;
  description: string;
  href: string;
  progress?: number;
}) {
  const {pick} = useReducedMotionSafe();
  return (
    <motion.div
      variants={pick({hidden: {opacity: 0, y: RISE}, visible: {opacity: 1, y: 0, transition: {duration: MOTION_DURATION.slow, ease: EASE}}})}
      className="lg:col-span-7 lg:row-span-2"
    >
      <Link
        href={href}
        className="group block h-full rounded-aura-lg bg-[var(--surface)] border border-[var(--border-soft)] p-7 sm:p-9 transition-all hover:border-[var(--border)] hover:shadow-[var(--sh-md)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-aura-md bg-[var(--accent-soft)] text-[var(--accent)]">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-3)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
        <h2 className="mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-1)]">
          {title}
        </h2>
        <p className="mt-3 text-body-secondary max-w-[48ch] text-[var(--text-2)]">
          {description}
        </p>
        <div className="mt-10 flex items-end justify-between gap-6">
          <BentoHeroBars progress={progress} />
          <p className="text-aura-micro text-[var(--text-3)]">
            {progress !== undefined ? `${Math.round(progress)}% complete` : 'Live catalog'}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

function BentoHeroBars({progress}: {progress?: number}) {
  const widths = progress !== undefined
    ? Array.from({length: 8}, (_, i) => {
        const filled = Math.round((progress / 100) * 8);
        return i < filled ? 78 : 28;
      })
    : [42, 78, 63, 91, 55, 70, 38, 84];

  const {prefersReduced} = useReducedMotionSafe();
  return (
    <div className="flex items-end gap-1.5 h-16 flex-1" aria-hidden="true">
      {widths.map((w, i) => (
        <motion.span
          key={i}
          initial={prefersReduced ? false : {scaleY: 0}}
          animate={{scaleY: 1, height: `${w}%`}}
          transition={
            prefersReduced
              ? {duration: 0}
              : {duration: MOTION_DURATION.slow, ease: EASE, delay: 0.35 + i * 0.04}
          }
          className="flex-1 max-w-3 origin-bottom rounded-sm bg-[var(--chart-1)] dark:bg-[var(--chart-1)]/60"
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
  const {pick} = useReducedMotionSafe();
  return (
    <motion.div
      variants={pick(itemVariants)}
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
    </motion.div>
  );
}

// ── In-progress courses (divide-y list) ──────────────────────────────────────
function InProgressList({items}: {items: CourseEnrollment[]}) {
  const {pick} = useReducedMotionSafe();
  return (
    <motion.section
      variants={pick({
        hidden: {opacity: 0, y: RISE},
        visible: {opacity: 1, y: 0, transition: {duration: MOTION_DURATION.slow, ease: EASE, delay: 0.32}},
      })}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
          In progress
        </h2>
        <Link
          href="/training/my-learning"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 dark:text-accent-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {items.map((e) => {
          const pct = Math.round(e.progressPercentage ?? 0);
          return (
            <li key={e.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-4 sm:gap-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-heading)] truncate">
                  Course #{e.courseId.slice(0, 8)}
                </p>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  Enrolled {formatDate(e.enrolledAt)}
                  {e.lastAccessedAt ? ` · last opened ${formatDate(e.lastAccessedAt)}` : ''}
                </p>
              </div>
              <p className="font-mono text-sm font-semibold tabular-nums text-[var(--text-heading)]">
                {pct}%
              </p>
              <Link href={`/learning/courses/${e.courseId}`}>
                <Button variant="outline" size="sm">
                  {e.status === 'COMPLETED' ? 'Review' : 'Continue'}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

function InProgressSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32 rounded" />
      <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {Array.from({length: 3}).map((_, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Attention strip ──────────────────────────────────────────────────────────
function AttentionStrip({count}: {count: number}) {
  const {pick} = useReducedMotionSafe();
  return (
    <motion.aside
      variants={pick({
        hidden: {opacity: 0, y: RISE},
        visible: {opacity: 1, y: 0, transition: {duration: MOTION_DURATION.slow, ease: EASE, delay: 0.42}},
      })}
      initial="hidden"
      animate="visible"
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-xl border border-warning-200 bg-warning-50/40 dark:border-warning-700/40 dark:bg-warning-950/30 px-5 py-4"
    >
      <div className="flex items-center gap-4 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden="true" />
        <p className="text-[var(--text-primary)]">
          <span className="font-semibold">{count}</span>{' '}
          {count === 1 ? 'course is' : 'courses are'} still in progress with low completion. Spend 15 minutes today to keep momentum.
        </p>
      </div>
      <Link href="/training/my-learning">
        <Button variant="outline" size="sm">
          Resume
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </Link>
    </motion.aside>
  );
}

// ── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({message}: {message: string}) {
  return (
    <div role="alert" className="flex items-center gap-4 rounded-xl border border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 px-5 py-4">
      <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-danger-700 dark:text-danger-300">Could not load data</p>
        <p className="text-[var(--text-secondary)]">{message}</p>
      </div>
    </div>
  );
}
