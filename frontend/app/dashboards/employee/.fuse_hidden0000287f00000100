'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Target,
  FileText,
  CheckCircle,
  AlertCircle,
  Palmtree,
  GraduationCap,
  CalendarDays,
  ChevronRight,
  Users,
  Briefcase,
  Gift,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useEmployeeDashboard } from '@/lib/hooks/queries';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { data, isLoading: loading, error } = useEmployeeDashboard();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400';
      case 'ABSENT':
        return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400';
      case 'LATE':
        return 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-400';
      case 'LEAVE':
      case 'ON_LEAVE':
        return 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400';
      case 'WEEKLY_OFF':
        return 'bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-400';
      case 'HOLIDAY':
        return 'bg-pink-100 dark:bg-pink-950/30 text-pink-800 dark:text-pink-400';
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'HOLIDAY':
        return <Calendar className="h-4 w-4" />;
      case 'BIRTHDAY':
        return <Gift className="h-4 w-4" />;
      case 'ANNIVERSARY':
        return <Award className="h-4 w-4" />;
      case 'MEETING':
        return <Users className="h-4 w-4" />;
      case 'TRAINING':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <CalendarDays className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'HOLIDAY':
        return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400';
      case 'BIRTHDAY':
        return 'bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400';
      case 'ANNIVERSARY':
        return 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400';
      case 'MEETING':
        return 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400';
      case 'TRAINING':
        return 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400';
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
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full" />
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
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <CardTitle>Error Loading Dashboard</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--text-secondary)] mb-4">
                {error instanceof Error ? error.message : 'Unable to load dashboard data'}
              </p>
              <Button variant="primary" onClick={() => window.location.reload()} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
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
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
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
              leftIcon={<Clock className="h-4 w-4" />}
            >
              Mark Attendance
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push('/leave/apply')}
              leftIcon={<Palmtree className="h-4 w-4" />}
            >
              Apply Leave
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)]">
                    Present Days
                  </p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {data.attendanceSummary.currentMonth.present}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {data.attendanceSummary.currentMonth.attendancePercentage}% attendance
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)]">
                    Leaves Taken
                  </p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {data.stats.totalLeavesTaken}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">This year</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <Palmtree className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)]">
                    Leaves Available
                  </p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {data.stats.totalLeavesRemaining}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Remaining</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)]">
                    Avg Work Hours
                  </p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                    {data.attendanceSummary.currentMonth.averageWorkHours.toFixed(1)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Per day</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary-600 dark:text-primary-400" />
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Attendance Trend</CardTitle>
                    <CardDescription>Last 7 days attendance pattern</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/me/attendance')}
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.attendanceSummary.weeklyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.attendanceSummary.weeklyTrend}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-surface-200 dark:stroke-surface-700"
                      />
                      <XAxis
                        dataKey="date"
                        className="text-xs text-[var(--text-secondary)]"
                        tick={{ fill: 'currentColor' }}
                      />
                      <YAxis
                        className="text-xs text-[var(--text-secondary)]"
                        tick={{ fill: 'currentColor' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '8px 12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalHours"
                        name="Work Hours"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center text-[var(--text-muted)]">
                      <Clock className="h-12 w-12 mx-auto mb-3" />
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
                  <div className="space-y-3">
                    {data.attendanceSummary.recentHistory.slice(0, 5).map((record, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--bg-card)] flex items-center justify-center shadow-sm">
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
                                <span className="text-xs text-[var(--text-muted)]">
                                  In: {formatTime(record.checkInTime)}
                                </span>
                              )}
                              {record.checkOutTime && (
                                <span className="text-xs text-[var(--text-muted)]">
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
                            {record.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--text-muted)]">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3" />
                    <p className="text-sm">No attendance records found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Career Progress */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Career Progress</CardTitle>
                    <CardDescription>Goals, reviews, and training</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/performance')}
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-primary-50 dark:bg-primary-950/30 rounded-xl">
                    <Target className="h-8 w-8 text-primary-600 dark:text-primary-400 mx-auto" />
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">
                      {data.careerProgress.currentGoals.length}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Active Goals
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-xl">
                    <Award className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto" />
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">
                      {data.careerProgress.recentReviews.length}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Reviews
                    </p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                    <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto" />
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">
                      {data.careerProgress.completedTrainings}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Completed
                    </p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
                    <Briefcase className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto" />
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">
                      {data.careerProgress.upcomingTrainings}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Upcoming
                    </p>
                  </div>
                </div>

                {/* Goals List */}
                {data.careerProgress.currentGoals.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Current Goals
                    </h4>
                    {data.careerProgress.currentGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className="p-3 bg-[var(--bg-secondary)] rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {goal.title}
                          </p>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              goal.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                                : goal.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:bg-[var(--bg-secondary)] dark:text-[var(--text-muted)]'
                            }`}
                          >
                            {goal.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full transition-all"
                              style={{ width: `${goal.progress}%` }}
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
                <div className="flex items-center justify-between">
                  <CardTitle>Leave Balance</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/me/leaves')}
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.leaveBalances.map((balance) => (
                    <div key={balance.leaveTypeId}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: balance.colorCode || '#3b82f6',
                            }}
                          />
                          <span className="text-sm font-medium text-[var(--text-secondary)]">
                            {balance.leaveTypeName}
                          </span>
                        </div>
                        <span className="text-sm text-[var(--text-muted)]">
                          {balance.available} / {balance.totalQuota}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${balance.percentage}%`,
                            backgroundColor: balance.colorCode || '#3b82f6',
                          }}
                        />
                      </div>
                      {balance.pending > 0 && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          {balance.pending} pending approval
                        </p>
                      )}
                    </div>
                  ))}
                  {data.leaveBalances.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)]">
                      <Palmtree className="h-8 w-8 mx-auto mb-2" />
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
                <div className="space-y-3">
                  {data.upcomingEvents.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className={`flex items-start gap-3 p-3 rounded-lg ${getEventColor(event.type)}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-input)] flex items-center justify-center shadow-sm">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {event.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {formatDate(event.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {data.upcomingEvents.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)]">
                      <CalendarDays className="h-8 w-8 mx-auto mb-2" />
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
                    leftIcon={<Clock className="h-4 w-4" />}
                  >
                    View Attendance
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/leave/apply')}
                    leftIcon={<Palmtree className="h-4 w-4" />}
                  >
                    Apply for Leave
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/me/payslips')}
                    leftIcon={<FileText className="h-4 w-4" />}
                  >
                    View Payslips
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/performance')}
                    leftIcon={<Target className="h-4 w-4" />}
                  >
                    My Goals
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/training')}
                    leftIcon={<GraduationCap className="h-4 w-4" />}
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
