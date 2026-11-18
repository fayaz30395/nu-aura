'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {ActionIcon, Button} from '@mantine/core';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {Segmented} from '@/components/ui/Segmented';
import {DetailPageSkeleton} from '@/components/ui/skeletons';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useActiveLeaveTypes, useEmployeeLeaveRequests, useLeaveRequestsByStatus} from '@/lib/hooks/queries/useLeaves';
import {LeaveRequest} from '@/lib/types/hrms/leave';
import {Stat} from '@/components/ui/Stat';
import {cn} from '@/lib/utils';
import {categoricalBgClass, categoricalSoftBgClass, categoricalTextClass} from '@/lib/utils/categoricalPalette';

const BREADCRUMBS = [{label: 'Leave', href: '/leave'}, {label: 'Calendar'}];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  leaves: LeaveRequest[];
}

function buildCalendar(currentDate: Date, leaves: LeaveRequest[]): CalendarDay[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startDate = new Date(year, month, 1);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({length: 42}, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return {
      date,
      isCurrentMonth: date.getMonth() === month,
      isToday: date.getTime() === today.getTime(),
      leaves: leaves.filter(leave => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        leaveStart.setHours(0, 0, 0, 0);
        leaveEnd.setHours(0, 0, 0, 0);
        return date >= leaveStart && date <= leaveEnd;
      }),
    };
  });
}

export default function LeaveCalendarPage() {
  const router = useRouter();
  const {user, hasHydrated} = useAuth();
  const {hasPermission, isPermissionReady: permReady} = usePermissions();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'team' | 'my'>('my');

  // Route config admits LEAVE_VIEW_TEAM/ALL too; this page additionally requires LEAVE_VIEW_SELF.
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.LEAVE_VIEW_SELF)) {
      router.replace('/me/dashboard?denied=1');
    }
  }, [permReady, hasPermission, router]);

  const employeeRequestsQuery = useEmployeeLeaveRequests(user?.employeeId || '', 0, 100, Boolean(hasHydrated && user?.employeeId && viewMode === 'my'));
  const approvedRequestsQuery = useLeaveRequestsByStatus('APPROVED', 0, 100, viewMode === 'team' && (hasPermission(Permissions.LEAVE_VIEW_ALL) || hasPermission(Permissions.LEAVE_VIEW_TEAM)));
  const {data: leaveTypes = []} = useActiveLeaveTypes();
  const activeQuery = viewMode === 'my' ? employeeRequestsQuery : approvedRequestsQuery;
  const leaves = useMemo(() => activeQuery.data?.content ?? [], [activeQuery.data]);

  useEffect(() => {
    if (hasHydrated && !user?.employeeId && viewMode === 'my') {
      setViewMode('team');
    }
  }, [hasHydrated, user?.employeeId, viewMode]);

  const calendarDays = useMemo(() => buildCalendar(currentDate, leaves), [currentDate, leaves]);

  const shiftMonth = (delta: number) =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta));

  return (
    <AppLayout activeMenuItem="leave">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Leave Calendar"
          description="See approved and pending time off by month."
          breadcrumbs={BREADCRUMBS}
          actions={
            <>
              <Button variant="default" onClick={() => router.push('/leave/my-leaves')}>My leave history</Button>
              <Button onClick={() => router.push('/leave/apply')}>Apply for Leave</Button>
            </>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <ActionIcon variant="default" size={36} aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={16} aria-hidden="true"/>
            </ActionIcon>
            <h2 className="min-w-40 text-center text-lg font-semibold text-text-1" aria-live="polite">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <ActionIcon variant="default" size={36} aria-label="Next month" onClick={() => shiftMonth(1)}>
              <ChevronRight size={16} aria-hidden="true"/>
            </ActionIcon>
            <Button variant="subtle" onClick={() => setCurrentDate(new Date())}>Today</Button>
          </div>
          <Segmented
            aria-label="Calendar scope"
            value={viewMode}
            onChange={(v) => setViewMode(v === 'team' ? 'team' : 'my')}
            options={[
              {value: 'my', label: 'My Leaves'},
              ...(hasPermission(Permissions.LEAVE_VIEW_ALL) || hasPermission(Permissions.LEAVE_VIEW_TEAM)
                ? [{value: 'team', label: 'Team Leaves'}]
                : []),
            ]}
          />
        </div>

        {leaveTypes.length > 0 && (
          <ul className="flex flex-wrap gap-4" aria-label="Leave type legend">
            {leaveTypes.map(type => (
              <li key={type.id} className="flex items-center gap-2 text-xs text-text-2">
                <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', categoricalBgClass(type.colorCode))}/>
                {type.leaveName}
              </li>
            ))}
          </ul>
        )}

        <QueryState
          query={activeQuery}
          skeleton={<DetailPageSkeleton showHeader={false} showSidePanel={false} sections={1}/>}
          errorTitle="Couldn't load leave data"
        >
          {() => (
            <div className="overflow-x-auto rounded-lg border border-border bg-card p-4">
              <div className="grid min-w-160 grid-cols-7 gap-1">
                {WEEK_DAYS.map(day => (
                  <div key={day} className="py-2 text-center text-xs font-semibold text-text-2">{day}</div>
                ))}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      'min-h-24 rounded-md border p-2',
                      day.isToday
                        ? 'border-accent bg-accent-subtle'
                        : day.isCurrentMonth
                          ? 'border-border bg-card'
                          : 'border-border-subtle bg-surface-aura-sunken',
                    )}
                  >
                    <div
                      className={cn(
                        'mb-1 text-sm font-medium tabular-nums',
                        day.isToday ? 'text-accent' : day.isCurrentMonth ? 'text-text-1' : 'text-text-3',
                      )}
                      aria-current={day.isToday ? 'date' : undefined}
                    >
                      {day.date.getDate()}
                    </div>
                    {day.leaves.map((leave, idx) => {
                      const leaveType = leaveTypes.find(t => t.id === leave.leaveTypeId);
                      return (
                        <div
                          key={idx}
                          className={cn('mb-1 truncate rounded-sm px-1 py-0.5 text-xs', categoricalSoftBgClass(leaveType?.colorCode), categoricalTextClass(leaveType?.colorCode))}
                          title={`${leaveType?.leaveName} - ${leave.reason || 'No reason'}`}
                        >
                          {viewMode === 'team' ? 'Team Member' : leaveType?.leaveName}
                          {leave.isHalfDay && <span className="ml-1">(½)</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </QueryState>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <Stat
              label="Total Leaves This Month"
              value={leaves.filter(l => {
                const leaveStart = new Date(l.startDate);
                return leaveStart.getMonth() === currentDate.getMonth() &&
                  leaveStart.getFullYear() === currentDate.getFullYear();
              }).length}
              tone="accent"
            />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <Stat label="Pending Approvals" value={leaves.filter(l => l.status === 'PENDING').length} tone="warning"/>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <Stat label="Upcoming Leaves" value={leaves.filter(l => new Date(l.startDate) > new Date()).length} tone="accent"/>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
