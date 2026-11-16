'use client';

import React from 'react';
import Link from 'next/link';
import {Badge} from '@mantine/core';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Flag,
  Grid3X3,
  MessageSquare,
  Sliders,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

interface NavTile {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  permission: string | null;
  badge?: number;
}

const TILE_CLASS =
  'card-aura group flex h-full items-start gap-4 rounded-lg p-4 transition-colors hover:bg-surface-aura-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function Gate({permission, children}: {permission: string | null; children: React.ReactNode}) {
  if (!permission) return <>{children}</>;
  return <PermissionGate permission={permission} fallback={null}>{children}</PermissionGate>;
}

export function OverviewNavTiles({pending360, activeCycles}: {pending360: number; activeCycles: number}) {
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
    <section aria-labelledby="performance-explore-heading" className="flex flex-col gap-4">
      <h2 id="performance-explore-heading" className="text-base font-semibold text-text-1">
        Explore performance
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Gate permission={hero.permission}>
          <Link href={hero.href} className={`${TILE_CLASS} sm:col-span-2 xl:col-span-3`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-700 dark:bg-accent-950/30 dark:text-accent-400">
              <hero.icon className="h-5 w-5" aria-hidden="true"/>
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-text-1">{hero.title}</h3>
                <Badge variant="light" color="gray" radius="sm" size="sm">{hero.meta}</Badge>
              </div>
              <span className="text-sm text-text-2">{hero.description}</span>
            </div>
            <ArrowRight className="h-4 w-4 self-center text-text-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true"/>
          </Link>
        </Gate>
        {tiles.map((tile) => (
          <Gate key={tile.href} permission={tile.permission}>
            <Link href={tile.href} className={TILE_CLASS}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-aura-sunken text-text-2">
                <tile.icon className="h-4 w-4" aria-hidden="true"/>
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text-1">{tile.title}</h3>
                  {tile.badge !== undefined && (
                    <Badge variant="light" color="yellow" radius="sm" size="sm" className="tabular-nums"
                           aria-label={`${tile.badge} pending`}>
                      {tile.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-text-2">{tile.description}</span>
              </div>
              <ArrowRight className="h-4 w-4 self-center text-text-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true"/>
            </Link>
          </Gate>
        ))}
      </div>
    </section>
  );
}
