'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  Briefcase,
  Target,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  AlertTriangle,
  Info,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { dashboardService } from '@/lib/services/dashboard.service';
import { ExecutiveDashboardData, Alert as DashboardAlert } from '@/lib/types/dashboard';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function ExecutiveDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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
      const dashboardData = await dashboardService.getExecutiveDashboard();
      setData(dashboardData);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error loading executive dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getAlertIcon = (type: DashboardAlert['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertBgColor = (type: DashboardAlert['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800';
      case 'success':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    }
  };

  const getTrendIcon = (changePercentage: number) => {
    if (changePercentage > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    } else if (changePercentage < 0) {
      return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-surface-400" />;
  };

  const getTrendColor = (changePercentage: number) => {
    if (changePercentage > 0) return 'text-green-600';
    if (changePercentage < 0) return 'text-red-600';
    return 'text-surface-400';
  };

  const DashboardSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <AppLayout activeMenuItem="executive-dashboard">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-surface-900 dark:text-white">Executive Dashboard</h1>
              <p className="text-surface-600 dark:text-surface-400 mt-1">Comprehensive C-suite insights and analytics</p>
            </div>
          </div>
          <DashboardSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout activeMenuItem="executive-dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <CardTitle>Error Loading Dashboard</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-surface-600 dark:text-surface-400 mb-4">{error || 'Unable to load dashboard data'}</p>
              <Button variant="primary" onClick={loadDashboard} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="executive-dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-white">Executive Dashboard</h1>
            <p className="text-surface-600 dark:text-surface-400 mt-1">
              Comprehensive C-suite insights and analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-surface-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboard}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* C-Suite KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Headcount */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Total Headcount</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-white mt-2">
                    {formatNumber(data.csuite.headcount.total)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {getTrendIcon(data.csuite.headcount.growthPercentage)}
                    <span className={`text-sm font-medium ${getTrendColor(data.csuite.headcount.growthPercentage)}`}>
                      {formatPercentage(data.csuite.headcount.growthPercentage)}
                    </span>
                    <span className="text-xs text-surface-400">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue per Employee */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Revenue/Employee</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-white mt-2">
                    {formatCurrency(data.csuite.revenuePerEmployee.current)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {getTrendIcon(data.csuite.revenuePerEmployee.changePercentage)}
                    <span className={`text-sm font-medium ${getTrendColor(data.csuite.revenuePerEmployee.changePercentage)}`}>
                      {formatPercentage(data.csuite.revenuePerEmployee.changePercentage)}
                    </span>
                    <span className="text-xs text-surface-400">vs previous</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Cost */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Total Cost</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-white mt-2">
                    {formatCurrency(data.csuite.costMetrics.totalCost)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-surface-400">
                      {formatCurrency(data.csuite.costMetrics.costPerEmployee)}/employee
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Utilization Rate */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Utilization Rate</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-white mt-2">
                    {data.csuite.productivity.utilizationRate.toFixed(1)}%
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-surface-400">
                      {data.csuite.productivity.efficiency.toFixed(1)}% efficiency
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Metrics & Workforce Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payroll Trend */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary-500" />
                Payroll Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.financial.payroll.trend}>
                  <defs>
                    <linearGradient id="colorPayroll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPayroll)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary-500" />
                Department Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={data.workforce.demographics.byDepartment as any[]}
                    dataKey="count"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {data.workforce.demographics.byDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatNumber(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Strategic Insights & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts & Recommendations */}
          <div className="lg:col-span-2 space-y-4">
            {/* Alerts */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Strategic Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.strategic.alerts.length > 0 ? (
                    data.strategic.alerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border ${getAlertBgColor(alert.type)}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-surface-900 dark:text-white">{alert.title}</h4>
                          <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">{alert.message}</p>
                          {alert.action && alert.actionUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-8 px-3"
                              onClick={() => router.push(alert.actionUrl!)}
                            >
                              {alert.action}
                            </Button>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              alert.priority === 'high'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : alert.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                          >
                            {alert.priority}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-surface-500">No active alerts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Strategic Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.strategic.recommendations.length > 0 ? (
                    data.strategic.recommendations.slice(0, 3).map((rec) => (
                      <div key={rec.id} className="p-4 rounded-lg bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                                {rec.category}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  rec.impact === 'high'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : rec.impact === 'medium'
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}
                              >
                                {rec.impact} impact
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-surface-900 dark:text-white">{rec.title}</h4>
                            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">{rec.description}</p>
                            {rec.potentialSavings && (
                              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                                Potential savings: {formatCurrency(rec.potentialSavings)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-surface-500 text-center py-4">No recommendations available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workforce Summary Sidebar */}
          <div className="space-y-4">
            {/* Attendance Overview */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-primary-500" />
                  Today's Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-600 dark:text-surface-400">Present</span>
                    <span className="text-lg font-bold text-green-600">{data.workforce.attendance.present}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-600 dark:text-surface-400">On Leave</span>
                    <span className="text-lg font-bold text-orange-600">{data.workforce.attendance.onLeave}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-600 dark:text-surface-400">Absent</span>
                    <span className="text-lg font-bold text-red-600">{data.workforce.attendance.absent}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-surface-200 dark:border-surface-700">
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Attendance Rate</span>
                    <span className="text-xl font-bold text-primary-600">{data.workforce.attendance.attendanceRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-primary-500" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center pb-3 border-b border-surface-200 dark:border-surface-700">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                      {data.workforce.performance.averageRating.toFixed(1)}
                    </p>
                    <p className="text-sm text-surface-500 mt-1">Average Rating</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-600 dark:text-surface-400">High Performers</span>
                    <span className="text-sm font-semibold text-green-600">{data.workforce.performance.highPerformers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-600 dark:text-surface-400">Needs Improvement</span>
                    <span className="text-sm font-semibold text-orange-600">{data.workforce.performance.needsImprovement}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-surface-600 dark:text-surface-400">Reviews Pending</span>
                    <span className="text-sm font-semibold text-primary-600">{data.workforce.performance.reviewsPending}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Metrics */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="h-5 w-5 text-primary-500" />
                  Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-600 dark:text-surface-400">eNPS Score</span>
                    <span className="text-lg font-bold text-primary-600">{data.workforce.engagement.eNPS}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-600 dark:text-surface-400">Satisfaction</span>
                    <span className="text-lg font-bold text-green-600">{data.workforce.engagement.satisfactionScore}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-600 dark:text-surface-400">Retention Rate</span>
                    <span className="text-lg font-bold text-blue-600">{data.workforce.engagement.retentionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-600 dark:text-surface-400">Active Onboarding</span>
                    <span className="text-lg font-bold text-orange-600">{data.workforce.engagement.activeOnboarding}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Financial Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Payroll</p>
                <DollarSign className="h-5 w-5 text-primary-500" />
              </div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {formatCurrency(data.financial.payroll.currentMonth)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {getTrendIcon(data.financial.payroll.changePercentage)}
                <span className={`text-sm ${getTrendColor(data.financial.payroll.changePercentage)}`}>
                  {formatPercentage(data.financial.payroll.changePercentage)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Benefits Cost</p>
                <Building2 className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {formatCurrency(data.financial.benefits.totalBenefitsCost)}
              </p>
              <p className="text-xs text-surface-400 mt-2">
                {formatCurrency(data.financial.benefits.perEmployee)}/employee
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Avg Salary</p>
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {formatCurrency(data.financial.compensation.averageSalary)}
              </p>
              <p className="text-xs text-surface-400 mt-2">
                Median: {formatCurrency(data.financial.compensation.medianSalary)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Expenses</p>
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {formatCurrency(data.financial.expenses.total)}
              </p>
              <p className="text-xs text-surface-400 mt-2">
                {data.financial.expenses.pending} pending
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
