'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertCircle} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useActiveLeaveTypes, useEmployeeLeaveRequests, useLeaveRequestsByStatus} from '@/lib/hooks/queries/useLeaves';
import {LeaveRequest} from '@/lib/types/hrms/leave';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  leaves: LeaveRequest[];
  holiday?: Holiday;
}

export default function LeaveCalendarPage() {
  const router = useRouter();
  const {user, hasHydrated} = useAuth();
  const {hasPermission, isReady: permReady} = usePermissions();
  const [currentDate, setCurrentDate] = useState(new Date());

  // A3: Permission gate — redirect if user lacks LEAVE:VIEW_SELF
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.LEAVE_VIEW_SELF)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [viewMode, setViewMode] = useState<'team' | 'my'>('my');

  // Determine which query to use based on viewMode
  const employeeRequestsQuery = useEmployeeLeaveRequests(user?.employeeId || '', 0, 100, Boolean(hasHydrated && user?.employeeId && viewMode === 'my'));
  const approvedRequestsQuery = useLeaveRequestsByStatus('APPROVED', 0, 100);
  const {data: leaveTypes = []} = useActiveLeaveTypes();

  const leaves = (viewMode === 'my' ? employeeRequestsQuery.data?.content : approvedRequestsQuery.data?.content) ?? [];
  const isAnyError = employeeRequestsQuery.isError || approvedRequestsQuery.isError;
  const isAnyFetching = employeeRequestsQuery.fetchStatus === 'fetching' || approvedRequestsQuery.fetchStatus === 'fetching';
  const loading = !isAnyError && isAnyFetching && !employeeRequestsQuery.data && !approvedRequestsQuery.data;

  // Switch to team view if user has no employeeId
  useEffect(() => {
    if (hasHydrated && !user?.employeeId && viewMode === 'my') {
      setViewMode('team');
    }
  }, [hasHydrated, user?.employeeId, viewMode]);

  // Generate calendar when data, view mode, or month changes.
  // Always generate — even with zero leaves the grid of day cells must render.
  useEffect(() => {
    generateCalendar();
    // generateCalendar is defined below and only depends on currentDate/viewMode/leaves
    // (all listed). Including it without useCallback would cause an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode, leaves]);

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const _lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();

      const dayLeaves = leaves.filter(leave => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        leaveStart.setHours(0, 0, 0, 0);
        leaveEnd.setHours(0, 0, 0, 0);
        return date >= leaveStart && date <= leaveEnd;
      });

      days.push({
        date,
        isCurrentMonth,
        isToday,
        leaves: dayLeaves,
      });
    }

    setCalendarDays(days);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const _getLeaveTypeColor = (leaveTypeId: string) => {
    const leaveType = leaveTypes.find(t => t.id === leaveTypeId);
    return leaveType?.colorCode || '#3B82F6';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <AppLayout activeMenuItem="leave">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 flex items-center gap-2"
          >
            ← Back
          </button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-bold skeuo-emboss">Leave Calendar</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('my')}
              className={`px-4 py-2 rounded-lg font-medium ${
                viewMode === 'my'
                  ? 'bg-accent-500 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50'
              }`}
            >
              My Leaves
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`px-4 py-2 rounded-lg font-medium ${
                viewMode === 'team'
                  ? 'bg-accent-500 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50'
              }`}
            >
              Team Leaves
            </button>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="skeuo-card bg-[var(--bg-card)] rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={goToToday}
                className="px-4 py-1 text-sm bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 rounded-lg text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Today
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={previousMonth}
                className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 rounded-lg font-medium text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                ← Previous
              </button>
              <button
                onClick={nextMonth}
                className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 rounded-lg font-medium text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="skeuo-card bg-[var(--bg-card)] rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="text-body-secondary font-medium">Legend:</div>
            {leaveTypes.map(type => (
              <div key={type.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{backgroundColor: type.colorCode}}
                />
                <span className="text-sm text-[var(--text-primary)]">{type.leaveName}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-danger-500"/>
              <span className="text-sm text-[var(--text-primary)]">Holiday</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="skeuo-card bg-[var(--bg-card)] rounded-lg overflow-hidden">
          {isAnyError ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <AlertCircle className="w-8 h-8 text-danger-500"/>
                <span className="text-[var(--text-secondary)]">Failed to load leave data. The server may be unreachable.</span>
                <button
                  onClick={() => window.location.reload()}
                  className="skeuo-button px-4 py-2 text-sm cursor-pointer active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center py-12 text-[var(--text-primary)]">Loading calendar...</div>
          ) : (
            <div className="p-4">
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map(day => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-[var(--text-secondary)] py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-24 border rounded-lg p-2 ${
                      day.isToday
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/30'
                        : day.isCurrentMonth
                          ? 'border-[var(--border-main)] bg-[var(--bg-card)]'
                          : 'border-[var(--border-main)] bg-[var(--bg-secondary)]/50'
                    } ${day.holiday ? 'bg-danger-50 dark:bg-danger-900/20' : ''}`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        day.isToday
                          ? 'text-accent-700 dark:text-accent-400'
                          : day.isCurrentMonth
                            ? 'text-[var(--text-primary)]'
                            : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {day.date.getDate()}
                    </div>

                    {day.holiday && (
                      <div className="text-xs text-danger-600 dark:text-danger-400 font-medium mb-1">
                        Holiday
                      </div>
                    )}

                    {day.leaves.map((leave, idx) => {
                      const leaveType = leaveTypes.find(t => t.id === leave.leaveTypeId);
                      return (
                        <div
                          key={idx}
                          className="text-xs p-1 rounded mb-1 truncate cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: leaveType?.colorCode + '20',
                            borderLeft: `3px solid ${leaveType?.colorCode}`,
                          }}
                          title={`${leaveType?.leaveName} - ${leave.reason || 'No reason'}`}
                        >
                          {viewMode === 'team' ? (
                            <span>Team Member</span>
                          ) : (
                            leaveType?.leaveName
                          )}
                          {leave.isHalfDay && (
                            <span className="ml-1">(½)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="skeuo-card bg-[var(--bg-card)] rounded-lg p-6">
            <div className="text-body-secondary mb-1">Total Leaves This Month</div>
            <div className="text-3xl font-bold text-accent-700 dark:text-accent-400">
              {leaves.filter(l => {
                const leaveStart = new Date(l.startDate);
                return leaveStart.getMonth() === currentDate.getMonth() &&
                  leaveStart.getFullYear() === currentDate.getFullYear();
              }).length}
            </div>
          </div>
          <div className="skeuo-card bg-[var(--bg-card)] rounded-lg p-6">
            <div className="text-body-secondary mb-1">Pending Approvals</div>
            <div className="text-3xl font-bold text-warning-600 dark:text-warning-500">
              {leaves.filter(l => l.status === 'PENDING').length}
            </div>
          </div>
          <div className="skeuo-card bg-[var(--bg-card)] rounded-lg p-6">
            <div className="text-body-secondary mb-1">Upcoming Leaves</div>
            <div className="text-3xl font-bold text-accent-600 dark:text-accent-500">
              {leaves.filter(l => new Date(l.startDate) > new Date()).length}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <button
            onClick={() => router.push('/leave/apply')}
            className="bg-[var(--bg-card)] rounded-lg shadow-[var(--shadow-elevated)] p-6 hover:shadow-[var(--shadow-dropdown)] transition-shadow text-left"
          >
            <div className="text-accent-700 dark:text-accent-400 mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">Apply for Leave</h3>
            <p className="text-[var(--text-secondary)] text-sm">Submit a new leave request</p>
          </button>

          <button
            onClick={() => router.push('/leave/my-leaves')}
            className="bg-[var(--bg-card)] rounded-lg shadow-[var(--shadow-elevated)] p-6 hover:shadow-[var(--shadow-dropdown)] transition-shadow text-left"
          >
            <div className="text-success-600 dark:text-success-500 mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">My Leave History</h3>
            <p className="text-[var(--text-secondary)] text-sm">View all your leave requests</p>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
