'use client';

import React, {useEffect} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@mantine/core';
import {Lock, Plus, UserPlus} from 'lucide-react';

import {useToast} from '@/components/notifications';
import {AppLayout} from '@/components/layout';
import {PageTransition} from '@/components/motion';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {EmptyState} from '@/components/ui/EmptyState';
import {DashboardSkeleton} from '@/components/ui/skeletons';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useRecruitmentDashboard} from './_hooks/useRecruitmentDashboard';
import {
  CandidatesNeedingAttention,
  InterviewsThisWeek,
  NavigationTiles,
  OffersAlert,
  StatsRow,
} from './_components/DashboardSections';

const RECRUITMENT_ALLOWED_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'HR_MANAGER', 'RECRUITMENT_ADMIN'];
const BREADCRUMBS = [{label: 'NU-Hire'}, {label: 'Recruitment'}];

export default function RecruitmentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const {hasAnyRole, isPermissionReady} = usePermissions();
  const {statsQuery, needingAttention, upcomingInterviews} = useRecruitmentDashboard();

  useEffect(() => {
    if (searchParams.get('denied') === '1') {
      toast.error('Access Denied', 'You do not have permission to access that page.');
    }
  }, [searchParams, toast]);

  useEffect(() => {
    document.title = 'Recruitment | NU-AURA';
  }, []);

  const hasAccess = hasAnyRole(...RECRUITMENT_ALLOWED_ROLES);

  if (isPermissionReady && !hasAccess) {
    return (
      <AppLayout>
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-text-2">
            <Lock className="h-4 w-4" aria-hidden="true"/>
          </span>
          <h1 className="text-2xl font-semibold text-text-1">Access Restricted</h1>
          <p className="text-sm text-text-2">
            You don&apos;t have permission to access the Recruitment dashboard. Use the Referrals page to submit employee referrals.
          </p>
          <Button onClick={() => router.push('/me/dashboard')}>Go to my dashboard</Button>
        </div>
      </AppLayout>
    );
  }

  const stats = statsQuery.data;

  return (
    <AppLayout activeMenuItem="recruitment">
      <PermissionGate
        anyOf={[Permissions.RECRUITMENT_VIEW, Permissions.RECRUITMENT_VIEW_ALL]}
        fallback={
          <EmptyState
            icon={<Lock className="h-full w-full"/>}
            title="No access to recruitment data"
            description="You do not have permission to view recruitment data."
          />
        }
      >
        <PageTransition className="flex flex-col gap-6">
          <PageHeader
            title="Recruitment"
            description="Track open roles, move candidates through stages, and keep interviews and offers on time."
            breadcrumbs={BREADCRUMBS}
            actions={
              <>
                <PermissionGate permission={Permissions.CANDIDATE_VIEW}>
                  <Button
                    variant="default"
                    leftSection={<UserPlus className="h-4 w-4" aria-hidden="true"/>}
                    onClick={() => router.push('/recruitment/candidates?new=1')}
                  >
                    Add candidate
                  </Button>
                </PermissionGate>
                <PermissionGate permission={Permissions.RECRUITMENT_CREATE}>
                  <Button
                    leftSection={<Plus className="h-4 w-4" aria-hidden="true"/>}
                    onClick={() => router.push('/recruitment/jobs?new=1')}
                  >
                    Post new job
                  </Button>
                </PermissionGate>
              </>
            }
          />

          <QueryState
            query={statsQuery}
            skeleton={<DashboardSkeleton showHeader={false}/>}
            errorTitle="Couldn't load recruitment data"
          >
            {(data) => <StatsRow stats={data}/>}
          </QueryState>

          {stats && stats.pendingOffers > 0 && <OffersAlert count={stats.pendingOffers}/>}

          {(needingAttention.length > 0 || upcomingInterviews.length > 0) && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {needingAttention.length > 0 && <CandidatesNeedingAttention items={needingAttention}/>}
              {upcomingInterviews.length > 0 && <InterviewsThisWeek items={upcomingInterviews}/>}
            </div>
          )}

          <NavigationTiles
            counts={{
              '/recruitment/candidates': stats?.inPipeline,
              '/recruitment/interviews': stats?.interviewsThisWeek,
            }}
          />
        </PageTransition>
      </PermissionGate>
    </AppLayout>
  );
}
