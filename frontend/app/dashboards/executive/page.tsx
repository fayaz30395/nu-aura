'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  DollarSign,
  TrendingUp,
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
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Shield,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { ChartLoadingFallback } from '@/lib/utils/lazy-components';

const ExecutiveHeadcountChart = dynamic(
  () => import('./ExecutiveCharts').then((mod) => ({ default: mod.ExecutiveHeadcountChart })),
  { loading: () => <ChartLoadingFallback />, ssr: false }
);

const ExecutiveDeptPieChart = dynamic(
  () => import('./ExecutiveCharts').then((mod) => ({ default: mod.ExecutiveDeptPieChart })),
  { loading: () => <ChartLoadingFallback />, ssr: false }
);
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { useExecutiveDashboard } from '@/lib/hooks/queries/useDashboards';
import { StrategicAlert } from '@/lib/types/dashboard';
import { formatCurrency } from '@/lib/utils';

// Use CSS vars so chart colors adapt to dark mode automatically
const COLORS = [
  'var(--chart-primary)',
  'var(--chart-success)',
  'var(--chart-warning)',
  'var(--chart-danger)',
  'var(--chart-secondary)',
  'var(--chart-accent)',
  'var(--chart-info)',
  'var(--chart-muted)',
];

export default function ExecutiveDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { data, isLoading: loading, error, refetch } = useExecutiveDashboard(
    isAuthenticated && hasHydrated
  );

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else {
      setLastUpdated(new Date());
    }
  }, [hasHydrated, isAuthenticated, router]);


  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getAlertIcon = (severity: StrategicAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-5 w-5 text-danger-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      case 'INFO':
      default:
        return <Info className="h-5 w-5 text-accent-500" />;
    }
  };

  const getAlertBgColor = (severity: StrategicAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-danger-50 dark:bg-danger-950/30 border-danger-200 dark:border-danger-800';
      case 'WARNING':
        return 'bg-warning-50 dark:bg-warning-950/30 border-warning-200 dark:border-warning-800';
      case 'INFO':
      default:
        return 'bg-accent-50 dark:bg-accent-950/30 border-accent-200 dark:border-accent-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'UP') {
      return <ArrowUpRight className="h-4 w-4 text-success-600" />;
    } else if (trend === 'DOWN') {
      return <ArrowDownRight className="h-4 w-4 text-danger-600" />;
    }
    return <Minus className="h-4 w-4 text-[var(--text-muted)]" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GOOD':
        return 'text-success-600 bg-success-50 dark:bg-success-900/30';
      case 'WARNING':
        return 'text-warning-600 bg-warning-50 dark:bg-warning-900/30';
      case 'CRITICAL':
        return 'text-danger-600 bg-danger-50 dark:bg-danger-900/30';
      default:
        return 'text-[var(--text-secondary)] bg-[var(--bg-secondary)]';
    }
  };

  const getKpiIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      users: <Users className="h-6 w-6" />,
      dollar: <DollarSign className="h-6 w-6" />,
      trending: <TrendingUp className="h-6 w-6" />,
      target: <Target className="h-6 w-6" />,
      activity: <Activity className="h-6 w-6" />,
      briefcase: <Briefcase className="h-6 w-6" />,
      building: <Building2 className="h-6 w-6" />,
      clock: <Clock className="h-6 w-6" />,
    };
    return icons[iconName?.toLowerCase()] || <BarChart3 className="h-6 w-6" />;
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
              <h1 className="text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">Executive Dashboard</h1>
              <p className="text-[var(--text-secondary)] mt-1">Comprehensive C-suite insights and analytics</p>
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
              <div className="flex items-center gap-4 text-danger-600">
                <AlertCircle className="h-6 w-6" />
                <CardTitle>Error Loading Dashboard</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--text-secondary)] mb-4">{error?.message || 'Unable to load dashboard data'}</p>
              <Button variant="primary" onClick={() => refetch()} className="w-full">
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
            <h1 className="text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">Executive Dashboard</h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Comprehensive C-suite insights and analytics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-[var(--text-muted)]">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                setLastUpdated(new Date());
              }}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        {data.keyMetrics && data.keyMetrics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.keyMetrics.slice(0, 4).map((kpi, index) => (
              <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-muted)]">{kpi.name}</p>
                      <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                        {kpi.value}{kpi.unit && kpi.unit !== '#' ? kpi.unit : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {getTrendIcon(kpi.trend)}
                        <span className={`text-sm font-medium ${kpi.trend === 'UP' ? 'text-success-600' : kpi.trend === 'DOWN' ? 'text-danger-600' : 'text-[var(--text-muted)]'}`}>
                          {kpi.changePercent != null ? formatPercentage(kpi.changePercent) : ''}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">{kpi.changeDescription || ''}</span>
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusColor(kpi.status)}`}>
                      {getKpiIcon(kpi.icon)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payroll/Headcount Trend */}
          {data.trendCharts?.headcountTrend && data.trendCharts.headcountTrend.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent-500" />
                  Headcount Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ExecutiveHeadcountChart data={data.trendCharts.headcountTrend} />
              </CardContent>
            </Card>
          )}

          {/* Department Distribution */}
          {data.workforceSummary?.byDepartment && data.workforceSummary.byDepartment.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-accent-500" />
                  Department Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ExecutiveDeptPieChart
                  data={data.workforceSummary.byDepartment}
                  colors={COLORS}
                  formatNumber={formatNumber}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Strategic Alerts & Risk Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning-500" />
                  Strategic Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.strategicAlerts && data.strategicAlerts.length > 0 ? (
                    data.strategicAlerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border ${getAlertBgColor(alert.severity)}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.severity)}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-[var(--text-primary)]">{alert.title}</h4>
                          <p className="text-sm text-[var(--text-secondary)] mt-1">{alert.description}</p>
                          {alert.recommendation && (
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                              <span className="font-medium">Recommendation:</span> {alert.recommendation}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              alert.impact === 'HIGH'
                                ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
                                : alert.impact === 'MEDIUM'
                                ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
                                : 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400'
                            }`}
                          >
                            {alert.impact} impact
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-success-500 mx-auto mb-2" />
                      <p className="text-sm text-[var(--text-muted)]">No active alerts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workforce Summary Sidebar */}
          <div className="space-y-4">
            {/* Workforce Overview */}
            {data.workforceSummary && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-accent-500" />
                    Workforce Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Total Headcount</span>
                      <span className="text-lg font-bold text-[var(--text-primary)]">{data.workforceSummary.totalHeadcount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Active Employees</span>
                      <span className="text-lg font-bold text-success-600">{data.workforceSummary.activeEmployees}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">New Hires (Month)</span>
                      <span className="text-lg font-bold text-accent-600">{data.workforceSummary.newHiresThisMonth}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Terminations (Month)</span>
                      <span className="text-lg font-bold text-danger-600">{data.workforceSummary.terminationsThisMonth}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border-main)]">
                      <span className="text-sm font-medium text-[var(--text-secondary)]">Retention Rate</span>
                      <span className="text-xl font-bold text-accent-700">{data.workforceSummary.retentionRate?.toFixed(1) || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Productivity Metrics */}
            {data.productivityMetrics && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5 text-accent-500" />
                    Productivity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Attendance Rate</span>
                      <span className="text-lg font-bold text-success-600">{data.productivityMetrics.avgAttendanceRate?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Performance Rating</span>
                      <span className="text-lg font-bold text-accent-700">{data.productivityMetrics.avgPerformanceRating?.toFixed(1) || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Engagement Score</span>
                      <span className="text-lg font-bold text-accent-600">{data.productivityMetrics.engagementScore?.toFixed(0) || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">eNPS</span>
                      <span className="text-lg font-bold text-warning-600">{data.productivityMetrics.eNPS || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Indicators */}
            {data.riskIndicators && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-danger-500" />
                    Risk Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">High Risk Employees</span>
                      <span className="text-lg font-bold text-danger-600">{data.riskIndicators.highRiskEmployees}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Predicted Attrition</span>
                      <span className="text-lg font-bold text-warning-600">{data.riskIndicators.predictedAttritionRate?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Compliance Issues</span>
                      <span className="text-lg font-bold text-warning-600">{data.riskIndicators.complianceIssuesCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Skill Gaps</span>
                      <span className="text-lg font-bold text-accent-800">{data.riskIndicators.totalSkillGaps}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        {data.financialSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[var(--text-muted)]">Monthly Payroll</p>
                  <DollarSign className="h-5 w-5 text-accent-500" />
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(data.financialSummary.monthlyPayrollCost || 0)}
                </p>
                {data.financialSummary.payrollCostChangePercent != null && (
                  <div className="flex items-center gap-2 mt-2">
                    {data.financialSummary.payrollCostChangePercent >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-danger-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-success-600" />
                    )}
                    <span className={`text-sm ${data.financialSummary.payrollCostChangePercent >= 0 ? 'text-danger-600' : 'text-success-600'}`}>
                      {formatPercentage(data.financialSummary.payrollCostChangePercent)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[var(--text-muted)]">YTD Payroll</p>
                  <Calendar className="h-5 w-5 text-success-500" />
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(data.financialSummary.yearToDatePayrollCost || 0)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Budget: {data.financialSummary.budgetUtilizationPercent?.toFixed(0) || 0}% utilized
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[var(--text-muted)]">Cost/Employee</p>
                  <Users className="h-5 w-5 text-warning-500" />
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(data.financialSummary.avgCostPerEmployee || 0)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Monthly average
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[var(--text-muted)]">Revenue/Employee</p>
                  <TrendingUp className="h-5 w-5 text-accent-500" />
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(data.financialSummary.revenuePerEmployee || 0)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Per month
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
