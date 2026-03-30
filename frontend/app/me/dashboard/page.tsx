'use client';

import { useState, useCallback, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/components/notifications';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import { Loading } from '@/components/ui';
// Dashboard widget components
import { WelcomeBanner, QuickAccessWidget } from '@/components/dashboard/WelcomeBanner';
import { TimeClockWidget } from '@/components/dashboard/TimeClockWidget';
import { HolidayCarousel } from '@/components/dashboard/HolidayCarousel';
import { OnLeaveTodayCard, WorkingRemotelyCard } from '@/components/dashboard/TeamPresenceWidget';
import { LeaveBalanceWidget } from '@/components/dashboard/LeaveBalanceWidget';
import { PostComposer } from '@/components/dashboard/PostComposer';
import { BirthdayWishingBoard } from '@/components/dashboard/BirthdayWishingBoard';
import { CelebrationTabs } from '@/components/dashboard/CelebrationTabs';
import { CompanyFeed } from '@/components/dashboard/CompanyFeed';
import { useAuth } from '@/lib/hooks/useAuth';
import { attendanceService } from '@/lib/services/attendance.service';
import { useSelfServiceDashboard } from '@/lib/hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('Dashboard');

export default function MyDashboardPage() {
  const { user, hasHydrated } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [localCheckOutTime, setLocalCheckOutTime] = useState<string | null>(null);

  // React Query — single source of truth for dashboard data
  const { data: dashboard, isLoading: queryLoading } = useSelfServiceDashboard(
    user?.employeeId || '',
    hasHydrated && !!user?.employeeId
  );

  const isLoading = !hasHydrated || (!!user?.employeeId && queryLoading);

  // Initialize attendance state from dashboard data
  useEffect(() => {
    if (dashboard) {
      const status = dashboard.todayAttendanceStatus;
      if (status === 'PRESENT' || status === 'HALF_DAY' || status === 'INCOMPLETE') {
        // Has checked in today
        if (dashboard.todayCheckOutTime) {
          // Already completed for the day
          setIsCheckedIn(false);
        } else {
          // Checked in but not out yet
          setIsCheckedIn(true);
        }
        if (dashboard.todayCheckInTime) {
          setCheckInTime(parseISO(dashboard.todayCheckInTime));
        }
      }
    }
  }, [dashboard]);

  // Refresh attendance state after check-in/check-out by invalidating the React Query cache
  const refreshDashboard = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['selfServiceDashboard'] });
  }, [queryClient]);

  const handleCheckIn = async () => {
    if (!user?.employeeId) return;

    try {
      setCheckingIn(true);
      const response = await attendanceService.checkIn({
        employeeId: user.employeeId,
        attendanceDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setIsCheckedIn(true);
      // Set check-in time from response or use current time
      if (response.checkInTime) {
        setCheckInTime(parseISO(response.checkInTime));
      } else {
        setCheckInTime(new Date());
      }
      refreshDashboard();
    } catch (error: unknown) {
      log.error('Check-in failed:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Check-in failed. Please try again.';
      toast.error('Attendance', message);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
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
      setLocalCheckOutTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      refreshDashboard();
    } catch (error: unknown) {
      log.error('Check-out failed:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Check-out failed. Please try again.';
      toast.error('Attendance', message);
    } finally {
      setCheckingIn(false);
    }
  };

  if (!hasHydrated || isLoading) {
    return (
      <AppLayout activeMenuItem="my-dashboard" breadcrumbs={[{ label: 'My Dashboard', href: '/me/dashboard' }]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Check if user is a SuperAdmin or admin (no employee profile needed for dashboard access)
  const isSuperAdminOrAdmin = user?.roles?.some(
    r => typeof r === 'string'
      ? (r === 'SUPER_ADMIN' || r === 'ADMIN')
      : (r?.code === 'SUPER_ADMIN' || r?.code === 'ADMIN')
  );

  // Non-admin users without employee profile → show fallback
  if (!dashboard && !isSuperAdminOrAdmin) {
    return (
      <AppLayout activeMenuItem="my-dashboard" breadcrumbs={[{ label: 'My Dashboard', href: '/me/dashboard' }]}>
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-4" />
          <h2 className="skeuo-emboss text-xl font-semibold text-[var(--text-primary)] mb-2">
            No Employee Profile Linked
          </h2>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            Your account is not linked to an employee profile. Please contact your HR administrator.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      activeMenuItem="my-dashboard"
      breadcrumbs={[{ label: 'My Dashboard', href: '/me/dashboard' }]}
    >
      {/* Two independent columns — bento grid with staggered animations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ─── Left Column (5/12) ─── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Welcome Banner — hero card, enters first */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <WelcomeBanner
              employeeName={dashboard?.employeeName || user?.fullName || 'Employee'}
              designation={dashboard?.designation || (isSuperAdminOrAdmin ? 'Super Admin' : undefined)}
              department={dashboard?.department || (isSuperAdminOrAdmin ? 'Administration' : undefined)}
            />
          </motion.div>

          {/* Quick Access — Pending actions & inbox */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <QuickAccessWidget
              pendingApprovals={dashboard?.pendingApprovals ?? 0}
              pendingTimesheets={dashboard?.pendingTimesheets ?? 0}
              pendingProfileUpdates={dashboard?.pendingProfileUpdates ?? 0}
              inboxCount={0}
            />
          </motion.div>

          {/* Time Clock — Live clock + Check-in/out (only for employees) */}
          {user?.employeeId && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.14, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <TimeClockWidget
                isCheckedIn={isCheckedIn}
                checkInTime={checkInTime}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                isLoading={checkingIn}
                isCompleted={localCompleted || (!isCheckedIn && !!dashboard?.todayCheckInTime && !!dashboard?.todayCheckOutTime)}
                checkOutTime={localCheckOutTime || (dashboard?.todayCheckOutTime ? new Date(dashboard.todayCheckOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null)}
                workDurationMinutes={null}
              />
            </motion.div>
          )}

          {/* Holiday Carousel — full-width gradient card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.20, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <HolidayCarousel />
          </motion.div>

          {/* On Leave Today */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <OnLeaveTodayCard />
          </motion.div>

          {/* Working Remotely */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <WorkingRemotelyCard />
          </motion.div>

          {/* Leave Balance — Circular progress ring (only for employees) */}
          {user?.employeeId && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <LeaveBalanceWidget
                leaveBalances={
                  dashboard?.leaveBalances
                    ? Object.entries(dashboard.leaveBalances).map(([name, available], idx) => {
                        const avail = available as number;
                        const total = avail + 2; // estimate; real API will provide totals
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
        </div>

        {/* ─── Right Column (7/12) ─── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Birthday Wishing Board — shows only on the user's birthday */}
          <BirthdayWishingBoard />

          {/* Post Composer — Post / Poll / Praise */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <PostComposer onPostCreated={() => setFeedRefreshKey((k) => k + 1)} />
          </motion.div>

          {/* Celebration Tabs — Birthdays / Anniversaries / New Joiners */}
          <motion.div
            data-section="celebrations"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.14, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <CelebrationTabs />
          </motion.div>

          {/* Unified Social Feed — Announcements, Recognitions, LinkedIn, Wall Posts */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <CompanyFeed employeeId={user?.employeeId} refreshKey={feedRefreshKey} />
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
