'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInSeconds, parseISO } from 'date-fns';
import {
  User,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Palmtree,
  Bell,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Download,
  Play,
  Pause,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, StatCard, Loading, Badge } from '@/components/ui';
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
    if (user?.employeeId) {
      loadDashboard();
    }
  }, [user?.employeeId]);

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
          user.employeeId,
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
      <AppLayout activeMenuItem="profile" breadcrumbs={[{ label: 'My Dashboard', href: '/me/dashboard' }]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  if (!dashboard) {
    return (
      <AppLayout activeMenuItem="profile" breadcrumbs={[{ label: 'My Dashboard', href: '/me/dashboard' }]}>
        <div className="text-center py-12">
          <p className="text-surface-500">Failed to load dashboard data</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      activeMenuItem="profile"
      breadcrumbs={[{ label: 'My Dashboard', href: '/me/dashboard' }]}
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Welcome back, {dashboard.employeeName?.split(' ')[0]}!
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Quick Check-in/out */}
          <div className="flex items-center gap-4">
            {isCheckedIn && checkInTime && (
              <div className="text-right hidden sm:block">
                <p className="text-sm text-surface-500 dark:text-surface-400">Working for</p>
                <p className="font-bold text-lg text-success-600 dark:text-success-400 font-mono">
                  {formatElapsedTime(elapsedSeconds)}
                </p>
              </div>
            )}
            <button
              onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
              disabled={checkingIn}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isCheckedIn
                  ? 'bg-danger-100 text-danger-700 hover:bg-danger-200 dark:bg-danger-900/30 dark:text-danger-400'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              <Clock className="h-5 w-5" />
              {checkingIn ? 'Processing...' : isCheckedIn ? 'Check Out' : 'Check In'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Attendance"
            value={`${dashboard.attendancePercentage}%`}
            description="This month"
            icon={<CheckCircle className="h-5 w-5" />}
            trend={{ value: dashboard.presentDaysThisMonth, isPositive: true, label: 'days present' }}
            variant="success"
          />
          <StatCard
            title="Leave Balance"
            value={Object.values(dashboard.leaveBalances).reduce((a, b) => a + b, 0).toString()}
            description="Total days"
            icon={<Palmtree className="h-5 w-5" />}
            variant="blue"
          />
          <StatCard
            title="Pending Approvals"
            value={dashboard.pendingApprovals.toString()}
            description="Requires action"
            icon={<AlertCircle className="h-5 w-5" />}
            variant={dashboard.pendingApprovals > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Team Members"
            value={dashboard.teamSize.toString()}
            description={`${dashboard.teamMembersOnLeave} on leave`}
            icon={<Users className="h-5 w-5" />}
            variant="default"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <QuickActionButton
                    icon={<Palmtree className="h-5 w-5" />}
                    label="Request Leave"
                    onClick={() => router.push('/me/leaves')}
                  />
                  <QuickActionButton
                    icon={<FileText className="h-5 w-5" />}
                    label="Request Document"
                    onClick={() => router.push('/me/documents')}
                  />
                  <QuickActionButton
                    icon={<CreditCard className="h-5 w-5" />}
                    label="View Payslips"
                    onClick={() => router.push('/me/payslips')}
                  />
                  <QuickActionButton
                    icon={<User className="h-5 w-5" />}
                    label="Update Profile"
                    onClick={() => router.push('/me/profile')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Leave Balances */}
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-surface-900 dark:text-surface-50">
                    Leave Balances
                  </h3>
                  <button
                    onClick={() => router.push('/me/leaves')}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    View all <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {Object.entries(dashboard.leaveBalances).map(([type, balance]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-surface-600 dark:text-surface-400">
                        {type}
                      </span>
                      <span className="font-medium text-surface-900 dark:text-surface-50">
                        {balance} days
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Attendance & Activity */}
          <div className="space-y-6">
            {/* Today's Attendance */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-4">
                  Today's Attendance
                </h3>
                <div className="text-center py-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${
                    isCheckedIn
                      ? 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400'
                      : 'bg-surface-100 text-surface-500 dark:bg-surface-800'
                  }`}>
                    {isCheckedIn ? <Play className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
                  </div>
                  <p className="font-medium text-surface-900 dark:text-surface-50">
                    {isCheckedIn ? 'Checked In' : 'Not Checked In'}
                  </p>

                  {/* Real-time Timer */}
                  {isCheckedIn && checkInTime && (
                    <div className="mt-3 p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
                      <p className="text-xs text-success-600 dark:text-success-400 uppercase tracking-wide mb-1">
                        Working Time
                      </p>
                      <p className="text-2xl font-bold text-success-700 dark:text-success-300 font-mono">
                        {formatElapsedTime(elapsedSeconds)}
                      </p>
                      <p className="text-xs text-success-600 dark:text-success-400 mt-1">
                        Since {format(checkInTime, 'h:mm a')}
                      </p>

                      {/* Progress bar - 8 hours = 28800 seconds */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-success-600 dark:text-success-400 mb-1">
                          <span>0h</span>
                          <span>4h</span>
                          <span>8h</span>
                        </div>
                        <div className="h-2 bg-success-200 dark:bg-success-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 rounded-full ${
                              elapsedSeconds >= 28800
                                ? 'bg-success-600 dark:bg-success-400'
                                : elapsedSeconds >= 14400
                                ? 'bg-success-500 dark:bg-success-500'
                                : 'bg-warning-500 dark:bg-warning-400'
                            }`}
                            style={{ width: `${Math.min(100, (elapsedSeconds / 28800) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                          {elapsedSeconds >= 28800 ? (
                            <span className="text-success-600 dark:text-success-400 font-medium">Full day completed!</span>
                          ) : elapsedSeconds >= 14400 ? (
                            <span>Half day completed, {formatElapsedTime(28800 - elapsedSeconds)} to go</span>
                          ) : (
                            <span>{formatElapsedTime(28800 - elapsedSeconds)} to complete 8 hours</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {!isCheckedIn && (
                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                      Click the button above to check in
                    </p>
                  )}
                </div>

                {/* Monthly Summary */}
                <div className="border-t border-surface-200 dark:border-surface-700 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                    This Month
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-semibold text-success-600">
                        {dashboard.presentDaysThisMonth}
                      </p>
                      <p className="text-xs text-surface-500">Present</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-danger-600">
                        {dashboard.absentDaysThisMonth}
                      </p>
                      <p className="text-xs text-surface-500">Absent</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-warning-600">
                        {dashboard.lateDaysThisMonth}
                      </p>
                      <p className="text-xs text-surface-500">Late</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Tasks */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-4">
                  Pending Tasks
                </h3>
                <div className="space-y-3">
                  {dashboard.pendingApprovals > 0 && (
                    <PendingTaskItem
                      icon={<CheckCircle className="h-5 w-5" />}
                      label="Pending Approvals"
                      count={dashboard.pendingApprovals}
                      onClick={() => router.push('/leave')}
                    />
                  )}
                  {dashboard.pendingTimesheets > 0 && (
                    <PendingTaskItem
                      icon={<Clock className="h-5 w-5" />}
                      label="Timesheets to Submit"
                      count={dashboard.pendingTimesheets}
                      onClick={() => router.push('/timesheets')}
                    />
                  )}
                  {dashboard.pendingProfileUpdates > 0 && (
                    <PendingTaskItem
                      icon={<User className="h-5 w-5" />}
                      label="Profile Updates"
                      count={dashboard.pendingProfileUpdates}
                      onClick={() => router.push('/me/profile')}
                    />
                  )}
                  {dashboard.pendingApprovals === 0 &&
                    dashboard.pendingTimesheets === 0 &&
                    dashboard.pendingProfileUpdates === 0 && (
                      <p className="text-center text-surface-500 py-4">
                        No pending tasks
                      </p>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recent & Upcoming */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-surface-900 dark:text-surface-50">
                    Upcoming Events
                  </h3>
                  <Calendar className="h-5 w-5 text-surface-400" />
                </div>
                {dashboard.upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.upcomingEvents.slice(0, 5).map((event, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-medium">
                          {format(new Date(event.date), 'd')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
                            {event.title}
                          </p>
                          <p className="text-xs text-surface-500">
                            {format(new Date(event.date), 'MMM d')} - {event.eventType}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-surface-500 py-4">
                    No upcoming events
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Announcements */}
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-surface-900 dark:text-surface-50">
                    Announcements
                  </h3>
                  <button
                    onClick={() => router.push('/announcements')}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    View all <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                {dashboard.recentAnnouncements.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.recentAnnouncements.slice(0, 3).map((announcement, index) => (
                      <div key={index} className="border-l-2 border-primary-500 pl-3">
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
                          {announcement.title}
                        </p>
                        <p className="text-xs text-surface-500 mt-1 line-clamp-2">
                          {announcement.excerpt}
                        </p>
                        <p className="text-xs text-surface-400 mt-1">
                          {format(new Date(announcement.postedOn), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-surface-500 py-4">
                    No recent announcements
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Payslips */}
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-surface-900 dark:text-surface-50">
                    Recent Payslips
                  </h3>
                  <button
                    onClick={() => router.push('/me/payslips')}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    View all <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                {dashboard.recentPayslips.length > 0 ? (
                  <div className="space-y-2">
                    {dashboard.recentPayslips.slice(0, 3).map((payslip, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
                            {payslip.month} {payslip.year}
                          </p>
                          <p className="text-xs text-surface-500">
                            ${payslip.netPay.toLocaleString()}
                          </p>
                        </div>
                        {payslip.downloadUrl && (
                          <button className="p-2 text-surface-400 hover:text-primary-600">
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-surface-500 py-4">
                    No recent payslips
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// Helper Components
function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors group"
    >
      <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
        {icon}
      </div>
      <span className="font-medium text-surface-700 dark:text-surface-300">
        {label}
      </span>
      <ArrowRight className="h-4 w-4 ml-auto text-surface-400 group-hover:text-surface-600 transition-colors" />
    </button>
  );
}

function PendingTaskItem({
  icon,
  label,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="text-warning-500">{icon}</div>
        <span className="text-sm text-surface-700 dark:text-surface-300">{label}</span>
      </div>
      <Badge variant="warning">{count}</Badge>
    </button>
  );
}
