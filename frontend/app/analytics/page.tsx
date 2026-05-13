'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import dynamic from 'next/dynamic';
import {ChartLoadingFallback} from '@/lib/utils/lazy-components';
import {
  Activity,
  AlertCircle,
  Calendar,
  DollarSign,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {BarChart3 as BarChart3Icon, PieChart as PieChartIcon} from 'lucide-react';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import type {DashboardAnalyticsParams} from '@/lib/hooks/queries/useAnalytics';
import {useDashboardAnalytics} from '@/lib/hooks/queries/useAnalytics';

import {chartColors} from '@/lib/utils/theme-colors';
import {formatCurrency} from '@/lib/utils';
import {Stat} from '@/components/ui/Stat';

const AnalyticsAttendanceTrendChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsAttendanceTrendChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const AnalyticsAttendancePieChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsAttendancePieChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const AnalyticsDeptBarChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsDeptBarChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const AnalyticsLeavePieChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsLeavePieChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const AnalyticsPayrollChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsPayrollChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const AnalyticsHeadcountChart = dynamic(
  () => import('./AnalyticsCharts').then((mod) => ({default: mod.AnalyticsHeadcountChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

// Chart colors - now using CSS variables defined in globals.css
const COLORS = chartColors.palette();

interface TooltipPayloadEntry {
  name: string;
  value: number | string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
}

// Custom tooltip component
const _CustomTooltip = ({active, payload, label}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="bg-[var(--bg-input)] p-4 rounded-lg shadow-[var(--shadow-dropdown)] border border-[var(--border-main)]">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <p key={index} className="text-sm" style={{color: entry.color}}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyPermission, isReady: permReady} = usePermissions();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const analyticsParams: DashboardAnalyticsParams | undefined =
    timeRange === 'custom' && customStart && customEnd
      ? {startDate: customStart, endDate: customEnd}
      : undefined;

  const {data: analytics, isLoading, error, refetch} = useDashboardAnalytics(
    isAuthenticated && hasHydrated,
    analyticsParams
  );

  React.useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  // RBAC guard — analytics requires REPORT_VIEW or ANALYTICS_VIEW permission (DEF-51)
  const canViewAnalytics = hasAnyPermission(Permissions.REPORT_VIEW, Permissions.ANALYTICS_VIEW);
  React.useEffect(() => {
    if (!permReady) return;
    if (!canViewAnalytics) {
      router.replace('/dashboard');
    }
  }, [permReady, canViewAnalytics, router]);

  // RBAC guard — block render for unauthorized users (DEF-51)
  if (!permReady || !canViewAnalytics) {
    return null;
  }

  if (!hasHydrated || isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin"/>
          <p className="text-[var(--text-muted)] font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <AppLayout activeMenuItem="analytics">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <div
                className="flex items-center gap-4 text-danger-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                <AlertCircle className="h-6 w-6"/>
                <CardTitle>Error Loading Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--text-secondary)] mb-4">{error?.message || 'Unable to load analytics data'}</p>
              <Button variant="primary" onClick={() => refetch()} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Prepare chart data
  const attendanceTrendData = analytics.attendance.trend || [];
  const headcountTrendData = analytics.headcount.trend || [];
  const payrollTrendData = analytics.payroll?.costTrend || [];
  const leaveDistributionData = analytics.leave.distribution || [];
  const departmentData = analytics.headcount.departmentDistribution || [];

  // Attendance pie data
  const attendancePieData = [
    {name: 'Present', value: analytics.attendance.present, color: chartColors.success()},
    {name: 'On Leave', value: analytics.attendance.onLeave, color: chartColors.warning()},
    {name: 'Absent', value: analytics.attendance.absent, color: chartColors.danger()},
  ].filter(d => d.value > 0);

  return (
    <AppLayout activeMenuItem="analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-xl font-bold text-[var(--text-primary)]">
              Analytics Dashboard
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Comprehensive HR metrics and insights
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] p-1">
              {(['7d', '30d', '90d', 'custom'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    timeRange === range
                      ? 'bg-accent-700 text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : 'Custom'}
                </button>
              ))}
            </div>
            {timeRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="input-aura px-4 py-1.5 text-sm"
                  aria-label="Start date"
                />
                <span className="text-body-muted">to</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="input-aura px-4 py-1.5 text-sm"
                  aria-label="End date"
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              leftIcon={<RefreshCw className="h-4 w-4"/>}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <Stat
                  label="Total Employees"
                  value={analytics.headcount.total}
                  caption={
                    <span className="flex items-center gap-1">
                      {analytics.headcount.growthPercentage >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success-600"/>
                      ) : (
                        <TrendingDown className="h-4 w-4 text-danger-600"/>
                      )}
                      <span
                        className={`font-medium ${
                          analytics.headcount.growthPercentage >= 0 ? 'text-success-600' : 'text-danger-600'
                        }`}
                      >
                        {Math.abs(analytics.headcount.growthPercentage)}%
                      </span>
                      <span>vs last month</span>
                    </span>
                  }
                />
                <div
                  className="w-12 h-12 rounded-xl bg-accent-50 dark:bg-accent-900/30 flex items-center justify-center">
                  <Users
                    className="h-6 w-6 text-accent-700 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <Stat
                  label="Attendance Rate"
                  value={`${analytics.attendance.attendancePercentage}%`}
                  caption={
                    <span className="flex items-center gap-2">
                      <span className="text-success-600">{analytics.attendance.present}</span>
                      <span>present today</span>
                    </span>
                  }
                />
                <div
                  className="w-12 h-12 rounded-xl bg-success-50 dark:bg-success-900/30 flex items-center justify-center">
                  <UserCheck
                    className="h-6 w-6 text-success-600 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <Stat
                  label="Leave Utilization"
                  value={`${analytics.leave.utilizationPercentage}%`}
                  caption={
                    <span className="flex items-center gap-2">
                      <span className="text-warning-600">{analytics.leave.pending}</span>
                      <span>pending approvals</span>
                    </span>
                  }
                />
                <div
                  className="w-12 h-12 rounded-xl bg-warning-50 dark:bg-warning-900/30 flex items-center justify-center">
                  <Calendar
                    className="h-6 w-6 text-warning-600 dark:text-warning-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                </div>
              </div>
            </CardContent>
          </Card>

          {analytics.payroll && (
            <Card className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <Stat
                    label="Monthly Payroll"
                    value={formatCurrency(analytics.payroll.currentMonth.total)}
                    caption={
                      <span className="flex items-center gap-2">
                        <span className="text-accent-600">{analytics.payroll.currentMonth.processed}</span>
                        <span>processed</span>
                      </span>
                    }
                  />
                  <div
                    className="w-12 h-12 rounded-xl bg-accent-50 dark:bg-accent-900/30 flex items-center justify-center">
                    <DollarSign
                      className="h-6 w-6 text-accent-600 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity
                  className="h-5 w-5 text-accent-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                Attendance Trend
              </CardTitle>
              <CardDescription>Daily attendance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {attendanceTrendData.length > 0 ? (
                  <AnalyticsAttendanceTrendChart data={attendanceTrendData}/>
                ) : (
                  <EmptyState
                    icon={<TrendingUp className="h-8 w-8"/>}
                    title="No attendance trend data available"
                    description="Daily attendance data will appear here once entries are logged."
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Attendance Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck
                  className="h-5 w-5 text-success-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                Today&apos;s Attendance
              </CardTitle>
              <CardDescription>Current attendance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center">
                {attendancePieData.length > 0 ? (
                  <AnalyticsAttendancePieChart data={attendancePieData}/>
                ) : (
                  <EmptyState
                    icon={<PieChartIcon className="h-8 w-8"/>}
                    title="No attendance data available"
                    description="Today's attendance breakdown will appear once entries are recorded."
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users
                  className="h-5 w-5 text-accent-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                Department Distribution
              </CardTitle>
              <CardDescription>Employees by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {departmentData.length > 0 ? (
                  <AnalyticsDeptBarChart data={departmentData}/>
                ) : (
                  <EmptyState
                    icon={<BarChart3Icon className="h-8 w-8"/>}
                    title="No department data available"
                    description="Headcount by department will appear here once employees are assigned."
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leave Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar
                  className="h-5 w-5 text-warning-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                Leave by Type
              </CardTitle>
              <CardDescription>Leave requests by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {leaveDistributionData.length > 0 ? (
                  <AnalyticsLeavePieChart data={leaveDistributionData} colors={COLORS}/>
                ) : (
                  <EmptyState
                    icon={<Calendar className="h-8 w-8"/>}
                    title="No leave distribution data available"
                    description="Leave requests grouped by category will appear once filed."
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Trend (Admin only) */}
        {analytics.payroll && payrollTrendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign
                  className="h-5 w-5 text-accent-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                Payroll Trend
              </CardTitle>
              <CardDescription>Monthly payroll costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <AnalyticsPayrollChart data={payrollTrendData}/>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Headcount Trend */}
        {headcountTrendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp
                  className="h-5 w-5 text-success-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                Headcount Trend
              </CardTitle>
              <CardDescription>Employee count over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <AnalyticsHeadcountChart data={headcountTrendData}/>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <Stat label="On Time Today" value={analytics.attendance.onTime} tone="success"/>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Stat label="Late Today" value={analytics.attendance.late} tone="warning"/>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Stat label="New Joiners" value={analytics.headcount.newJoinees} tone="accent"/>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Stat label="Exits This Month" value={analytics.headcount.exits} tone="danger"/>
            </CardContent>
          </Card>
        </div>

        {/* Leave Request Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Request Summary</CardTitle>
            <CardDescription>Current status of leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Pending" value={analytics.leave.pending} tone="warning"/>
              <Stat label="Approved" value={analytics.leave.approved} tone="success"/>
              <Stat label="Rejected" value={analytics.leave.rejected} tone="danger"/>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
