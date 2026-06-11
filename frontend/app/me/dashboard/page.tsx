'use client';

import React, {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {format, parseISO} from 'date-fns';
import {motion} from 'framer-motion';
import {ArrowRight, CalendarDays, CheckCircle2, Clock, Inbox, User} from 'lucide-react';

import {useToast} from '@/components/notifications';
import {getErrorMessage} from '@/lib/utils/error-handler';
import {AppLayout} from '@/components/layout';
import {SkeletonDashboard} from '@/components/ui/Skeleton';
import {Button} from '@/components/ui/Button';
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';

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
import {useQueryClient} from '@tanstack/react-query';
import {createLogger} from '@/lib/utils/logger';
import {MOTION_EASE} from '@/lib/animation';

const log = createLogger('Dashboard');

// Consolidated onto the shared motion foundation: every transition on this page
// uses the foundation easing token (MOTION_EASE.outExpo) so there is a single
// source of truth for motion across all surfaces — no per-page cubic-bezier drift.
const EASE = [...MOTION_EASE.outExpo] as [number, number, number, number];

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

  const isLoading = !hasHydrated || (!!user?.employeeId && queryLoading);

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
      const response = await attendanceService.checkIn({
        employeeId: user.employeeId,
        attendanceDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setIsCheckedIn(true);
      if (response.checkInTime) {
        setCheckInTime(parseISO(response.checkInTime));
      } else {
        setCheckInTime(new Date());
      }
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
      <AppLayout activeMenuItem="my-dashboard" breadcrumbs={[{label: 'My Dashboard', href: '/me/dashboard'}]}>
        <div className="p-6">
          <h1 className="sr-only">My Dashboard</h1>
          <SkeletonDashboard/>
        </div>
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
      <AppLayout activeMenuItem="my-dashboard" breadcrumbs={[{label: 'My Dashboard', href: '/me/dashboard'}]}>
        <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center space-y-4" role="status">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
            <User className="h-5 w-5" aria-hidden="true"/>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-heading)]">
            No employee profile linked
          </h1>
          <p className="text-body-secondary max-w-[55ch] mx-auto">
            Your account is not linked to an employee profile. Please contact your HR administrator
            to complete the setup.
          </p>
        </div>
      </AppLayout>
    );
  }

  const employeeName = dashboard?.employeeName || user?.fullName || 'Employee';
  const firstName = employeeName.split(' ')[0];
  const designation = dashboard?.designation || (isSuperAdminOrAdmin ? 'Super Admin' : undefined);
  const department = dashboard?.department || (isSuperAdminOrAdmin ? 'Administration' : undefined);

  const pendingApprovals = dashboard?.pendingApprovals ?? 0;
  const pendingTimesheets = dashboard?.pendingTimesheets ?? 0;
  const pendingProfileUpdates = dashboard?.pendingProfileUpdates ?? 0;
  const totalPending = pendingApprovals + pendingTimesheets + pendingProfileUpdates;
  const attendancePct = dashboard?.attendancePercentage ?? 0;
  const teamOnLeave = dashboard?.teamMembersOnLeave ?? 0;

  return (
    <AppLayout
      activeMenuItem="my-dashboard"
      breadcrumbs={[{label: 'My Dashboard', href: '/me/dashboard'}]}
    >
      <PageTransition>
        <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader
          firstName={firstName}
          designation={designation}
          department={department}
          hasInbox={totalPending > 0}
          inboxCount={totalPending}
        />

        <StatsRow
          attendancePercentage={attendancePct}
          presentDays={dashboard?.presentDaysThisMonth ?? 0}
          pendingActions={totalPending}
          teamOnLeave={teamOnLeave}
        />

        {/* Bento — hero (Time clock or Welcome card) col-7, ancillary col-5 */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={{visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}}}}
          className="grid gap-4 grid-cols-1 lg:grid-cols-12"
          aria-label="Today"
        >
          {/* Hero tile — Time Clock for employees, Quick Access fallback for admins */}
          <motion.div
            variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: EASE}}}}
            className="lg:col-span-7"
          >
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
          </motion.div>

          {/* Sidekick — Quick Access (employees) or Holiday (admins) */}
          <motion.div
            variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.45, ease: EASE}}}}
            className="lg:col-span-5"
          >
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
          </motion.div>
        </motion.section>

        {/* Attention strip — surface when actions are waiting */}
        {totalPending > 0 && (
          <AttentionStrip count={totalPending}/>
        )}

        {/* Secondary grid — supplementary widgets stay grouped */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{once: true, amount: 0.15}}
          variants={{visible: {transition: {staggerChildren: 0.06}}}}
          className="grid gap-4 grid-cols-1 lg:grid-cols-12"
          aria-label="Your team and time off"
        >
          {user?.employeeId && (
            <motion.div
              variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
              className="lg:col-span-5"
            >
              <LeaveBalanceWidget
                leaveBalances={
                  dashboard?.leaveBalances
                    ? Object.entries(dashboard.leaveBalances).map(([name, available], idx) => {
                      const avail = available as number;
                      const total = avail + 2;
                      return {
                        leaveTypeId: String(idx),
                        leaveName: name,
                        available: avail,
                        total,
                        used: total - avail,
                      };
                    })
                    : undefined
                }
              />
            </motion.div>
          )}

          {user?.employeeId && (
            <motion.div
              variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
              className="lg:col-span-7"
            >
              <HolidayCarousel/>
            </motion.div>
          )}

          <motion.div
            variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
            className={user?.employeeId ? 'lg:col-span-6' : 'lg:col-span-6'}
          >
            <OnLeaveTodayCard/>
          </motion.div>

          <motion.div
            variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
            className="lg:col-span-6"
          >
            <WorkingRemotelyCard/>
          </motion.div>
        </motion.section>

        {/* Birthday banner — conditional, only renders on user's birthday */}
        <BirthdayWishingBoard/>

        {/* Social section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{once: true, amount: 0.1}}
          variants={{visible: {transition: {staggerChildren: 0.06}}}}
          className="space-y-6"
          aria-label="Company feed"
        >
          <motion.div
            variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
          >
            <PostComposer onPostCreated={() => setFeedRefreshKey((k) => k + 1)}/>
          </motion.div>

          <motion.div
            data-section="celebrations"
            variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
          >
            <CelebrationTabs/>
          </motion.div>

          <motion.div
            variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
          >
            <CompanyFeed employeeId={user?.employeeId} refreshKey={feedRefreshKey}/>
          </motion.div>
        </motion.section>
        </div>
      </PageTransition>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader({firstName, designation, department, hasInbox, inboxCount}: {
  firstName: string;
  designation?: string;
  department?: string;
  hasInbox: boolean;
  inboxCount: number;
}) {
  const today = format(new Date(), 'EEEE, MMMM d');
  const greeting = getGreeting();
  const subtitle = [designation, department].filter(Boolean).join(' · ');

  return (
    <Reveal className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <div className="space-y-2 max-w-2xl">
        <p className="text-aura-micro text-[var(--text-3)]">
          {today}
        </p>
        <h1 className="text-aura-title text-[var(--text-1)]">
          {greeting}, {firstName}.
        </h1>
        <p className="text-sm text-[var(--text-2)] max-w-[55ch]">
          {subtitle
            ? `${subtitle}. Here's what's on your plate today.`
            : "Here's what's on your plate today — attendance, approvals, and your team at a glance."}
        </p>
      </div>
      <Link href="/approvals/inbox" className="self-start sm:self-end">
        <Button variant={hasInbox ? 'primary' : 'outline'} size="md">
          <Inbox className="mr-2 h-4 w-4" aria-hidden="true"/>
          Inbox
          {hasInbox && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-aura-control text-2xs font-semibold bg-[var(--accent)] text-white">
              {inboxCount}
            </span>
          )}
        </Button>
      </Link>
    </Reveal>
  );
}

// ── Stats row (borders, not cards) ───────────────────────────────────────────
function StatsRow({attendancePercentage, presentDays, pendingActions, teamOnLeave}: {
  attendancePercentage: number;
  presentDays: number;
  pendingActions: number;
  teamOnLeave: number;
}) {
  const items = [
    {label: 'Attendance this month', value: `${Math.round(attendancePercentage)}%`, icon: CheckCircle2, tone: 'neutral' as const},
    {label: 'Days present', value: presentDays, icon: CalendarDays, tone: 'neutral' as const},
    {label: 'Pending actions', value: pendingActions, icon: Clock, tone: pendingActions > 0 ? 'warning' as const : 'neutral' as const},
    {label: 'Team on leave today', value: teamOnLeave, icon: User, tone: 'neutral' as const},
  ];

  return (
    <Stagger className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-soft)] divide-x divide-[var(--border-soft)]" aria-label="Your month at a glance">
      {items.map((item) => (
        <StaggerItem key={item.label} className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0 hover:bg-[var(--surface-sunken)] transition-colors">
          <div className="flex items-center gap-2 text-[var(--text-3)]">
            <item.icon className="h-3.5 w-3.5" aria-hidden="true"/>
            <span className="text-aura-micro">{item.label}</span>
          </div>
          <p
            className={`mt-3 text-aura-stat tabular-nums ${
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

// ── Attention strip (single-line, not a card) ────────────────────────────────
function AttentionStrip({count}: {count: number}) {
  return (
    <motion.aside
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.24}}
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-aura-lg border border-[var(--warn-bd)] bg-[var(--warn-bg)] px-5 py-4 hover-lift"
    >
      <div className="flex items-center gap-4 text-sm">
        <Clock className="h-4 w-4 shrink-0 text-[var(--warn-fg)]" aria-hidden="true"/>
        <p className="text-[var(--text-1)]">
          <span className="font-semibold">{count}</span>{' '}
          {count === 1 ? 'item is' : 'items are'} waiting on your action.
        </p>
      </div>
      <Link href="/approvals/inbox">
        <Button variant="outline" size="sm">
          Review
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true"/>
        </Button>
      </Link>
    </motion.aside>
  );
}
