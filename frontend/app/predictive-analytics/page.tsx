'use client';

import React, {useState} from 'react';
import dynamic from 'next/dynamic';
import {useRouter} from 'next/navigation';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Download,
  GraduationCap,
  Minus,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useOrganizationTrends, usePredictiveDashboard} from '@/lib/hooks/queries/usePredictiveAnalytics';
import {formatCurrency} from '@/lib/utils';
import type {
  AnalyticsInsight,
  AttritionPrediction,
  KeyMetric,
  PredictiveAnalyticsDashboard,
} from '@/lib/types/core/predictive-analytics';

// ─── Lazy-loaded chart components ────────────────────────────────────────────
// Recharts uses browser-only SVG/ResizeObserver APIs — ssr: false required.
// All chart functions live in PredictiveCharts.tsx so the entire recharts
// bundle is excluded from the initial page JS.

const ChartSkeleton = () => (
  <div className="h-[300px] w-full animate-pulse bg-surface-100 dark:bg-surface-800 rounded-lg"/>
);

const AttritionTrendChart = dynamic(
  () => import('./PredictiveCharts').then(m => ({default: m.AttritionTrendChart})),
  {
    ssr: false,
    loading: () => <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-6"><ChartSkeleton/>
    </div>
  }
);
const DepartmentRiskHeatmap = dynamic(
  () => import('./PredictiveCharts').then(m => ({default: m.DepartmentRiskHeatmap})),
  {
    ssr: false,
    loading: () => <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-6"><ChartSkeleton/>
    </div>
  }
);
const TopRiskFactorsChart = dynamic(
  () => import('./PredictiveCharts').then(m => ({default: m.TopRiskFactorsChart})),
  {
    ssr: false,
    loading: () => <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-6"><ChartSkeleton/>
    </div>
  }
);
const HeadcountForecastChart = dynamic(
  () => import('./PredictiveCharts').then(m => ({default: m.HeadcountForecastChart})),
  {
    ssr: false,
    loading: () => <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-6"><ChartSkeleton/>
    </div>
  }
);
const CostProjectionChart = dynamic(
  () => import('./PredictiveCharts').then(m => ({default: m.CostProjectionChart})),
  {
    ssr: false,
    loading: () => <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-6"><ChartSkeleton/>
    </div>
  }
);
const EngagementTrendChart = dynamic(
  () => import('./PredictiveCharts').then(m => ({default: m.EngagementTrendChart})),
  {
    ssr: false,
    loading: () => <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-6"><ChartSkeleton/>
    </div>
  }
);
const PerformanceDistributionChart = dynamic(
  () => import('./PredictiveCharts').then(m => ({default: m.PerformanceDistributionChart})),
  {
    ssr: false,
    loading: () => <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-6"><ChartSkeleton/>
    </div>
  }
);
const FlightRiskRadar = dynamic(
  () => import('./PredictiveCharts').then(m => ({default: m.FlightRiskRadar})),
  {
    ssr: false,
    loading: () => <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-6"><ChartSkeleton/>
    </div>
  }
);
const HiringNeedsByDeptChart = dynamic(
  () => import('./PredictiveCharts').then(m => ({default: m.HiringNeedsByDeptChart})),
  {ssr: false, loading: ChartSkeleton}
);
const EngagementAttritionCorrelationChart = dynamic(
  () => import('./PredictiveCharts').then(m => ({default: m.EngagementAttritionCorrelationChart})),
  {ssr: false, loading: ChartSkeleton}
);
const SkillGapsByCategoryChart = dynamic(
  () => import('./PredictiveCharts').then(m => ({default: m.SkillGapsByCategoryChart})),
  {ssr: false, loading: ChartSkeleton}
);

// ==================== Constants ====================

const RISK_COLORS = {
  CRITICAL: 'var(--chart-danger)',
  HIGH: 'var(--chart-warning)',
  MEDIUM: 'var(--chart-warning)',
  LOW: 'var(--chart-success)',
} as const;

const _STATUS_COLORS = {
  GOOD: 'var(--chart-success)',
  WARNING: 'var(--chart-warning)',
  CRITICAL: 'var(--chart-danger)',
} as const;

const _SEVERITY_COLORS = {
  INFO: 'var(--chart-info)',
  WARNING: 'var(--chart-warning)',
  CRITICAL: 'var(--chart-danger)',
} as const;

// ==================== Sub-components ====================

function TrendIcon({trend}: { trend: 'UP' | 'DOWN' | 'STABLE' }) {
  if (trend === 'UP') return <ArrowUpRight className="h-4 w-4 text-success-500"/>;
  if (trend === 'DOWN') return <ArrowDownRight className="h-4 w-4 text-danger-500"/>;
  return <Minus className="h-4 w-4 text-surface-400"/>;
}

function RiskBadge({level}: { level: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
    HIGH: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    MEDIUM: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    LOW: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || colors.LOW}`}>
      {level}
    </span>
  );
}

function SeverityBadge({severity}: { severity: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
    WARNING: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    INFO: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[severity] || colors.INFO}`}>
      {severity}
    </span>
  );
}

// ==================== Section Components ====================

function AttritionRiskCards({summary}: { summary: PredictiveAnalyticsDashboard['attritionSummary'] }) {
  const riskCards = [
    {
      label: 'Critical Risk',
      count: summary.criticalRiskCount,
      color: 'text-danger-600',
      bg: 'bg-danger-50 dark:bg-danger-950/30',
      icon: <ShieldAlert className="h-5 w-5 text-danger-500"/>
    },
    {
      label: 'High Risk',
      count: summary.highRiskCount,
      color: 'text-warning-600',
      bg: 'bg-warning-50 dark:bg-warning-950/30',
      icon: <AlertTriangle className="h-5 w-5 text-warning-500"/>
    },
    {
      label: 'Medium Risk',
      count: summary.mediumRiskCount,
      color: 'text-warning-600',
      bg: 'bg-warning-50 dark:bg-warning-950/30',
      icon: <AlertCircle className="h-5 w-5 text-warning-500"/>
    },
    {
      label: 'Low Risk',
      count: summary.lowRiskCount,
      color: 'text-success-600',
      bg: 'bg-success-50 dark:bg-success-950/30',
      icon: <UserCheck className="h-5 w-5 text-success-500"/>
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {riskCards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="row-between mb-2">
              <div className={`p-2 rounded-lg ${card.bg}`}>{card.icon}</div>
              <span className={`text-2xl font-bold ${card.color}`}>{card.count}</span>
            </div>
            <p className="text-body-secondary">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// AttritionTrendChart moved to PredictiveCharts.tsx (dynamic import above)

// DepartmentRiskHeatmap moved to PredictiveCharts.tsx (dynamic import above)

// TopRiskFactorsChart moved to PredictiveCharts.tsx (dynamic import above)

// HeadcountForecastChart moved to PredictiveCharts.tsx (dynamic import above)

// CostProjectionChart moved to PredictiveCharts.tsx (dynamic import above)

// EngagementTrendChart moved to PredictiveCharts.tsx (dynamic import above)

// PerformanceDistributionChart moved to PredictiveCharts.tsx (dynamic import above)

function SkillGapsSection({summary}: { summary: PredictiveAnalyticsDashboard['skillGapSummary'] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Skill Gap Summary Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Gap Summary</CardTitle>
          <CardDescription>Workforce capability analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-danger-50 dark:bg-danger-950/20">
                <p className="text-2xl font-bold text-danger-600">{summary.criticalGaps}</p>
                <p className="text-xs text-[var(--text-secondary)]">Critical Gaps</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-warning-50 dark:bg-warning-950/20">
                <p className="text-2xl font-bold text-warning-600">{summary.highPriorityGaps}</p>
                <p className="text-xs text-[var(--text-secondary)]">High Priority</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-accent-50 dark:bg-accent-950/20">
                <p className="text-2xl font-bold text-accent-600">{summary.totalGaps}</p>
                <p className="text-xs text-[var(--text-secondary)]">Total Gaps</p>
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-4">
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Cost to Address</h4>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Training Investment</span>
                <span
                  className="font-medium text-[var(--text-primary)]">{formatCurrency(summary.totalTrainingCostNeeded)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-[var(--text-secondary)]">Hiring Investment</span>
                <span
                  className="font-medium text-[var(--text-primary)]">{formatCurrency(summary.totalHiringCostNeeded)}</span>
              </div>
            </div>

            {/* Top Gaps */}
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Critical Skill Gaps</h4>
              <div className="space-y-2">
                {(summary.topGaps || []).slice(0, 5).map((gap) => (
                  <div key={gap.id} className="row-between p-2 rounded-lg bg-[var(--bg-surface)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{gap.skillName}</p>
                      <p className="text-caption">{gap.departmentName || gap.skillCategory}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">Gap: {gap.gapCount}</span>
                      <RiskBadge level={gap.priority}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown Chart — lazy-loaded from PredictiveCharts.tsx */}
      <Card>
        <CardHeader>
          <CardTitle>Gaps by Category</CardTitle>
          <CardDescription>Skill gap distribution across categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <SkillGapsByCategoryChart summary={summary}/>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KeyMetricsRow({metrics}: { metrics: KeyMetric[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.slice(0, 8).map((metric) => (
        <Card key={metric.name}>
          <CardContent className="p-4">
            <div className="row-between mb-1">
              <p className="text-caption uppercase tracking-wider">{metric.name}</p>
              <TrendIcon trend={metric.trend}/>
            </div>
            <p className="text-xl font-bold text-[var(--text-primary)]">{metric.value}</p>
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`text-xs font-medium ${
                  metric.status === 'GOOD'
                    ? 'text-success-600'
                    : metric.status === 'WARNING'
                      ? 'text-warning-600'
                      : 'text-danger-600'
                }`}
              >
                {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
              </span>
              <span className="text-caption">{metric.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CriticalInsightsPanel({insights, total, pending}: {
  insights: AnalyticsInsight[];
  total: number;
  pending: number
}) {
  return (
    <Card>
      <CardHeader>
        <div className="row-between">
          <div>
            <CardTitle>Critical Insights</CardTitle>
            <CardDescription>
              {total} active insights, {pending} pending action
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400">
              {pending} pending
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.length === 0 && (
            <p className="text-body-muted text-center py-6">No critical insights at this time.</p>
          )}
          {insights.slice(0, 5).map((insight) => (
            <div key={insight.id}
                 className="flex items-start gap-4 p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="mt-0.5">
                {insight.severity === 'CRITICAL' ? (
                  <AlertCircle className="h-5 w-5 text-danger-500"/>
                ) : insight.severity === 'WARNING' ? (
                  <AlertTriangle className="h-5 w-5 text-warning-500"/>
                ) : (
                  <Activity className="h-5 w-5 text-accent-500"/>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{insight.title}</p>
                  <SeverityBadge severity={insight.severity}/>
                </div>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{insight.description}</p>
                {insight.recommendation && (
                  <p className="text-xs text-accent-600 dark:text-accent-400 mt-1 flex items-center gap-1">
                    <Target className="h-3 w-3"/>
                    {insight.recommendation}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-caption">
                  {insight.affectedEmployees > 0 && <span>{insight.affectedEmployees} employees affected</span>}
                  {insight.departmentName && <span>{insight.departmentName}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopAtRiskEmployeesTable({employees}: { employees: AttritionPrediction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top At-Risk Employees</CardTitle>
        <CardDescription>Employees with highest attrition probability</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
            <tr className="divider-b">
              <th className="text-left py-2 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Employee</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Department</th>
              <th className="text-center py-2 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Risk Score
              </th>
              <th className="text-center py-2 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Risk Level
              </th>
              <th className="text-center py-2 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Confidence
              </th>
              <th className="text-left py-2 px-4 text-xs font-medium text-[var(--text-muted)] uppercase">Top Factor</th>
            </tr>
            </thead>
            <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-[var(--text-muted)]">No at-risk employees found.</td>
              </tr>
            )}
            {employees.slice(0, 10).map((emp) => {
              const topFactor = (emp.riskFactors || []).sort((a, b) => b.score - a.score)[0];
              return (
                <tr key={emp.id} className="divider-b hover:bg-[var(--bg-surface)]">
                  <td className="py-2.5 px-4">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{emp.employeeName || 'Unknown'}</p>
                      <p className="text-caption">{emp.jobTitle || '-'}</p>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-[var(--text-secondary)]">{emp.department || '-'}</td>
                  <td className="py-2.5 px-4 text-center">
                      <span className="font-bold"
                            style={{color: RISK_COLORS[emp.riskLevel as keyof typeof RISK_COLORS] || 'var(--chart-muted)'}}>
                        {emp.riskScore?.toFixed(0)}%
                      </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <RiskBadge level={emp.riskLevel}/>
                  </td>
                  <td className="py-2.5 px-4 text-center text-[var(--text-secondary)]">
                    {emp.confidenceScore?.toFixed(0)}%
                  </td>
                  <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                    {topFactor ? topFactor.name : '-'}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// FlightRiskRadar moved to PredictiveCharts.tsx (dynamic import above)

// ==================== Workforce Summary Panel ====================

function WorkforceSummaryPanel({summary}: { summary: PredictiveAnalyticsDashboard['workforceSummary'] }) {
  const trendDirection = summary.headcountTrend?.direction;
  const items = [
    {
      label: 'Current Headcount',
      value: summary.currentHeadcount?.toLocaleString() ?? '-',
      icon: <Users className="h-5 w-5 text-accent-500"/>
    },
    {
      label: 'YTD Hires',
      value: summary.yearToDateHires?.toString() ?? '-',
      icon: <UserCheck className="h-5 w-5 text-success-500"/>
    },
    {
      label: 'YTD Attrition Rate',
      value: `${summary.yearToDateAttritionRate?.toFixed(1) ?? '-'}%`,
      icon: <TrendingDown className="h-5 w-5 text-danger-500"/>
    },
    {
      label: 'Avg Tenure',
      value: `${((summary.avgTenureMonths ?? 0) / 12).toFixed(1)} yrs`,
      icon: <Briefcase className="h-5 w-5 text-warning-500"/>
    },
    {
      label: 'Avg Engagement',
      value: `${summary.avgEngagementScore?.toFixed(1) ?? '-'}/5`,
      icon: <Activity className="h-5 w-5 text-accent-500"/>
    },
    {
      label: 'Open Positions',
      value: summary.openPositions?.toString() ?? '-',
      icon: <Target className="h-5 w-5 text-accent-500"/>
    },
    {
      label: 'Avg Time to Fill',
      value: `${summary.avgTimeToFill?.toFixed(0) ?? '-'} days`,
      icon: <GraduationCap className="h-5 w-5 text-warning-500"/>
    },
    {
      label: 'Headcount Trend',
      value: `${trendDirection === 'UP' ? '+' : trendDirection === 'DOWN' ? '-' : ''}${summary.headcountTrend?.changeCount ?? 0}`,
      icon: trendDirection === 'UP' ? <TrendingUp className="h-5 w-5 text-success-500"/> : trendDirection === 'DOWN' ?
        <TrendingDown className="h-5 w-5 text-danger-500"/> : <Minus className="h-5 w-5 text-surface-400"/>,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-[var(--bg-surface)]">{item.icon}</div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">{item.value}</p>
              <p className="text-caption">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ==================== Main Page ====================

type TabId = 'overview' | 'attrition' | 'workforce' | 'engagement' | 'skills';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4"/>},
  {id: 'attrition', label: 'Attrition Risk', icon: <ShieldAlert className="h-4 w-4"/>},
  {id: 'workforce', label: 'Workforce Planning', icon: <Users className="h-4 w-4"/>},
  {id: 'engagement', label: 'Engagement & Performance', icon: <Target className="h-4 w-4"/>},
  {id: 'skills', label: 'Skill Gaps', icon: <GraduationCap className="h-4 w-4"/>},
];

export default function PredictiveAnalyticsPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasPermission, isReady: permReady} = usePermissions();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedYear] = useState(new Date().getFullYear());

  const {data: dashboard, isLoading, error, refetch} = usePredictiveDashboard(isAuthenticated && hasHydrated);
  const {data: orgTrends} = useOrganizationTrends(selectedYear, isAuthenticated && hasHydrated);

  React.useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  // RBAC guard — predictive analytics requires REPORT_VIEW permission (DEF-53)
  React.useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.REPORT_VIEW)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  // RBAC guard — block render for unauthorized users (DEF-53)
  if (!permReady || !hasPermission(Permissions.REPORT_VIEW)) {
    return null;
  }

  // Loading state
  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin"/>
          <p className="text-[var(--text-muted)] font-medium">Loading predictive analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !dashboard) {
    return (
      <AppLayout activeMenuItem="predictive-analytics">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-4 text-danger-600">
                <AlertCircle className="h-6 w-6"/>
                <CardTitle>Error Loading Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p
                className="text-[var(--text-secondary)] mb-4">{error?.message || 'Unable to load predictive analytics data'}</p>
              <Button variant="primary" onClick={() => refetch()} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const trends = orgTrends || dashboard.monthlyTrends || [];
  const attritionSummary = dashboard.attritionSummary;
  const workforceSummary = dashboard.workforceSummary;
  const skillGapSummary = dashboard.skillGapSummary;

  return (
    <AppLayout activeMenuItem="predictive-analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Predictive Analytics
            </h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
              AI-powered workforce insights and predictions
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Export buttons wired up once backend PDF/Excel export endpoints are available */}
            <Button variant="outline" size="sm" disabled title="Export coming soon"
                    className="opacity-50 cursor-not-allowed">
              <Download className="h-4 w-4 mr-1"/>
              Export PDF
            </Button>
            <Button variant="outline" size="sm" disabled title="Export coming soon"
                    className="opacity-50 cursor-not-allowed">
              <Download className="h-4 w-4 mr-1"/>
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1"/>
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex items-center bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-accent-700 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ==================== Overview Tab ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            {dashboard.keyMetrics && dashboard.keyMetrics.length > 0 && (
              <KeyMetricsRow metrics={dashboard.keyMetrics}/>
            )}

            {/* Attrition Risk Cards */}
            <AttritionRiskCards summary={attritionSummary}/>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AttritionTrendChart trends={trends}/>
              <HeadcountForecastChart trends={trends} summary={workforceSummary}/>
            </div>

            {/* Insights + At Risk Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CriticalInsightsPanel
                insights={dashboard.criticalInsights || []}
                total={dashboard.totalActiveInsights ?? 0}
                pending={dashboard.pendingActionItems ?? 0}
              />
              <TopAtRiskEmployeesTable employees={attritionSummary.topAtRiskEmployees || []}/>
            </div>
          </div>
        )}

        {/* ==================== Attrition Tab ==================== */}
        {activeTab === 'attrition' && (
          <div className="space-y-6">
            <AttritionRiskCards summary={attritionSummary}/>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p
                    className="text-3xl font-bold text-[var(--text-primary)]">{attritionSummary.avgRiskScore?.toFixed(1) ?? '-'}</p>
                  <p className="text-body-muted">Avg Risk Score</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p
                    className="text-3xl font-bold text-danger-600">{attritionSummary.predictedAttritionRate?.toFixed(1) ?? '-'}%</p>
                  <p className="text-body-muted">Predicted Attrition Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p
                    className="text-3xl font-bold text-accent-600">{attritionSummary.totalEmployees?.toLocaleString() ?? '-'}</p>
                  <p className="text-body-muted">Total Employees Analyzed</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AttritionTrendChart trends={trends}/>
              <DepartmentRiskHeatmap departmentRisks={attritionSummary.departmentRisks || []}/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopRiskFactorsChart employees={attritionSummary.topAtRiskEmployees || []}/>
              <FlightRiskRadar employees={attritionSummary.topAtRiskEmployees || []}/>
            </div>

            <TopAtRiskEmployeesTable employees={attritionSummary.topAtRiskEmployees || []}/>
          </div>
        )}

        {/* ==================== Workforce Planning Tab ==================== */}
        {activeTab === 'workforce' && (
          <div className="space-y-6">
            <WorkforceSummaryPanel summary={workforceSummary}/>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HeadcountForecastChart trends={trends} summary={workforceSummary}/>
              <CostProjectionChart trends={trends}/>
            </div>

            {/* Hiring Needs by Department */}
            <Card>
              <CardHeader>
                <CardTitle>Hiring Needs by Department</CardTitle>
                <CardDescription>Open positions and time-to-fill analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <HiringNeedsByDeptChart departmentRisks={attritionSummary.departmentRisks || []}/>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== Engagement & Performance Tab ==================== */}
        {activeTab === 'engagement' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p
                    className="text-3xl font-bold text-accent-600">{workforceSummary.avgEngagementScore?.toFixed(1) ?? '-'}</p>
                  <p className="text-body-muted">Avg Engagement (out of 5)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p
                    className="text-3xl font-bold text-success-600">{workforceSummary.avgPerformanceRating?.toFixed(1) ?? '-'}</p>
                  <p className="text-body-muted">Avg Performance Rating</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-accent-600">
                    {trends.length > 0 ? (trends[trends.length - 1].highPerformersCount ?? 0) : '-'}
                  </p>
                  <p className="text-body-muted">High Performers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-warning-600">
                    {trends.length > 0 ? (trends[trends.length - 1].lowPerformersCount ?? 0) : '-'}
                  </p>
                  <p className="text-body-muted">Needs Improvement</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EngagementTrendChart trends={trends}/>
              <PerformanceDistributionChart trends={trends}/>
            </div>

            {/* Engagement vs Attrition Correlation */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement vs Attrition Correlation</CardTitle>
                <CardDescription>Monthly engagement scores plotted against attrition rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <EngagementAttritionCorrelationChart trends={trends}/>
                </div>
              </CardContent>
            </Card>

            {/* Flight Risk Indicators from Insights */}
            <CriticalInsightsPanel
              insights={(dashboard.criticalInsights || []).filter(
                (i) => i.category === 'ENGAGEMENT' || i.category === 'PERFORMANCE' || i.category === 'ATTRITION'
              )}
              total={dashboard.totalActiveInsights ?? 0}
              pending={dashboard.pendingActionItems ?? 0}
            />
          </div>
        )}

        {/* ==================== Skill Gaps Tab ==================== */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <SkillGapsSection summary={skillGapSummary}/>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
