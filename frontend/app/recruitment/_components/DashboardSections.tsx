'use client';

import React from 'react';
import Link from 'next/link';
import {Button} from '@mantine/core';
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
  KanbanSquare,
  Users,
} from 'lucide-react';
import {StatusBadge} from '@/components/ui/StatusBadge';
import type {StatusTone} from '@/lib/status/vocabulary';
import type {Candidate, CandidateStatus, Interview} from '@/lib/types/hire/recruitment';
import {formatDate, formatTime} from '@/lib/utils/format/date';
import type {RecruitmentStats} from '../_hooks/useRecruitmentDashboard';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2';

const CANDIDATE_TONE: Record<CandidateStatus, StatusTone> = {
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

const humanize = (value: string) =>
  value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function StatsRow({stats}: {stats: RecruitmentStats}) {
  const items = [
    {label: 'Open requisitions', value: stats.openRequisitions, icon: Briefcase, href: '/recruitment/jobs'},
    {label: 'Candidates in pipeline', value: stats.inPipeline, icon: Users, href: '/recruitment/candidates'},
    {
      label: 'Pending offers',
      value: stats.pendingOffers,
      icon: FileText,
      href: '/recruitment/candidates?status=OFFER_EXTENDED',
      warn: stats.pendingOffers > 0,
    },
    {label: 'Interviews this week', value: stats.interviewsThisWeek, icon: Calendar, href: '/recruitment/interviews'},
  ];

  return (
    <section aria-label="Recruitment at a glance" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors duration-150 hover:border-border-strong ${FOCUS_RING}`}
        >
          <span className="flex items-center gap-2 text-xs font-medium text-text-2">
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true"/>
            {item.label}
          </span>
          <span
            className={`text-2xl font-semibold tabular-nums ${item.warn ? 'text-warning-700 dark:text-warning-300' : 'text-text-1'}`}
          >
            {item.value}
          </span>
        </Link>
      ))}
    </section>
  );
}

const NAV_TILES = [
  {title: 'Candidates', description: 'Review applicants, screen resumes, and extend offers.', icon: Users, href: '/recruitment/candidates'},
  {title: 'Pipeline', description: 'Move candidates through stages on a kanban board.', icon: KanbanSquare, href: '/recruitment/pipeline'},
  {title: 'Job openings', description: 'Manage requisitions, statuses, and openings per role.', icon: Briefcase, href: '/recruitment/jobs'},
  {title: 'Interviews', description: 'Schedule, reschedule, and review feedback across rounds.', icon: Calendar, href: '/recruitment/interviews'},
  {title: 'Scorecards', description: 'Structured evaluation rubrics for consistent decisions.', icon: Award, href: '/recruitment/scorecards'},
  {title: 'Agencies', description: 'Partner agencies, submissions, and commission tracking.', icon: Building2, href: '/recruitment/agencies'},
  {title: 'Job boards', description: 'Syndicate roles to external boards and aggregators.', icon: Globe, href: '/recruitment/job-boards'},
  {title: 'Career page', description: 'Public site for direct applicants and employer branding.', icon: ClipboardList, href: '/recruitment/career-page'},
];

export function NavigationTiles({counts}: {counts: Partial<Record<string, number>>}) {
  return (
    <section aria-labelledby="recruitment-explore-heading" className="flex flex-col gap-4">
      <h2 id="recruitment-explore-heading" className="text-base font-semibold text-text-1">Explore recruitment</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {NAV_TILES.map((tile) => {
          const badge = counts[tile.href];
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className={`group flex h-full items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors duration-150 hover:border-border-strong ${FOCUS_RING}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-aura-sunken text-text-2">
                <tile.icon className="h-4 w-4" aria-hidden="true"/>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text-1">{tile.title}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="badge-status status-info tabular-nums" aria-label={`${badge} active`}>{badge}</span>
                  )}
                </span>
                <span className="text-xs text-text-2">{tile.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeading({id, title, href, linkLabel}: {id: string; title: string; href: string; linkLabel: string}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="text-base font-semibold text-text-1">{title}</h2>
      <Link href={href} className={`inline-flex items-center gap-1 rounded text-sm font-medium text-accent hover:underline ${FOCUS_RING}`}>
        {linkLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true"/>
      </Link>
    </div>
  );
}

export function CandidatesNeedingAttention({items}: {items: Candidate[]}) {
  return (
    <section aria-labelledby="needs-attention-heading" className="flex flex-col gap-4">
      <SectionHeading id="needs-attention-heading" title="Candidates needing attention" href="/recruitment/candidates" linkLabel="View all"/>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href={`/recruitment/candidates/${c.id}`}
              className={`flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-[var(--surface-hover)] ${FOCUS_RING}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text-1">{c.fullName}</span>
                <span className="block truncate text-xs text-text-2">
                  {c.jobTitle || 'Position not specified'} · applied {c.appliedDate ? formatDate(c.appliedDate) : 'N/A'}
                </span>
              </span>
              {c.status && (
                <StatusBadge status={c.status} label={humanize(c.status)} tone={CANDIDATE_TONE[c.status] ?? 'neutral'}/>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InterviewsThisWeek({items}: {items: Interview[]}) {
  return (
    <section aria-labelledby="interviews-week-heading" className="flex flex-col gap-4">
      <SectionHeading id="interviews-week-heading" title="Interviews this week" href="/recruitment/interviews" linkLabel="View schedule"/>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-4 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text-1">{i.candidateName || 'Candidate'}</span>
              <span className="block truncate text-xs text-text-2">
                {i.jobTitle || 'Position'}
                {i.interviewRound ? ` · ${humanize(i.interviewRound)}` : ''}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-text-2">
              <Clock className="h-4 w-4" aria-hidden="true"/>
              {i.scheduledAt ? `${formatDate(i.scheduledAt)} · ${formatTime(i.scheduledAt)}` : 'N/A'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OffersAlert({count}: {count: number}) {
  return (
    <aside
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 dark:border-warning-700/40 dark:bg-warning-950/30"
    >
      <p className="flex items-center gap-2 text-sm text-text-1">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden="true"/>
        <span>
          <span className="font-semibold tabular-nums">{count}</span>{' '}
          {count === 1 ? 'offer is' : 'offers are'} extended and awaiting candidate response.
        </span>
      </p>
      <Button
        component={Link}
        href="/recruitment/candidates?status=OFFER_EXTENDED"
        variant="default"
        size="sm"
        rightSection={<ArrowRight className="h-4 w-4" aria-hidden="true"/>}
      >
        Review offers
      </Button>
    </aside>
  );
}
