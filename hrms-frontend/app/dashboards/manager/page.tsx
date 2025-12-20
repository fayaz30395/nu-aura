'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserCheck,
  UserX,
  Home,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Calendar,
  ClipboardList,
  Target,
  Award,
  AlertTriangle,
  Info,
  FileText,
  BarChart3,
  Activity,
  Briefcase,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { dashboardService } from '@/lib/services/dashboard.service';
import { ManagerDashboardResponse } from '@/lib/types/dashboard';

// Utility function to format dates
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Utility function to get health status color
const getHealthStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    EXCELLENT: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    GOOD: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    NEEDS_ATTENTION: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };
  return colors[status] || colors.GOOD;
};

// Utility function to get alert severity color
const getSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };
  return colors[severity] || colors.INFO;
};

// Utility function to get status icon
const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return <AlertCircle className="h-5 w-5" />;
    case 'WARNING':
      return <AlertTriangle className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
};

export default function ManagerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<ManagerDashboardResponse | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else {
      loadDashboard();
    }
  }, [hasHydrated, isAuthenticated, router]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getManagerDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error('Error loading manager dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Loading skeleton
  const DashboardSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <AppLayout activeMenuItem="dashboard">
        <div className="p-6">
          <DashboardSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (error || !dashboardData) {
    return (
      <AppLayout activeMenuItem="dashboard">
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 flex items-center gap-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
                Error Loading Dashboard
              </h3>
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { teamOverview, teamAttendance, teamLeave, teamPerformance, actionItems, teamAlerts } = dashboardData;

  // Chart colors
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

  // Performance distribution data
  const performanceData = [
    { name: 'Exceeding', value: teamPerformance.exceeding, color: '#10B981' },
    { name: 'Meeting', value: teamPerformance.meeting, color: '#3B82F6' },
    { name: 'Needs Improvement', value: teamPerformance.needsImprovement, color: '#F59E0B' },
    { name: 'Not Rated', value: teamPerformance.notRated, color: '#94A3B8' },
  ];

  // Attendance trend chart data
  const attendanceTrendData = teamAttendance.weeklyTrend.map((day) => ({
    name: day.dayOfWeek.substring(0, 3),
    rate: parseFloat((day.attendanceRate || 0).toFixed(1)),
  }));

  return (
    <AppLayout activeMenuItem="dashboard">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
              Manager Dashboard
            </h1>
            <p className="text-surface-600 dark:text-surface-400 mt-1">
              {dashboardData.departmentName} Team Overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getHealthStatusColor(teamOverview.teamHealthStatus)}>
              Team Health: {teamOverview.teamHealthStatus.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Team Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
                    Team Size
                  </p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-white mt-2">
                    {teamOverview.totalTeamSize}
                  </p>
                  <p className="text-xs text-surface-500 mt-1">
                    {teamOverview.directReports} direct reports
                  </p>
                </div>
                <div className="h-14 w-14 rounded-full bg-indigo-100 dark:bg-indigo-800/30 flex items-center justify-center">
                  <Users className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
                    Present Today
                  </p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-white mt-2">
                    {teamAttendance.presentToday}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {teamAttendance.workFromHomeToday} working from home
                  </p>
                </div>
                <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-800/30 flex items-center justify-center">
                  <UserCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
                    On Leave Today
                  </p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-white mt-2">
                    {teamAttendance.onLeaveToday}
                  </p>
                  <p className="text-xs text-surface-500 mt-1">
                    {teamLeave.pendingApprovals} pending approvals
                  </p>
                </div>
                <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center">
                  <Calendar className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
                    Action Items
                  </p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-white mt-2">
                    {actionItems.totalActionItems}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {actionItems.overdueApprovals + actionItems.overdueReviews} overdue
                  </p>
                </div>
                <div className="h-14 w-14 rounded-full bg-purple-100 dark:bg-purple-800/30 flex items-center justify-center">
                  <ClipboardList className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Metrics & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Attendance Metrics */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                Team Attendance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                      Weekly Rate
                    </p>
                    <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1">
                      {teamAttendance.weeklyAttendanceRate?.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                      Monthly Rate
                    </p>
                    <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1">
                      {teamAttendance.monthlyAttendanceRate?.toFixed(1)}%
                    </p>
                    {teamAttendance.monthlyAttendanceChange !== 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {teamAttendance.monthlyAttendanceChange > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-xs ${teamAttendance.monthlyAttendanceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(teamAttendance.monthlyAttendanceChange).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                      Avg Work Hours
                    </p>
                    <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1">
                      {teamAttendance.avgWorkingHours?.toFixed(1)}h
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                      Late Arrivals
                    </p>
                    <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1">
                      {teamAttendance.totalLateArrivals}
                    </p>
                  </div>
                </div>

                {/* Weekly Trend */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendanceTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke="#6366F1"
                        strokeWidth={2}
                        dot={{ fill: '#6366F1', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Performance Distribution */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-500" />
                Performance Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                      Average Rating
                    </p>
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                      {teamPerformance.avgPerformanceRating?.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                      Goal Completion
                    </p>
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                      {teamPerformance.goalCompletionRate?.toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="h-52 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={performanceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {performanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals & Action Items */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Approvals */}
          <Card className="border-0 shadow-md lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamLeave.pendingLeaveRequests.slice(0, 5).map((leave) => (
                  <div
                    key={leave.requestId}
                    className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-surface-900 dark:text-white">
                            {leave.employeeName}
                          </p>
                          {leave.urgency === 'HIGH' && (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                          {leave.leaveType} - {formatDate(leave.startDate)} to{' '}
                          {formatDate(leave.endDate)} ({leave.days} days)
                        </p>
                        {leave.reason && (
                          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                            {leave.reason}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-surface-500">
                          {new Date(leave.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {teamLeave.pendingLeaveRequests.length === 0 && (
                  <div className="text-center py-8 text-surface-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No pending leave approvals</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Items Summary */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-500" />
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-surface-900 dark:text-white">
                      Leave Approvals
                    </span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-300">
                    {actionItems.leaveApprovals}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-surface-900 dark:text-white">
                      Timesheet Approvals
                    </span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                    {actionItems.timesheetApprovals}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-surface-900 dark:text-white">
                      Performance Reviews
                    </span>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300">
                    {actionItems.performanceReviewsDue}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-surface-900 dark:text-white">
                      One-on-Ones Due
                    </span>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300">
                    {actionItems.oneOnOnesDue}
                  </Badge>
                </div>

                {(actionItems.overdueApprovals > 0 || actionItems.overdueReviews > 0) && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        {actionItems.overdueApprovals + actionItems.overdueReviews} Overdue Items
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Alerts */}
        {teamAlerts && teamAlerts.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-indigo-500" />
                Team Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : alert.severity === 'WARNING'
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={getSeverityColor(alert.severity)}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-surface-900 dark:text-white">
                            {alert.title}
                          </h4>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-surface-600 dark:text-surface-400">
                          {alert.description}
                        </p>
                        {alert.employeeName && (
                          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                            Employee: {alert.employeeName}
                          </p>
                        )}
                        {alert.actionRequired && (
                          <p className="text-sm font-medium text-surface-900 dark:text-white mt-2">
                            Action: {alert.actionRequired}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals Overview */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-500" />
                Team Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {teamPerformance.goalsOnTrack}
                    </p>
                    <p className="text-xs text-surface-600 dark:text-surface-400 mt-1">
                      On Track
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {teamPerformance.goalsAtRisk}
                    </p>
                    <p className="text-xs text-surface-600 dark:text-surface-400 mt-1">
                      At Risk
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {teamPerformance.goalsCompleted}
                    </p>
                    <p className="text-xs text-surface-600 dark:text-surface-400 mt-1">
                      Completed
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-200 dark:border-surface-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-surface-600 dark:text-surface-400">
                      Completion Rate
                    </span>
                    <span className="text-sm font-semibold text-surface-900 dark:text-white">
                      {teamPerformance.goalCompletionRate?.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${teamPerformance.goalCompletionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* One-on-Ones & Feedback */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                Engagement & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-surface-600 dark:text-surface-400">
                      One-on-Ones This Month
                    </span>
                    <span className="text-2xl font-bold text-surface-900 dark:text-white">
                      {teamPerformance.oneOnOnesCompletedThisMonth}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-surface-500">Scheduled:</span>
                    <span className="font-semibold text-surface-900 dark:text-white">
                      {teamPerformance.oneOnOnesScheduled}
                    </span>
                  </div>
                  {teamPerformance.oneOnOnesOverdue > 0 && (
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-600 dark:text-red-400">
                        {teamPerformance.oneOnOnesOverdue} overdue
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-surface-600 dark:text-surface-400">
                      Average Feedback Score
                    </span>
                    <span className="text-2xl font-bold text-surface-900 dark:text-white">
                      {teamPerformance.avgFeedbackScore?.toFixed(1)}
                    </span>
                  </div>
                  {teamPerformance.pendingFeedbackRequests > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-amber-600 dark:text-amber-400">
                        {teamPerformance.pendingFeedbackRequests} pending requests
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-600 dark:text-surface-400">
                      Training Completion
                    </span>
                    <span className="text-2xl font-bold text-surface-900 dark:text-white">
                      {teamPerformance.trainingCompletionRate?.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
