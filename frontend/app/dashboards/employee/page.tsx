'use client';

import React from 'react';
import {useRouter} from 'next/navigation';
import {
  AlertCircle,
  Award,
  Briefcase,
  Calendar,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Gift,
  GraduationCap,
  Palmtree,
  Target,
  Users,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';
import {useEmployeeDashboard} from '@/lib/hooks/queries';
import {ChartLoadingFallback} from '@/lib/utils/lazy-components';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

const EmployeeAttendanceChart = dynamic(
  () => import('./EmployeeAttendanceChart'),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const {hasPermission, isReady: permReady} = usePermissions();
  const {data, isLoading: loading, error, refetch} = useEmployeeDashboard();

  // A3: Permission gate — redirect if user lacks DASHBOARD:EMPLOYEE
  React.useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.DASHBOARD_EMPLOYEE)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-success-100 dark:bg-success-950/30 text-success-800 dark:text-success-400';
      case 'ABSENT':
        return 'bg-danger-100 dark:bg-danger-950/30 text-danger-800 dark:text-danger-400';
      case 'LATE':
        return 'bg-warning-100 dark:bg-warning-950/30 text-warning-800 dark:text-warning-400';
      case 'LEAVE':
      case 'ON_LEAVE':
        return 'bg-accent-100 dark:bg-accent-950/30 text-accent-800 dark:text-accent-400';
      case 'WEEKLY_OFF':
        return 'bg-accent-300 dark:bg-accent-900/30 text-accent-900 dark:text-accent-600';
      case 'HOLIDAY':
        return 'bg-accent-300 dark:bg-accent-950/30 text-accent-900 dark:text-accent-600';
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'HOLIDAY':
        return <Calendar className="h-4 w-4"/>;
      case 'BIRTHDAY':
        return <Gift className="h-4 w-4"/>;
      case 'ANNIVERSARY':
        return <Award className="h-4 w-4"/>;
      case 'MEETING':
        return <Users className="h-4 w-4"/>;
      case 'TRAINING':
        return <GraduationCap className="h-4 w-4"/>;
      default:
        return <CalendarDays className="h-4 w-4"/>;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'HOLIDAY':
        return 'bg-accent-50 dark:bg-accent-950/30 text-accent-600 dark:text-accent-400';
      case 'BIRTHDAY':
        return 'bg-accent-250 dark:bg-accent-950/30 text-accent-800 dark:text-accent-600';
      case 'ANNIVERSARY':
        return 'bg-accent-250 dark:bg-accent-900/30 text-accent-800 dark:text-accent-600';
      case 'MEETING':
        return 'bg-warning-50 dark:bg-warning-950/30 text-warning-600 dark:text-warning-400';
      case 'TRAINING':
        return 'bg-success-50 dark:bg-success-950/30 text-success-600 dark:text-success-400';
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <AppLayout activeMenuItem="dashboard" showBreadcrumbs={false}>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2"/>
            <Skeleton className="h-4 w-48"/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-12 w-full"/>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full"/>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full"/>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout activeMenuItem="dashboard" showBreadcrumbs={false}>
        <div className="space-y-6">
          <div
            className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <AlertCircle className="h-5 w-5 text-[var(--status-warning-text)] flex-shrink-0"/>
            <p className="text-sm text-[var(--text-secondary)] flex-1">
              Dashboard data is temporarily unavailable. Some metrics may not be displayed.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">My Dashboard</h1>
            <p className="text-[var(--text-muted)] mt-1">Employee overview</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Present Days', 'Leaves Taken', 'Leaves Available', 'Avg Work Hours'].map((label) => (
              <Card key={label}>
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">--</p>
                  <p className="text-caption mt-1">No data</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="dashboard" showBreadcrumbs={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Welcome, {data.employeeName}!
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              {data.designation && `${data.designation}`}
              {data.department && ` • ${data.department}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/me/attendance')}
              leftIcon={<Clock className="h-4 w-4"/>}
            >
              Mark Attendance
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push('/leave/apply')}
              leftIcon={<Palmtree className="h-4 w-4"/>}
            >
              Apply Leave
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)]">
                    Present Days
                  </p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {data.attendanceSummary.currentMonth.present}
                  </p>
                  <p className='text-xs text-status-success-text mt-1'>
                    {data.attendanceSummary.currentMonth.attendancePercentage}% attendance
                  </p>
                </div>
                <div
                  className='w-12 h-12 rounded-xl bg-status-success-bg flex items-center justify-center'>
                  <CheckCircle className='h-6 w-6 text-status-success-text'/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)]">
                    Leaves Taken
                  </p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {data.stats.totalLeavesTaken}
                  </p>
                  <p className="text-caption mt-1">This year</p>
                </div>
                <div
                  className='w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center'>
                  <Palmtree className='h-6 w-6 text-accent'/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)]">
                    Leaves Available
                  </p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {data.stats.totalLeavesRemaining}
                  </p>
                  <p className="text-caption mt-1">Remaining</p>
                </div>
                <div
                  className='w-12 h-12 rounded-xl bg-status-warning-bg flex items-center justify-center'>
                  <Calendar className='h-6 w-6 text-status-warning-text'/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)]">
                    Avg Work Hours
                  </p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {data.attendanceSummary.currentMonth.averageWorkHours.toFixed(1)}
                  </p>
                  <p className="text-caption mt-1">Per day</p>
                </div>
                <div
                  className='w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center'>
                  <Clock className='h-6 w-6 text-accent'/>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Wider */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attendance Trend Chart */}
            <Card>
              <CardHeader>
                <div className="row-between">
                  <div>
                    <CardTitle>Attendance Trend</CardTitle>
                    <CardDescription>Last 7 days attendance pattern</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/me/attendance')}
                    rightIcon={<ChevronRight className="h-4 w-4"/>}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.attendanceSummary.weeklyTrend.length > 0 ? (
                  <EmployeeAttendanceChart weeklyTrend={data.attendanceSummary.weeklyTrend}/>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center text-[var(--text-muted)]">
                      <Clock className="h-12 w-12 mx-auto mb-4"/>
                      <p className="text-sm font-medium">No attendance data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Attendance History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
                <CardDescription>Your attendance history this month</CardDescription>
              </CardHeader>
              <CardContent>
                {data.attendanceSummary.recentHistory.length > 0 ? (
                  <div className="space-y-4">
                    {data.attendanceSummary.recentHistory.slice(0, 5).map((record, idx) => (
                      <div
                        key={idx}
                        className="row-between p-4 bg-[var(--bg-secondary)] rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-lg bg-[var(--bg-card)] flex items-center justify-center shadow-[var(--shadow-card)]">
                            <span className="text-sm font-semibold text-[var(--text-primary)]">
                              {new Date(record.date).getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {formatDate(record.date)}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {record.checkInTime && (
                                <span className="text-caption">
                                  In: {formatTime(record.checkInTime)}
                                </span>
                              )}
                              {record.checkOutTime && (
                                <span className="text-caption">
                                  • Out: {formatTime(record.checkOutTime)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.totalWorkHours && (
                            <span className="text-sm font-medium text-[var(--text-secondary)]">
                              {record.totalWorkHours.toFixed(1)}h
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}
                          >
                            {record.status ? record.status.replace('_', ' ') : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--text-muted)]">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4"/>
                    <p className="text-sm">No attendance records found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Career Progress */}
            <Card>
              <CardHeader>
                <div className="row-between">
                  <div>
                    <CardTitle>Career Progress</CardTitle>
                    <CardDescription>Goals, reviews, and training</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/performance')}
                    rightIcon={<ChevronRight className="h-4 w-4"/>}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className='text-center p-4 bg-accent-subtle rounded-xl'>
                    <Target className='h-8 w-8 text-accent mx-auto'/>
                    <p className="text-xl font-bold text-[var(--text-primary)] mt-2">
                      {data.careerProgress.currentGoals.length}
                    </p>
                    <p className="text-caption mt-1">
                      Active Goals
                    </p>
                  </div>
                  <div className='text-center p-4 bg-status-success-bg rounded-xl'>
                    <Award className='h-8 w-8 text-status-success-text mx-auto'/>
                    <p className="text-xl font-bold text-[var(--text-primary)] mt-2">
                      {data.careerProgress.recentReviews.length}
                    </p>
                    <p className="text-caption mt-1">
                      Reviews
                    </p>
                  </div>
                  <div className='text-center p-4 bg-accent-subtle rounded-xl'>
                    <GraduationCap className='h-8 w-8 text-accent mx-auto'/>
                    <p className="text-xl font-bold text-[var(--text-primary)] mt-2">
                      {data.careerProgress.completedTrainings}
                    </p>
                    <p className="text-caption mt-1">
                      Completed
                    </p>
                  </div>
                  <div className='text-center p-4 bg-status-warning-bg rounded-xl'>
                    <Briefcase className='h-8 w-8 text-status-warning-text mx-auto'/>
                    <p className="text-xl font-bold text-[var(--text-primary)] mt-2">
                      {data.careerProgress.upcomingTrainings}
                    </p>
                    <p className="text-caption mt-1">
                      Upcoming
                    </p>
                  </div>
                </div>

                {/* Goals List */}
                {data.careerProgress.currentGoals.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Current Goals
                    </h4>
                    {data.careerProgress.currentGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className="p-4 bg-[var(--bg-secondary)] rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {goal.title}
                          </p>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              goal.status === 'COMPLETED'
                                ? 'bg-success-100 text-success-700 dark:bg-success-950/30 dark:text-success-400'
                                : goal.status === 'IN_PROGRESS'
                                  ? 'bg-accent-100 text-accent-700 dark:bg-accent-950/30 dark:text-accent-400'
                                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:bg-[var(--bg-secondary)] dark:text-[var(--text-muted)]'
                            }`}
                          >
                            {goal.status ? goal.status.replace('_', ' ') : '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-2 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <div
                              className='h-full bg-accent rounded-full transition-all'
                              style={{width: `${goal.progress}%`}}
                            />
                          </div>
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            {goal.progress}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Leave Balances */}
            <Card>
              <CardHeader>
                <div className="row-between">
                  <CardTitle>Leave Balance</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/me/leaves')}
                    rightIcon={<ChevronRight className="h-4 w-4"/>}
                  >
                    Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.leaveBalances.map((balance) => (
                    <div key={balance.leaveTypeId}>
                      <div className="row-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: balance.colorCode || 'var(--accent-primary)',
                            }}
                          />
                          <span className="text-sm font-medium text-[var(--text-secondary)]">
                            {balance.leaveTypeName}
                          </span>
                        </div>
                        <span className="text-body-muted">
                          {balance.available} / {balance.totalQuota}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${balance.percentage}%`,
                            backgroundColor: balance.colorCode || 'var(--accent-primary)',
                          }}
                        />
                      </div>
                      {balance.pending > 0 && (
                        <p className='text-xs text-status-warning-text mt-1'>
                          {balance.pending} pending approval
                        </p>
                      )}
                    </div>
                  ))}
                  {data.leaveBalances.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)]">
                      <Palmtree className="h-8 w-8 mx-auto mb-2"/>
                      <p className="text-sm">No leave balances available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.upcomingEvents.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className={`flex items-start gap-4 p-4 rounded-lg ${getEventColor(event.type)}`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg bg-[var(--bg-input)] flex items-center justify-center shadow-[var(--shadow-card)]">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {event.title}
                        </p>
                        <p className="text-caption mt-0.5">
                          {formatDate(event.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {data.upcomingEvents.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)]">
                      <CalendarDays className="h-8 w-8 mx-auto mb-2"/>
                      <p className="text-sm">No upcoming events</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/me/attendance')}
                    leftIcon={<Clock className="h-4 w-4"/>}
                  >
                    View Attendance
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/leave/apply')}
                    leftIcon={<Palmtree className="h-4 w-4"/>}
                  >
                    Apply for Leave
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/me/payslips')}
                    leftIcon={<FileText className="h-4 w-4"/>}
                  >
                    View Payslips
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/performance')}
                    leftIcon={<Target className="h-4 w-4"/>}
                  >
                    My Goals
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/training')}
                    leftIcon={<GraduationCap className="h-4 w-4"/>}
                  >
                    Training Programs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
