'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  FileText,
  Globe,
  Plus,
  Users,
} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {PageTransition} from '@/components/motion';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui/Skeleton';
import {PageErrorFallback} from '@/components/errors/PageErrorFallback';
import {
  useAllInterviews,
  useCandidates,
  useJobOpenings,
  useJobOpeningsByStatus,
} from '@/lib/hooks/queries/useRecruitment';
import {Candidate, CandidateStatus, Interview} from '@/lib/types/hire/recruitment';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {formatDate as canonicalFormatDate, formatTime as canonicalFormatTime} from '@/lib/utils/format/date';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const RECRUITMENT_ALLOWED_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'HR_MANAGER', 'RECRUITMENT_ADMIN'];

function statusTone(status?: CandidateStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (!status) return 'neutral';
  const map: Record<CandidateStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
    NEW: 'info',
    SCREENING: 'warning',
    INTERVIEW: 'warning',
    SELECTED: 'success',
    OFFER_EXTENDED: 'success',
    OFFER_ACCEPTED: 'success',
    OFFER_DECLINED: 'danger',
    REJECTED: 'danger',
    WITHDRAWN: 'danger',
  };
  return map[status] ?? 'neutral';
}

function isThisWeek(dateString?: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return date >= startOfWeek && date <= endOfWeek;
}

export default function RecruitmentDashboard() {
  const router = useRouter();
  const {hasAnyRole, isReady} = usePermissions();
  const hasAccess = hasAnyRole(...RECRUITMENT_ALLOWED_ROLES);

  const jobOpeningsQuery = useJobOpenings(0, 100);
  const candidatesQuery = useCandidates(0, 100);
  const openJobsQuery = useJobOpeningsByStatus('OPEN');
  const interviewsQuery = useAllInterviews(0, 100);

  useEffect(() => {
    document.title = 'Recruitment | NU-AURA';
  }, []);

  const stats = useMemo(() => {
    const candidates = candidatesQuery.data?.content || [];
    const openJobs = openJobsQuery.data || [];
    const interviews = interviewsQuery.data?.content || [];

    const interviewsThisWeek = interviews.filter(
      (i) => isThisWeek(i.scheduledAt) && (i.status === 'SCHEDULED' || i.status === 'RESCHEDULED'),
    ).length;
    const pendingOffers = candidates.filter((c) => c.status === 'OFFER_EXTENDED').length;
    const inPipeline = candidates.filter(
      (c) => c.status === 'NEW' || c.status === 'SCREENING' || c.status === 'INTERVIEW' || c.status === 'SELECTED',
    ).length;

    return {
      openRequisitions: openJobs.length,
      inPipeline,
      pendingOffers,
      interviewsThisWeek,
    };
  }, [candidatesQuery.data, openJobsQuery.data, interviewsQuery.data]);

  const candidatesNeedingAttention: Candidate[] = useMemo(() => {
    const candidates = candidatesQuery.data?.content || [];
    return candidates
      .filter((c) => c.status === 'OFFER_EXTENDED' || c.status === 'INTERVIEW' || c.status === 'SCREENING')
      .sort((a, b) => new Date(b.appliedDate || b.createdAt).getTime() - new Date(a.appliedDate || a.createdAt).getTime())
      .slice(0, 5);
  }, [candidatesQuery.data]);

  const interviewsThisWeekList: Interview[] = useMemo(() => {
    const interviews = interviewsQuery.data?.content || [];
    return interviews
      .filter((i) => isThisWeek(i.scheduledAt) && (i.status === 'SCHEDULED' || i.status === 'RESCHEDULED'))
      .sort((a, b) => new Date(a.scheduledAt || '').getTime() - new Date(b.scheduledAt || '').getTime())
      .slice(0, 5);
  }, [interviewsQuery.data]);

  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLoadingTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  if (isReady && !hasAccess) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center space-y-6">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            <Briefcase className="h-5 w-5" aria-hidden="true"/>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-heading)]">
              Access Restricted
            </h1>
            <p className="text-body-secondary max-w-[60ch] mx-auto">
              You don&apos;t have permission to access the Recruitment dashboard. Use the Referrals page to submit employee referrals.
            </p>
          </div>
          <Button variant="primary" onClick={() => router.push('/me/dashboard')}>
            Go to my dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  const allQueriesErrored =
    jobOpeningsQuery.isError && candidatesQuery.isError && openJobsQuery.isError && interviewsQuery.isError;

  if (allQueriesErrored) {
    return (
      <AppLayout>
        <PageErrorFallback
          title="Failed to Load Recruitment Data"
          error={new Error('There was an error loading the recruitment dashboard. Please try refreshing the page.')}
          onReset={() => window.location.reload()}
        />
      </AppLayout>
    );
  }

  const isInitialLoad =
    !loadingTimedOut &&
    (jobOpeningsQuery.isLoading ||
      candidatesQuery.isLoading ||
      openJobsQuery.isLoading ||
      interviewsQuery.isLoading);

  return (
    <AppLayout>
      <PermissionGate
        anyOf={[Permissions.RECRUITMENT_VIEW, Permissions.RECRUITMENT_VIEW_ALL]}
        fallback={
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-[var(--text-muted)]">You do not have permission to view recruitment data.</p>
          </div>
        }
      >
        <PageTransition className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
          <PageHeader
            onPostJob={() => router.push('/recruitment/jobs')}
            onAddCandidate={() => router.push('/recruitment/candidates')}
          />

          {isInitialLoad ? (
            <StatsSkeleton/>
          ) : (
            <StatsRow
              openRequisitions={stats.openRequisitions}
              inPipeline={stats.inPipeline}
              pendingOffers={stats.pendingOffers}
              interviewsThisWeek={stats.interviewsThisWeek}
            />
          )}

          <BentoNavigation
            pipelineCount={stats.inPipeline}
            interviewsCount={stats.interviewsThisWeek}
            pendingOffers={stats.pendingOffers}
          />

          {candidatesNeedingAttention.length > 0 && (
            <CandidatesNeedingAttention items={candidatesNeedingAttention} router={router}/>
          )}

          {interviewsThisWeekList.length > 0 && (
            <InterviewsThisWeek items={interviewsThisWeekList}/>
          )}

          {stats.pendingOffers > 0 && (
            <OffersAlert count={stats.pendingOffers}/>
          )}
        </PageTransition>
      </PermissionGate>
    </AppLayout>
  );
}

function PageHeader({onPostJob, onAddCandidate}: {onPostJob: () => void; onAddCandidate: () => void}) {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          NU-Hire
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          From requisition to offer, one pipeline you can actually trust.
        </h1>
        <p className="text-body-secondary max-w-[55ch]">
          Track open roles, move candidates through stages, and keep interviews and offers on time.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
        <PermissionGate permission={Permissions.CANDIDATE_VIEW}>
          <Button variant="outline" onClick={onAddCandidate}>
            <Users className="mr-2 h-4 w-4" aria-hidden="true"/>
            Add candidate
          </Button>
        </PermissionGate>
        <PermissionGate permission={Permissions.RECRUITMENT_CREATE}>
          <Button variant="primary" onClick={onPostJob}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true"/>
            Post new job
          </Button>
        </PermissionGate>
      </div>
    </motion.header>
  );
}

function StatsRow({openRequisitions, inPipeline, pendingOffers, interviewsThisWeek}: {
  openRequisitions: number;
  inPipeline: number;
  pendingOffers: number;
  interviewsThisWeek: number;
}) {
  const items = [
    {label: 'Open requisitions', value: openRequisitions, icon: Briefcase, tone: 'neutral' as const},
    {label: 'Candidates in pipeline', value: inPipeline, icon: Users, tone: 'neutral' as const},
    {label: 'Offers pending', value: pendingOffers, icon: FileText, tone: pendingOffers > 0 ? 'warning' as const : 'neutral' as const},
    {label: 'Interviews this week', value: interviewsThisWeek, icon: Calendar, tone: 'neutral' as const},
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
      aria-label="Recruitment at a glance"
      className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{hidden: {opacity: 0, y: 6}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
          className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0"
        >
          <div className="flex items-center gap-2 text-[var(--text-3)]">
            <item.icon className="h-3.5 w-3.5" aria-hidden="true"/>
            <span className="text-2xs font-bold uppercase tracking-[0.08em]">{item.label}</span>
          </div>
          <p
            className={`mt-3 font-mono text-3xl sm:text-4xl tabular-nums tracking-tight ${
              item.tone === 'warning' ? 'text-warning-700 dark:text-warning-300' : 'text-[var(--text-1)]'
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
          <Skeleton className="h-3 w-24 rounded"/>
          <Skeleton className="mt-3 h-9 w-20 rounded"/>
        </div>
      ))}
    </div>
  );
}

function BentoNavigation({pipelineCount, interviewsCount, pendingOffers}: {
  pipelineCount: number;
  interviewsCount: number;
  pendingOffers: number;
}) {
  const hero = {
    title: 'Active pipeline',
    description: 'Drag candidates through stages, watch bottlenecks emerge, and act before great people cool off.',
    icon: Users,
    href: '/recruitment/candidates',
    badge: pipelineCount > 0 ? pipelineCount : undefined,
  };

  const tiles = [
    {
      title: 'Job openings',
      description: 'Manage requisitions, statuses, and applicant counts per role.',
      icon: Briefcase,
      href: '/recruitment/jobs',
    },
    {
      title: 'Interviews',
      description: 'Schedule, reschedule, and review feedback across rounds.',
      icon: Calendar,
      href: '/recruitment/interviews',
      badge: interviewsCount > 0 ? interviewsCount : undefined,
    },
    {
      title: 'Scorecards',
      description: 'Structured evaluation rubrics for consistent hiring decisions.',
      icon: Award,
      href: '/recruitment/scorecards',
    },
    {
      title: 'Agencies',
      description: 'Partner agencies, submissions, and commission tracking.',
      icon: Building2,
      href: '/recruitment/agencies',
    },
    {
      title: 'Job boards',
      description: 'Syndicate roles to external boards and aggregators.',
      icon: Globe,
      href: '/recruitment/job-boards',
    },
    {
      title: 'Career page',
      description: 'Public-facing site for direct applicants and employer branding.',
      icon: ClipboardList,
      href: '/recruitment/career-page',
      badge: pendingOffers > 0 ? pendingOffers : undefined,
    },
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}}}}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      aria-label="Explore recruitment"
    >
      <BentoHero {...hero} />
      {tiles.map((tile) => (
        <BentoTile key={tile.href} {...tile} />
      ))}
    </motion.section>
  );
}

function BentoHero({title, description, icon: Icon, href, badge}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}) {
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: EASE}}}}
      className="lg:col-span-7 lg:row-span-2"
    >
      <Link
        href={href}
        className="group block h-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-7 sm:p-9 transition-all hover:border-[var(--border-main)] hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <Icon className="h-5 w-5" aria-hidden="true"/>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true"/>
        </div>
        <h2 className="mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-heading)]">
          {title}
        </h2>
        <p className="mt-3 text-body-secondary max-w-[48ch]">
          {description}
        </p>
        <div className="mt-10 flex items-end justify-between gap-6">
          <PipelineBars/>
          <div className="flex flex-col items-end gap-2">
            {badge !== undefined && (
              <span className="inline-flex items-center justify-center min-w-6 px-2 h-5 text-2xs font-semibold rounded-full bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
                {badge}
              </span>
            )}
            <p className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Live data
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function PipelineBars() {
  const widths = [88, 64, 50, 36, 22];
  return (
    <div className="flex items-end gap-1.5 h-16 flex-1" aria-hidden="true">
      {widths.map((w, i) => (
        <motion.span
          key={i}
          initial={{height: '0%'}}
          animate={{height: `${w}%`}}
          transition={{duration: 0.7, ease: EASE, delay: 0.35 + i * 0.06}}
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
        className="group flex h-full items-start gap-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 transition-all hover:border-[var(--border-main)] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.07)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
          <Icon className="h-4 w-4" aria-hidden="true"/>
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
        <ArrowRight className="h-4 w-4 self-center text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true"/>
      </Link>
    </motion.div>
  );
}

function CandidatesNeedingAttention({items, router}: {
  items: Candidate[];
  router: ReturnType<typeof useRouter>;
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
          Candidates needing attention
        </h2>
        <Link
          href="/recruitment/candidates"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 dark:text-accent-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true"/>
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {items.map((c) => {
          const tone = statusTone(c.status);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => router.push(`/recruitment/candidates?id=${c.id}`)}
                className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 sm:gap-6 text-left hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] rounded transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  <Users className="h-4 w-4" aria-hidden="true"/>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-heading)] truncate">{c.fullName}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {c.jobTitle || 'Position not specified'} · applied {c.appliedDate ? canonicalFormatDate(c.appliedDate) : 'N/A'}
                  </p>
                </div>
                <p
                  className={`font-mono text-xs font-semibold uppercase tabular-nums tracking-wider ${
                    tone === 'success' ? 'text-success-700 dark:text-success-300'
                      : tone === 'warning' ? 'text-warning-700 dark:text-warning-300'
                        : tone === 'danger' ? 'text-danger-700 dark:text-danger-300'
                          : tone === 'info' ? 'text-accent-700 dark:text-accent-300'
                            : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {c.status?.replace(/_/g, ' ') ?? '—'}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

function InterviewsThisWeek({items}: {items: Interview[]}) {
  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.36}}
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
          Interviews this week
        </h2>
        <Link
          href="/recruitment/interviews"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 dark:text-accent-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
        >
          View schedule
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true"/>
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {items.map((i) => (
          <li key={i.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 sm:gap-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              <Calendar className="h-4 w-4" aria-hidden="true"/>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-heading)] truncate">
                {i.candidateName || 'Candidate'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {i.jobTitle || 'Position'}
                {i.interviewRound ? ` · ${i.interviewRound.replace(/_/g, ' ')}` : ''}
              </p>
            </div>
            <p className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-[var(--text-secondary)]">
              <Clock className="h-3.5 w-3.5" aria-hidden="true"/>
              {i.scheduledAt ? `${canonicalFormatDate(i.scheduledAt)} · ${canonicalFormatTime(i.scheduledAt)}` : 'N/A'}
            </p>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function OffersAlert({count}: {count: number}) {
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
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden="true"/>
        <p className="text-[var(--text-primary)]">
          <span className="font-semibold">{count}</span>{' '}
          {count === 1 ? 'offer is' : 'offers are'} extended and awaiting candidate response. Follow up before they go cold.
        </p>
      </div>
      <Link href="/recruitment/candidates?status=OFFER_EXTENDED">
        <Button variant="outline" size="sm">
          Review
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true"/>
        </Button>
      </Link>
    </motion.aside>
  );
}
