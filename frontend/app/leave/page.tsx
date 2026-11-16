'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Button} from '@mantine/core';
import {ArrowRight, CalendarPlus, Fingerprint, Palmtree} from 'lucide-react';

import {AppLayout} from '@/components/layout/AppLayout';
import {Callout} from '@/components/ui/Callout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {Segmented} from '@/components/ui/Segmented';
import {Bone, SkeletonRegion} from '@/components/ui/skeletons/SkeletonRegion';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useActiveLeaveTypes,
  useEmployeeBalancesForYear,
  useEmployeeLeaveRequests,
} from '@/lib/hooks/queries/useLeaves';
import {LeaveBalanceCard} from './_components/LeaveBalanceCard';
import {PendingRequestsCard} from './_components/PendingRequestsCard';
import {LeaveMonthCalendar} from './_components/LeaveMonthCalendar';
import {LeaveQuickLinks} from './_components/LeaveQuickLinks';

function PanelSkeleton({height}: {height: number}) {
  return (
    <SkeletonRegion className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4">
        <Bone height={16} width="40%" radius="sm"/>
        <Bone height={height} radius="md"/>
      </div>
    </SkeletonRegion>
  );
}

export default function LeavePage() {
  const router = useRouter();
  const {user, hasHydrated} = useAuth();
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();

  const year = new Date().getFullYear();
  const employeeId = user?.employeeId ?? '';

  const canRequest = hasAnyPermission(Permissions.LEAVE_REQUEST, Permissions.LEAVE_MANAGE);
  const canApprove = hasAnyPermission(Permissions.LEAVE_APPROVE, Permissions.LEAVE_MANAGE);

  const balancesQuery = useEmployeeBalancesForYear(employeeId, year, !!employeeId);
  const typesQuery = useActiveLeaveTypes(!!employeeId);
  const requestsQuery = useEmployeeLeaveRequests(employeeId, 0, 5, !!employeeId);

  const leaveTypes = typesQuery.data ?? [];
  const balances = balancesQuery.data ?? [];
  const recentRequests = requestsQuery.data?.content ?? [];
  const totalAvailable = balances.reduce((sum, b) => sum + (b.available ?? 0), 0);
  const pendingRequestCount = recentRequests.filter((r) => r.status === 'PENDING').length;

  const header = (
    <PageHeader
      title="Leave"
      description="Balances, requests and your time-off calendar."
      actions={
        <>
          <Segmented
            aria-label="Attendance or Leave"
            value="leave"
            onChange={(v) => router.push(v === 'attendance' ? '/attendance' : '/leave')}
            options={[
              {value: 'attendance', label: 'Attendance', icon: <Fingerprint className="h-4 w-4" aria-hidden="true"/>},
              {value: 'leave', label: 'Leave', icon: <Palmtree className="h-4 w-4" aria-hidden="true"/>},
            ]}
          />
          {canRequest && (
            <Button leftSection={<CalendarPlus size={16} aria-hidden="true"/>} onClick={() => router.push('/leave/apply')}>
              Apply Leave
            </Button>
          )}
        </>
      }
    />
  );

  if (!permissionsReady || !hasHydrated) {
    return (
      <AppLayout activeMenuItem="leave">
        <div className="flex flex-col gap-6">{header}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="leave">
      <div className="flex flex-col gap-6">
        {header}

        {!employeeId ? (
          <Callout tone="warning" title="No employee profile linked">
            Your account is not linked to an employee record, so leave data can&apos;t be shown.
          </Callout>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6">
              <QueryState
                query={balancesQuery}
                skeleton={<PanelSkeleton height={120}/>}
                errorTitle="Couldn't load your leave balance"
              >
                {(data) => <LeaveBalanceCard balances={data} leaveTypes={leaveTypes}/>}
              </QueryState>
              <QueryState
                query={requestsQuery}
                skeleton={<PanelSkeleton height={96}/>}
                errorTitle="Couldn't load your leave requests"
              >
                {(data) => <PendingRequestsCard requests={data.content} leaveTypes={leaveTypes}/>}
              </QueryState>
            </div>
            <div className="lg:col-span-2">
              <QueryState
                query={requestsQuery}
                skeleton={<PanelSkeleton height={360}/>}
                errorTitle="Couldn't load your leave calendar"
              >
                {(data) => <LeaveMonthCalendar requests={data.content} leaveTypes={leaveTypes}/>}
              </QueryState>
            </div>
          </div>
        )}

        {totalAvailable > 0 && totalAvailable < 3 && (
          <Callout
            tone="warning"
            title="Low leave balance"
            action={
              <Button component={Link} href="/leave/my-leaves" variant="default" size="sm" rightSection={<ArrowRight size={14} aria-hidden="true"/>}>
                Plan ahead
              </Button>
            }
          >
            You have <span className="font-semibold tabular-nums">{totalAvailable.toFixed(1)}</span> day
            {totalAvailable === 1 ? '' : 's'} left this year.
          </Callout>
        )}

        <LeaveQuickLinks canApprove={canApprove} pendingCount={pendingRequestCount}/>
      </div>
    </AppLayout>
  );
}
