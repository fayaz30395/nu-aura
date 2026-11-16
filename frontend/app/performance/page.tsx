'use client';

import React, {useMemo} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Button} from '@mantine/core';
import {ArrowRight, TrendingUp} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {Callout} from '@/components/ui/Callout';
import {QueryErrorCard} from '@/components/ui/QueryState';
import {usePermissions} from '@/lib/hooks/usePermissions';
import {useAllGoals} from '@/lib/hooks/queries/useGoals';
import {useMyPending360Reviews} from '@/lib/hooks/queries/useFeedback360';
import {useOkrDashboardSummary} from '@/lib/hooks/queries/useOkr';
import {usePerformanceActiveCycles} from '@/lib/hooks/queries/useReviewCycles';
import {type DashboardStats, OverviewStats, OverviewStatsSkeleton} from './_components/OverviewStats';
import {OverviewNavTiles} from './_components/OverviewNavTiles';

const PERFORMANCE_ALLOWED_ROLES = [
  'SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'HR_MANAGER',
  'MANAGER', 'TEAM_LEAD', 'SKIP_LEVEL_MANAGER', 'REPORTING_MANAGER',
  'EMPLOYEE',
];

export default function PerformancePage() {
  const router = useRouter();
  const {hasAnyRole, isPermissionReady} = usePermissions();
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

  const queries = [goalsQuery, cyclesQuery, okrQuery, pending360Query];
  const isLoading = queries.some((q) => q.isLoading);
  const hasError = queries.some((q) => q.isError);
  const isRetrying = queries.some((q) => q.isFetching);

  if (isPermissionReady && !hasAccess) {
    return (
      <AppLayout>
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning-50 text-warning-700 dark:bg-warning-950/30 dark:text-warning-400">
            <TrendingUp className="h-5 w-5" aria-hidden="true"/>
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-text-1">Access restricted</h1>
            <p className="mx-auto max-w-prose text-sm text-text-2">
              You don&apos;t have permission to access the Performance hub. View your goals and reviews from My Dashboard.
            </p>
          </div>
          <Button onClick={() => router.push('/me/dashboard')}>Go to My Dashboard</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="performance">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title="Goals, reviews, and growth in one steady rhythm."
          description="Track progress, run cycles, and finalise ratings without losing the thread."
          actions={
            <Button component={Link} href="/performance/goals"
                    rightSection={<ArrowRight className="h-4 w-4" aria-hidden="true"/>}>
              Set a goal
            </Button>
          }
        />

        {hasError ? (
          <QueryErrorCard
            title="Failed to load performance data"
            message="Unable to fetch performance metrics. Please check your connection and try again."
            retrying={isRetrying}
            onRetry={() => {
              goalsQuery.refetch();
              cyclesQuery.refetch();
              okrQuery.refetch();
              pending360Query.refetch();
            }}
          />
        ) : isLoading ? (
          <OverviewStatsSkeleton/>
        ) : (
          <OverviewStats stats={stats}/>
        )}

        {stats.pending360Reviews > 0 && (
          <div role="status" aria-live="polite">
            <Callout
              tone="warning"
              action={
                <Button component={Link} href="/performance/360-feedback" variant="default" size="sm"
                        rightSection={<ArrowRight className="h-4 w-4" aria-hidden="true"/>}>
                  Review now
                </Button>
              }
            >
              <span className="font-semibold tabular-nums">{stats.pending360Reviews}</span>{' '}
              {stats.pending360Reviews === 1 ? '360 feedback request is' : '360 feedback requests are'} waiting on you.
            </Callout>
          </div>
        )}

        <OverviewNavTiles pending360={stats.pending360Reviews} activeCycles={stats.activeReviewCycles}/>
      </div>
    </AppLayout>
  );
}
