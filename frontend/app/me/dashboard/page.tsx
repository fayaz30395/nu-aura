'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInSeconds, parseISO } from 'date-fns';
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
import { CompanySpotlight } from '@/components/dashboard/CompanySpotlight';
import { PostComposer } from '@/components/dashboard/PostComposer';
import { CelebrationTabs } from '@/components/dashboard/CelebrationTabs';
import { CompanyFeed } from '@/components/dashboard/CompanyFeed';
import { useAuth } from '@/lib/hooks/useAuth';
import { selfServiceService } from '@/lib/services/selfservice.service';
import { attendanceService } from '@/lib/services/attendance.service';
import { SelfServiceDashboard } from '@/lib/types/selfservice';

// Helper function to format elapsed time
function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

export default function MyDashboardPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuth();
  const [dashboard, setDashboard] = useState<SelfServiceDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (hasHydrated && !user) {
      router.push('/auth/login');
    }
  }, [hasHydrated, user, router]);

  useEffect(() => {
    if (!hasHydrated || !user) return;
    if (user?.employeeId) {
      loadDashboard();
    } else {
      // SuperAdmin or user without employee profile — skip loading self-service data
      setIsLoading(false);
    }
  }, [hasHydrated, user?.employeeId]);

  // Real-time timer effect
  useEffect(() => {
    if (checkInTime && isCheckedIn) {
      // Calculate initial elapsed time
      const updateElapsed = () => {
        const now = new Date();
        const elapsed = differenceInSeconds(now, checkInTime);
        setElapsedSeconds(Math.max(0, elapsed));
      };

      // Update immediately
      updateElapsed();

      // Update every second
      timerRef.current = setInterval(updateElapsed, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      setElapsedSeconds(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [checkInTime, isCheckedIn]);

  const loadDashboard = async () => {
    if (!user?.employeeId) return;

    try {
      setIsLoading(true);
      const data = await selfServiceService.getDashboard(user.employeeId);
      setDashboard(data);

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
        console.error('Failed to fetch today\'s attendance:', err);
        // Fallback to self-service dashboard data
        const checkedIn = data.todayAttendanceStatus === 'CHECKED_IN' || data.todayAttendanceStatus === 'PRESENT';
        setIsCheckedIn(checkedIn);
        if (checkedIn && data.todayCheckInTime && !data.todayCheckOutTime) {
          setCheckInTime(parseISO(data.todayCheckInTime));
        } else {
          setCheckInTime(null);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
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
      console.error('Check-in failed:', error);
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
      console.error('Check-out failed:', error);
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

  if (!dashboard) {
    return (
      <AppLayout activeMenuItem="my-dashboard" breadcrumbs={[{ label: 'My Dashboard', href: '/me/dashboard' }]}>
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto text-surface-300 dark:text-surface-600 mb-4" />
          <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50 mb-2">
            No Employee Profile Linked
          </h2>
          <p className="text-surface-500 dark:text-surface-400 max-w-md mx-auto">
            {user?.roles?.some(r => typeof r === 'string' ? r === 'SUPER_ADMIN' : r?.code === 'SUPER_ADMIN')
              ? 'You are signed in as a Super Admin. Self-service features require an employee profile. Use the admin panels to manage employees.'
              : 'Your account is not linked to an employee profile. Please contact your HR administrator.'}
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go to Admin Dashboard
            </button>
            <button
              onClick={() => router.push('/employees')}
              className="px-4 py-2 border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              Manage Employees
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      activeMenuItem="my-dashboard"
      breadcrumbs={[{ label: 'My Dashboard', href: '/me/dashboard' }]}
    >
      <div className="space-y-4">

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <WelcomeBanner
            employeeName={dashboard.employeeName || user?.fullName || 'Employee'}
            designation={dashboard.designation}
            department={dashboard.department}
          />
        </motion.div>

        {/* Main Layout — Left Utility Sidebar + Right Social Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Left Sidebar (5/12) */}
          <motion.div
            className="lg:col-span-5 space-y-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            {/* Quick Access — Pending actions & inbox */}
            <QuickAccessWidget
              pendingApprovals={dashboard.pendingApprovals ?? 0}
              pendingTimesheets={dashboard.pendingTimesheets ?? 0}
              pendingProfileUpdates={dashboard.pendingProfileUpdates ?? 0}
              inboxCount={0}
            />

            {/* Time Clock — Live clock + Check-in/out */}
            <TimeClockWidget
              isCheckedIn={isCheckedIn}
              checkInTime={checkInTime}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              isLoading={checkingIn}
            />

            {/* Holiday Carousel — Upcoming holidays */}
            <HolidayCarousel />

            {/* Team Presence — On leave + Remote workers */}
            <TeamPresenceWidget />

            {/* Leave Balance — Circular progress ring */}
            <LeaveBalanceWidget
              leaveBalances={
                dashboard.leaveBalances
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

          {/* Right Main Content (7/12) */}
          <motion.div
            className="lg:col-span-7 space-y-4"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            {/* Company Spotlight Carousel */}
            <CompanySpotlight />

            {/* Post Composer — Post / Poll / Praise */}
            <PostComposer />

            {/* Celebration Tabs — Birthdays / Anniversaries / New Joiners */}
            <CelebrationTabs />

            {/* Unified Social Feed — Announcements, Recognitions, LinkedIn */}
            <CompanyFeed employeeId={user?.employeeId} />
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
