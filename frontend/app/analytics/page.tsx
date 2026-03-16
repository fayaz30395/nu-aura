'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  Activity,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDashboardAnalytics } from '@/lib/hooks/queries/useAnalytics';

import { chartColors } from '@/lib/utils/theme-colors';

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
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-input)] p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
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
  const { isAuthenticated, hasHydrated } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const { data: analytics, isLoading, error, refetch } = useDashboardAnalytics(
    isAuthenticated && hasHydrated
  );

  React.useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
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
              <div className="flex items-center gap-4 text-red-600">
                <AlertCircle className="h-6 w-6" />
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
    { name: 'Present', value: analytics.attendance.present, color: chartColors.success() },
    { name: 'On Leave', value: analytics.attendance.onLeave, color: chartColors.warning() },
    { name: 'Absent', value: analytics.attendance.absent, color: chartColors.danger() },
  ].filter(d => d.value > 0);

  return (
    <AppLayout activeMenuItem="analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
              Analytics Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Comprehensive HR metrics and insights
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[var(--bg-input)] rounded-lg border border-slate-200 dark:border-slate-700 p-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    timeRange === range
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Employees</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                    {analytics.headcount.total}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {analytics.headcount.growthPercentage >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        analytics.headcount.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {Math.abs(analytics.headcount.growthPercentage)}%
                    </span>
                    <span className="text-xs text-slate-400">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Attendance Rate</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                    {analytics.attendance.attendancePercentage}%
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-green-600">{analytics.attendance.present}</span>
                    <span className="text-xs text-slate-400">present today</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Leave Utilization</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                    {analytics.leave.utilizationPercentage}%
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-orange-600">{analytics.leave.pending}</span>
                    <span className="text-xs text-slate-400">pending approvals</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {analytics.payroll && (
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Monthly Payroll</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                      {formatCurrency(analytics.payroll.currentMonth.total)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-blue-600">
                        {analytics.payroll.currentMonth.processed}
                      </span>
                      <span className="text-xs text-slate-400">processed</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
                <Activity className="h-5 w-5 text-primary-600" />
                Attendance Trend
              </CardTitle>
              <CardDescription>Daily attendance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {attendanceTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attendanceTrendData}>
                      <defs>
                        <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColors.info()} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={chartColors.info()} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
                      <YAxis tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Attendance"
                        stroke={chartColors.info()}
                        fill="url(#attendanceGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    No attendance trend data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Attendance Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                Today&apos;s Attendance
              </CardTitle>
              <CardDescription>Current attendance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center">
                {attendancePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendancePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {attendancePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span className="text-sm text-slate-600 dark:text-slate-400">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full text-center text-slate-400">
                    No attendance data available
                  </div>
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
                <Users className="h-5 w-5 text-purple-600" />
                Department Distribution
              </CardTitle>
              <CardDescription>Employees by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {departmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
                      <XAxis type="number" tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
                      <YAxis
                        type="category"
                        dataKey="department"
                        tick={{ fontSize: 12 }}
                        stroke={chartColors.muted()}
                        width={100}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Employees" fill={chartColors.secondary()} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    No department data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leave Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                Leave by Type
              </CardTitle>
              <CardDescription>Leave requests by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {leaveDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leaveDistributionData.map(d => ({
                          name: d.leaveType,
                          value: d.count,
                          color: d.color || COLORS[0]
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {leaveDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span className="text-sm text-slate-600 dark:text-slate-400">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    No leave distribution data available
                  </div>
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
                <DollarSign className="h-5 w-5 text-blue-600" />
                Payroll Trend
              </CardTitle>
              <CardDescription>Monthly payroll costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payrollTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke={chartColors.muted()}
                      tickFormatter={(value) =>
                        new Intl.NumberFormat('en-IN', {
                          notation: 'compact',
                          compactDisplay: 'short',
                        }).format(value)
                      }
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value as number), 'Payroll']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="Payroll"
                      stroke={chartColors.info()}
                      strokeWidth={3}
                      dot={{ fill: chartColors.info(), strokeWidth: 2 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Headcount Trend */}
        {headcountTrendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Headcount Trend
              </CardTitle>
              <CardDescription>Employee count over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={headcountTrendData}>
                    <defs>
                      <linearGradient id="headcountGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.success()} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColors.success()} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
                    <YAxis tick={{ fontSize: 12 }} stroke={chartColors.muted()} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Headcount"
                      stroke={chartColors.success()}
                      fill="url(#headcountGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                {analytics.attendance.onTime}
              </p>
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">On Time Today</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                {analytics.attendance.late}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">Late Today</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {analytics.headcount.newJoinees}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">New Joiners</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-700 dark:text-red-400">
                {analytics.headcount.exits}
              </p>
              <p className="text-sm text-red-600 dark:text-red-500 mt-1">Exits This Month</p>
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
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl">
                <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                  {analytics.leave.pending}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-2">Pending</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-xl">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {analytics.leave.approved}
                </p>
                <p className="text-sm text-green-700 dark:text-green-500 mt-2">Approved</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-xl">
                <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                  {analytics.leave.rejected}
                </p>
                <p className="text-sm text-red-700 dark:text-red-500 mt-2">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
