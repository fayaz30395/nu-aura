'use client';

import React, {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {format, parseISO} from 'date-fns';
import {ArrowRight, CalendarDays, CheckCircle2, Clock, Inbox, User} from 'lucide-react';

import {useToast} from '@/components/notifications';
import {getErrorMessage} from '@/lib/utils/error-handler';
import {AppLayout} from '@/components/layout';
import {Button, buttonVariants} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {Callout} from '@/components/ui/Callout';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {Stat} from '@/components/ui/Stat';
import {DashboardSkeleton} from '@/components/ui/skeletons';
import {PageTransition} from '@/components/motion';

// Dashboard widget components (preserved)
import {QuickAccessWidget} from '@/components/dashboard/WelcomeBanner';
import {TimeClockWidget} from '@/components/dashboard/TimeClockWidget';
import {HolidayCarousel} from '@/components/dashboard/HolidayCarousel';
import {OnLeaveTodayCard, WorkingRemotelyCard} from '@/components/dashboard/TeamPresenceWidget';
import {LeaveBalanceWidget} from '@/components/dashboard/LeaveBalanceWidget';
import {PostComposer} from '@/components/dashboard/PostComposer';
import {BirthdayWishingBoard} from '@/components/dashboard/BirthdayWishingBoard';
import {CelebrationTabs} from '@/components/dashboard/CelebrationTabs';
import {CompanyFeed} from '@/components/dashboard/CompanyFeed';

import {useAuth} from '@/lib/hooks/useAuth';
import {attendanceService} from '@/lib/services/hrms/attendance.service';
import {useSelfServiceDashboard} from '@/lib/hooks/queries';
import {useLeaveBalances} from '@/lib/hooks/queries/useHome';
import {useQueryClient} from '@tanstack/react-query';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('Dashboard');

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function MyDashboardPage() {
  const {user, hasHydrated} = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Access-denied feedback is handled centrally in AppLayout (single toast, param
  // stripped) — no per-page handler here, which previously double-fired the toast.
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [localCheckOutTime, setLocalCheckOutTime] = useState<string | null>(null);

  const {data: dashboard, isLoading: queryLoading} = useSelfServiceDashboard(
    user?.employeeId || '',
    hasHydrated && !!user?.employeeId
  );
  const {data: leaveBalances} = useLeaveBalances(
    user?.employeeId || null,
    hasHydrated && !!user?.employeeId
  );

  const isLoading = !hasHydrated || (!!user?.employeeId && queryLoading);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    if (!isLoading) { setLoadingTimedOut(false); return; }
    const id = setTimeout(() => setLoadingTimedOut(true), 30_000);
    return () => clearTimeout(id);
  }, [isLoading]);

  useEffect(() => {
    if (dashboard) {
      const status = dashboard.todayAttendanceStatus;
      if (status === 'PRESENT' || status === 'HALF_DAY' || status === 'INCOMPLETE') {
        if (dashboard.todayCheckOutTime) {
          setIsCheckedIn(false);
        } else {
          setIsCheckedIn(true);
        }
        if (dashboard.todayCheckInTime) {
          setCheckInTime(parseISO(dashboard.todayCheckInTime));
        }
      }
    }
  }, [dashboard]);

  const refreshDashboard = useCallback(async () => {
    await queryClient.invalidateQueries({queryKey: ['selfServiceDashboard']});
  }, [queryClient]);

  const handleCheckIn = useCallback(async () => {
    if (!user?.employeeId) return;
    try {
      setCheckingIn(true);
      await attendanceService.checkIn({
        employeeId: user.employeeId,
        attendanceDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setIsCheckedIn(true);
      // Anchor the live "Working:" timer to client-now for the just-clicked case — the user
      // checked in *now*, so this avoids a refetch round-trip. On reload the restore path uses
      // dashboard.todayCheckInTime, which the server now serializes as an offset-aware instant
      // (OffsetDateTime), so parseISO yields the correct absolute start regardless of browser tz.
      setCheckInTime(new Date());
      refreshDashboard();
    } catch (error: unknown) {
      log.error('Check-in failed:', error);
      toast.error('Attendance', getErrorMessage(error, 'Check-in failed. Please try again.'));
    } finally {
      setCheckingIn(false);
    }
  }, [user?.employeeId, refreshDashboard, toast]);

  const handleCheckOut = useCallback(async () => {
    if (!user?.employeeId) return;
    try {
      setCheckingIn(true);
      await attendanceService.checkOut({
        employeeId: user.employeeId,
        attendanceDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setIsCheckedIn(false);
      setCheckInTime(null);
      setLocalCompleted(true);
      setLocalCheckOutTime(new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true}));
      refreshDashboard();
    } catch (error: unknown) {
      log.error('Check-out failed:', error);
      toast.error('Attendance', getErrorMessage(error, 'Check-out failed. Please try again.'));
    } finally {
      setCheckingIn(false);
    }
  }, [user?.employeeId, refreshDashboard, toast]);

  if (!hasHydrated || isLoading) {
    return (
      <AppLayout activeMenuItem="my-dashboard" showBreadcrumbs={false}>
        <h1 className="sr-only">My Dashboard</h1>
        {loadingTimedOut ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center" role="status">
            <p className="text-sm text-text-2">Dashboard is taking longer than expected.</p>
            <Button
              variant="secondary"
              onClick={() => { setLoadingTimedOut(false); queryClient.invalidateQueries({queryKey: ['selfServiceDashboard']}); }}
            >
              Retry
            </Button>
          </div>
        ) : (
          <DashboardSkeleton stats={4}/>
        )}
      </AppLayout>
    );
  }

  const isSuperAdminOrAdmin = user?.roles?.some(
    r => typeof r === 'string'
      ? (r === 'SUPER_ADMIN' || r === 'ADMIN')
      : (r?.code === 'SUPER_ADMIN' || r?.code === 'ADMIN')
  );

  if (!dashboard && !isSuperAdminOrAdmin) {
    return (
      <AppLayout activeMenuItem="my-dashboard" showBreadcrumbs={false}>
        <div className="flex flex-col gap-6">
          <PageHeader title="My Dashboard"/>
          <div className="rounded-lg border border-border bg-card p-4" role="status">
            <EmptyState
              icon={<User className="h-8 w-8" aria-hidden="true"/>}
              title="No employee profile linked"
              description="Your account is not linked to an employee profile. Please contact your HR administrator to complete the setup."
            />
          </div>
        </div>
      </AppLayout>
    );
  }

  const employeeName = dashboard?.employeeName || user?.fullName || 'Employee';
  const firstName = employeeName.split(' ')[0];
  const designation = dashboard?.designation || (isSuperAdminOrAdmin ? 'Super Admin' : undefined);
  const department = dashboard?.department || (isSuperAdminOrAdmin ? 'Administration' : undefined);
  const subtitle = [designation, department].filter(Boolean).join(' · ');

  const pendingApprovals = dashboard?.pendingApprovals ?? 0;
  const pendingTimesheets = dashboard?.pendingTimesheets ?? 0;
  const pendingProfileUpdates = dashboard?.pendingProfileUpdates ?? 0;
  const totalPending = pendingApprovals + pendingTimesheets + pendingProfileUpdates;
  const attendancePct = dashboard?.attendancePercentage ?? 0;
  const teamOnLeave = dashboard?.teamMembersOnLeave ?? 0;

  return (
    <AppLayout activeMenuItem="my-dashboard" showBreadcrumbs={false}>
      <PageTransition>
        <div className="flex flex-col gap-6">
          <PageHeader
            title={`${getGreeting()}, ${firstName}.`}
            description={`${format(new Date(), 'EEEE, MMMM d')} · ${subtitle
              ? `${subtitle}. Here's what's on your plate today.`
              : "Here's what's on your plate today — attendance, approvals, and your team at a glance."}`}
            actions={
              <Link
                href="/approvals/inbox"
                prefetch={false}
                className={buttonVariants({variant: totalPending > 0 ? 'primary' : 'outline', size: 'md'})}
              >
                <Inbox className="h-4 w-4" aria-hidden="true"/>
                Inbox
                {totalPending > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-white/20 px-1 text-2xs font-semibold tabular-nums">
                    {totalPending}
                  </span>
                )}
              </Link>
            }
          />

          <StatsRow
            attendancePercentage={attendancePct}
            presentDays={dashboard?.presentDaysThisMonth ?? 0}
            pendingActions={totalPending}
            teamOnLeave={teamOnLeave}
          />

          {/* Hero tile — Time Clock for employees, Quick Access fallback for admins */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" aria-label="Today">
            <div className="lg:col-span-7 min-w-0">
              {user?.employeeId ? (
                <TimeClockWidget
                  isCheckedIn={isCheckedIn}
                  checkInTime={checkInTime}
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  isLoading={checkingIn}
                  isCompleted={localCompleted || (!isCheckedIn && !!dashboard?.todayCheckInTime && !!dashboard?.todayCheckOutTime)}
                  checkOutTime={localCheckOutTime || (dashboard?.todayCheckOutTime ? new Date(dashboard.todayCheckOutTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  }) : null)}
                  workDurationMinutes={null}
                />
              ) : (
                <QuickAccessWidget
                  pendingApprovals={pendingApprovals}
                  pendingTimesheets={pendingTimesheets}
                  pendingProfileUpdates={pendingProfileUpdates}
                  inboxCount={0}
                />
              )}
            </div>
            <div className="lg:col-span-5 min-w-0">
              {user?.employeeId ? (
                <QuickAccessWidget
                  pendingApprovals={pendingApprovals}
                  pendingTimesheets={pendingTimesheets}
                  pendingProfileUpdates={pendingProfileUpdates}
                  inboxCount={0}
                />
              ) : (
                <HolidayCarousel/>
              )}
            </div>
          </section>

          {totalPending > 0 && (
            <div role="status" aria-live="polite">
              <Callout
                tone="warning"
                icon={<Clock className="h-4 w-4" aria-hidden="true"/>}
                action={
                  <Link href="/approvals/inbox" prefetch={false} className={buttonVariants({variant: 'outline', size: 'sm'})}>
                    Review
                    <ArrowRight className="h-4 w-4" aria-hidden="true"/>
                  </Link>
                }
              >
                <span className="font-semibold tabular-nums">{totalPending}</span>{' '}
                {totalPending === 1 ? 'item is' : 'items are'} waiting on your action.
              </Callout>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" aria-label="Your team and time off">
            {user?.employeeId && (
              <div className="lg:col-span-5 min-w-0">
                <LeaveBalanceWidget
                  leaveBalances={
                    leaveBalances
                      ? leaveBalances.map((b) => ({
                        leaveTypeId: b.leaveTypeId,
                        leaveName: b.leaveTypeName || b.leaveTypeId,
                        available: b.available,
                        total: b.openingBalance + b.accrued,
                        used: b.used,
                      }))
                      : undefined
                  }
                />
              </div>
            )}
            {user?.employeeId && (
              <div className="lg:col-span-7 min-w-0">
                <HolidayCarousel/>
              </div>
            )}
            <div className="lg:col-span-6 min-w-0">
              <OnLeaveTodayCard/>
            </div>
            <div className="lg:col-span-6 min-w-0">
              <WorkingRemotelyCard/>
            </div>
          </section>

          {/* Birthday banner — conditional, only renders on user's birthday */}
          <BirthdayWishingBoard/>

          <section className="flex flex-col gap-6" aria-label="Company feed">
            <PostComposer onPostCreated={() => setFeedRefreshKey((k) => k + 1)}/>
            <div data-section="celebrations">
              <CelebrationTabs/>
            </div>
            <CompanyFeed employeeId={user?.employeeId} refreshKey={feedRefreshKey}/>
          </section>
        </div>
      </PageTransition>
    </AppLayout>
  );
}

function StatsRow({attendancePercentage, presentDays, pendingActions, teamOnLeave}: {
  attendancePercentage: number;
  presentDays: number;
  pendingActions: number;
  teamOnLeave: number;
}) {
  const items = [
    {label: 'Attendance this month', value: `${Math.round(attendancePercentage)}%`, icon: CheckCircle2, tone: 'default' as const},
    {label: 'Days present', value: presentDays, icon: CalendarDays, tone: 'default' as const},
    {label: 'Pending actions', value: pendingActions, icon: Clock, tone: pendingActions > 0 ? 'warning' as const : 'default' as const},
    {label: 'Team on leave today', value: teamOnLeave, icon: User, tone: 'default' as const},
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Your month at a glance">
      {items.map((item) => (
        <Card key={item.label} padding="sm">
          <Stat
            label={item.label}
            value={item.value}
            tone={item.tone}
            icon={<item.icon className="h-4 w-4" aria-hidden="true"/>}
            iconTone={item.tone === 'warning' ? 'warning' : 'neutral'}
          />
        </Card>
      ))}
    </section>
  );
}
