'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import { Loading } from '@/components/ui';
// Dashboard widget components
import { WelcomeBanner, QuickAccessWidget } from '@/components/dashboard/WelcomeBanner';
import { TimeClockWidget } from '@/components/dashboard/TimeClockWidget';
import { HolidayCarousel } from '@/components/dashboard/HolidayCarousel';
import { TeamPresenceWidget } from '@/components/dashboard/TeamPresenceWidget';
import { LeaveBalanceWidget } from '@/components/dashboard/LeaveBalanceWidget';
import { PostComposer } from '@/components/dashboard/PostComposer';
import { CelebrationTabs } from '@/components/dashboard/CelebrationTabs';
import { CompanyFeed } from '@/components/dashboard/CompanyFeed';
import { useAuth } from '@/lib/hooks/useAuth';
import { attendanceService } from '@/lib/services/attendance.service';
import { useSelfServiceDashboard } from '@/lib/hooks/queries';
import { SelfServiceDashboard } from '@/lib/types/selfservice';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('Dashboard');

export default function MyDashboardPage() {
  const { user, hasHydrated } = useAuth();
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [dashboard, setDashboard] = useState<SelfServiceDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);

  // Use React Query hook
  const { data: dashboardData, isLoading: queryLoading } = useSelfServiceDashboard(
    user?.employeeId || '',
    hasHydrated && !!user?.employeeId
  );

  useEffect(() => {
    if (!hasHydrated || !user) return;
    if (user?.employeeId) {
      // Dashboard data will be handled by React Query hook
      setIsLoading(queryLoading);
    } else {
      // SuperAdmin or user without employee profile — skip loading self-service data
      setIsLoading(false);
    }
  }, [hasHydrated, user, queryLoading]);

  // Update dashboard from query data
  useEffect(() => {
    if (dashboardData) {
      setDashboard(dashboardData);
      setIsLoading(false);
    }
  }, [dashboardData]);

  const loadDashboard = async () => {
    if (!user?.employeeId || !dashboardData) return;

    try {
      setIsLoading(true);
      setDashboard(dashboardData);

      // Always fetch today's attendance directly to get accurate check-in time
      // This is more reliable than depending on self-service dashboard data
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const attendance = await attendanceService.getAttendanceByDateRange(
          today,
          today
        );
        if (attendance && attendance.length > 0) {
          const todayRecord = attendance[0];
          // Check if there's an open session (checked in but not out)
          if (todayRecord.checkInTime && !todayRecord.checkOutTime) {
            setIsCheckedIn(true);
            const checkIn = parseISO(todayRecord.checkInTime);
            setCheckInTime(checkIn);
          } else if (todayRecord.checkOutTime) {
            // Already checked out for today
            setIsCheckedIn(false);
            setCheckInTime(null);
          } else {
            // No attendance record yet
            setIsCheckedIn(false);
            setCheckInTime(null);
          }
        } else {
          // No attendance record for today
          setIsCheckedIn(false);
          setCheckInTime(null);
        }
      } catch (err) {
        log.error('Failed to fetch today\'s attendance:', err);
        // Fallback to self-service dashboard data
        const checkedIn = dashboardData.todayAttendanceStatus === 'CHECKED_IN' || dashboardData.todayAttendanceStatus === 'PRESENT';
        setIsCheckedIn(checkedIn);
        if (checkedIn && dashboardData.todayCheckInTime && !dashboardData.todayCheckOutTime) {
          setCheckInTime(parseISO(dashboardData.todayCheckInTime));
        } else {
          setCheckInTime(null);
        }
      }
    } catch (error) {
      log.error('Failed to load dashboard:', error);
      // Set fallback data for demo
      setDashboard({
        employeeName: user?.fullName || 'Employee',
        employeeId: user?.employeeId || '',
        designation: 'Software Engineer',
        department: 'Engineering',
        reportingManager: 'Manager',
        dateOfJoining: '2023-01-15',
        profilePhotoUrl: undefined,
        leaveBalances: { 'Annual Leave': 15, 'Sick Leave': 10, 'Casual Leave': 5 },
        pendingLeaveRequests: 0,
        presentDaysThisMonth: 18,
        absentDaysThisMonth: 2,
        lateDaysThisMonth: 1,
        attendancePercentage: 90,
        todayAttendanceStatus: 'NOT_CHECKED_IN',
        pendingProfileUpdates: 0,
        pendingDocumentRequests: 0,
        pendingApprovals: 2,
        pendingTimesheets: 1,
        recentPayslips: [],
        upcomingEvents: [],
        recentAnnouncements: [],
        teamSize: 8,
        teamMembersOnLeave: 1,
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      loadDashboard();
    } catch (error) {
      log.error('Check-in failed:', error);
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
      setCheckInTime(null); // Clear the timer
      loadDashboard();
    } catch (error) {
      log.error('Check-out failed:', error);
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
              />
            </motion.div>
          )}

          {/* Holiday + Team Presence — side-by-side bento pair on large screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.20, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <HolidayCarousel />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <TeamPresenceWidget />
            </motion.div>
          </div>

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
                    ? Object.entries(dashboard.leaveBalances).map(([name, available], idx) => ({
                        leaveTypeId: String(idx),
                        leaveName: name,
                        available: available as number,
                        total: (available as number) + 2, // estimate; real API will provide totals
                        used: 2,
                      }))
                    : undefined
                }
              />
            </motion.div>
          )}
        </div>

        {/* ─── Right Column (7/12) ─── */}
        <div className="lg:col-span-7 space-y-6">
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
