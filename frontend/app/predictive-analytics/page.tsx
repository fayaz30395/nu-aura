'use client';

import React, { useState, useMemo } from 'react';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Download,
  ShieldAlert,
  Activity,
  Target,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  UserCheck,
  GraduationCap,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePredictiveDashboard, useOrganizationTrends } from '@/lib/hooks/queries/usePredictiveAnalytics';
import { chartColors } from '@/lib/utils/theme-colors';
import { formatCurrency } from '@/lib/utils';
import type {
  PredictiveAnalyticsDashboard,
  AttritionPrediction,
  WorkforceTrend,
  AnalyticsInsight,
  SkillGap,
  DepartmentRisk,
  KeyMetric,
} from '@/lib/types/predictive-analytics';

// ==================== Constants ====================

const RISK_COLORS = {
  CRITICAL: '#dc2626',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#16a34a',
} as const;

const STATUS_COLORS = {
  GOOD: '#16a34a',
  WARNING: '#f59e0b',
  CRITICAL: '#dc2626',
} as const;

const SEVERITY_COLORS = {
  INFO: '#0284c7',
  WARNING: '#f59e0b',
  CRITICAL: '#dc2626',
} as const;

// ==================== Tooltip ====================

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

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-input)] p-4 rounded-lg shadow-lg border border-[var(--border-main)]">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ==================== Sub-components ====================

function TrendIcon({ trend }: { trend: 'UP' | 'DOWN' | 'STABLE' }) {
  if (trend === 'UP') return <ArrowUpRight className="h-4 w-4 text-success-500" />;
  if (trend === 'DOWN') return <ArrowDownRight className="h-4 w-4 text-danger-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
    HIGH: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    MEDIUM: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    LOW: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || colors.LOW}`}>
      {level}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
    WARNING: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    INFO: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[severity] || colors.INFO}`}>
      {severity}
    </span>
  );
}

// ==================== Section Components ====================

function AttritionRiskCards({ summary }: { summary: PredictiveAnalyticsDashboard['attritionSummary'] }) {
  const riskCards = [
    { label: 'Critical Risk', count: summary.criticalRiskCount, color: 'text-danger-600', bg: 'bg-danger-50 dark:bg-danger-950/30', icon: <ShieldAlert className="h-5 w-5 text-danger-500" /> },
    { label: 'High Risk', count: summary.highRiskCount, color: 'text-warning-600', bg: 'bg-warning-50 dark:bg-warning-950/30', icon: <AlertTriangle className="h-5 w-5 text-warning-500" /> },
    { label: 'Medium Risk', count: summary.mediumRiskCount, color: 'text-warning-600', bg: 'bg-warning-50 dark:bg-warning-950/30', icon: <AlertCircle className="h-5 w-5 text-warning-500" /> },
    { label: 'Low Risk', count: summary.lowRiskCount, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-950/30', icon: <UserCheck className="h-5 w-5 text-success-500" /> },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {riskCards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${card.bg}`}>{card.icon}</div>
              <span className={`text-2xl font-bold ${card.color}`}>{card.count}</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AttritionTrendChart({ trends }: { trends: WorkforceTrend[] }) {
  const chartData = useMemo(
    () =>
      trends.map((t) => ({
        label: t.periodLabel,
        attritionRate: t.attritionRate ?? 0,
        voluntaryRate: t.voluntaryAttritionRate ?? 0,
        hiringRate: t.hiringRate ?? 0,
      })),
    [trends]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attrition & Hiring Trends</CardTitle>
        <CardDescription>Monthly attrition vs hiring rate over the past year</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="attritionRate" name="Total Attrition %" stroke="#dc2626" fill="#dc262620" strokeWidth={2} />
              <Area type="monotone" dataKey="voluntaryRate" name="Voluntary %" stroke="#f97316" fill="#f9731620" strokeWidth={2} />
              <Area type="monotone" dataKey="hiringRate" name="Hiring Rate %" stroke="#16a34a" fill="#16a34a20" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function DepartmentRiskHeatmap({ departmentRisks }: { departmentRisks: DepartmentRisk[] }) {
  const chartData = useMemo(
    () =>
      departmentRisks
        .sort((a, b) => b.avgRiskScore - a.avgRiskScore)
        .map((d) => ({
          name: d.departmentName.length > 15 ? d.departmentName.slice(0, 15) + '...' : d.departmentName,
          fullName: d.departmentName,
          riskScore: d.avgRiskScore ?? 0,
          atRisk: d.atRiskCount ?? 0,
          total: d.employeeCount ?? 0,
          riskPct: d.riskPercentage ?? 0,
        })),
    [departmentRisks]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Risk Overview</CardTitle>
        <CardDescription>Average risk score by department</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="riskScore" name="Avg Risk Score" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.riskScore >= 70
                        ? RISK_COLORS.CRITICAL
                        : entry.riskScore >= 50
                          ? RISK_COLORS.HIGH
                          : entry.riskScore >= 30
                            ? RISK_COLORS.MEDIUM
                            : RISK_COLORS.LOW
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function TopRiskFactorsChart({ employees }: { employees: AttritionPrediction[] }) {
  const factorData = useMemo(() => {
    const factorMap = new Map<string, { total: number; count: number }>();
    employees.forEach((emp) => {
      (emp.riskFactors || []).forEach((f) => {
        const existing = factorMap.get(f.name) || { total: 0, count: 0 };
        factorMap.set(f.name, { total: existing.total + f.score, count: existing.count + 1 });
      });
    });
    return Array.from(factorMap.entries())
      .map(([name, { total, count }]) => ({ name, avgScore: Math.round(total / count) }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [employees]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Risk Factors</CardTitle>
        <CardDescription>Average impact score across at-risk employees</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={factorData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgScore" name="Avg Impact Score" fill={chartColors.danger()} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function HeadcountForecastChart({ trends, summary }: { trends: WorkforceTrend[]; summary: PredictiveAnalyticsDashboard['workforceSummary'] }) {
  const chartData = useMemo(() => {
    const historical = trends.map((t) => ({
      label: t.periodLabel,
      headcount: t.totalHeadcount ?? 0,
      hires: t.newHires ?? 0,
      terminations: t.terminations ?? 0,
      type: 'actual' as 'actual' | 'forecast',
    }));

    // Project 6 months forward using average growth rate
    const lastHeadcount = historical.length > 0 ? historical[historical.length - 1].headcount : summary.currentHeadcount;
    const avgGrowth = trends.length > 1
      ? trends.reduce((sum, t) => sum + (t.growthRate ?? 0), 0) / trends.length
      : 0;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const lastTrend = trends[trends.length - 1];
    const startMonth = lastTrend ? lastTrend.periodMonth : new Date().getMonth() + 1;
    const startYear = lastTrend ? lastTrend.periodYear : new Date().getFullYear();

    const forecast: typeof historical = [];
    let projected = lastHeadcount;
    for (let i = 1; i <= 6; i++) {
      const m = ((startMonth - 1 + i) % 12);
      const y = startYear + Math.floor((startMonth - 1 + i) / 12);
      projected = Math.round(projected * (1 + avgGrowth / 100));
      forecast.push({
        label: `${months[m]} ${y} (F)`,
        headcount: projected,
        hires: 0,
        terminations: 0,
        type: 'forecast',
      });
    }

    return [...historical, ...forecast];
  }, [trends, summary]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Headcount Forecast</CardTitle>
        <CardDescription>Historical headcount with 6-month projection</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="headcount"
                name="Headcount"
                stroke={chartColors.primary()}
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray={undefined}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function CostProjectionChart({ trends }: { trends: WorkforceTrend[] }) {
  const chartData = useMemo(
    () =>
      trends.map((t) => ({
        label: t.periodLabel,
        totalComp: t.totalCompensation ?? 0,
        avgSalary: t.avgSalary ?? 0,
        costPerHire: t.costPerHire ?? 0,
        trainingCost: t.trainingCost ?? 0,
      })),
    [trends]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Projections</CardTitle>
        <CardDescription>Compensation, hiring, and training cost trends</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="costPerHire" name="Cost/Hire" fill={chartColors.primary()} radius={[4, 4, 0, 0]} />
              <Bar dataKey="trainingCost" name="Training Cost" fill={chartColors.success()} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function EngagementTrendChart({ trends }: { trends: WorkforceTrend[] }) {
  const chartData = useMemo(
    () =>
      trends.map((t) => ({
        label: t.periodLabel,
        engagement: t.avgEngagementScore ?? 0,
        performance: t.avgPerformanceRating ?? 0,
      })),
    [trends]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement & Performance Trends</CardTitle>
        <CardDescription>Average engagement and performance scores over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="engagement" name="Engagement Score" stroke={chartColors.primary()} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="performance" name="Performance Rating" stroke={chartColors.success()} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceDistributionChart({ trends }: { trends: WorkforceTrend[] }) {
  // Use the latest trend to show current performance distribution
  const latest = trends[trends.length - 1];
  const total = latest ? (latest.totalHeadcount ?? 0) : 0;
  const high = latest ? (latest.highPerformersCount ?? 0) : 0;
  const low = latest ? (latest.lowPerformersCount ?? 0) : 0;
  const mid = Math.max(0, total - high - low);

  const pieData = [
    { name: 'High Performers', value: high, color: '#16a34a' },
    { name: 'Average', value: mid, color: '#0284c7' },
    { name: 'Below Expectations', value: low, color: '#dc2626' },
  ].filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Distribution</CardTitle>
        <CardDescription>Current workforce performance breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function SkillGapsSection({ summary }: { summary: PredictiveAnalyticsDashboard['skillGapSummary'] }) {
  const categoryData = useMemo(
    () =>
      (summary.gapsByCategory || []).map((c) => ({
        category: c.category,
        gaps: c.gapCount,
        severity: c.avgSeverity ?? 0,
      })),
    [summary]
  );

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
              <div className="text-center p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20">
                <p className="text-2xl font-bold text-danger-600">{summary.criticalGaps}</p>
                <p className="text-xs text-[var(--text-secondary)]">Critical Gaps</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-warning-50 dark:bg-warning-950/20">
                <p className="text-2xl font-bold text-warning-600">{summary.highPriorityGaps}</p>
                <p className="text-xs text-[var(--text-secondary)]">High Priority</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-accent-50 dark:bg-accent-950/20">
                <p className="text-2xl font-bold text-accent-600">{summary.totalGaps}</p>
                <p className="text-xs text-[var(--text-secondary)]">Total Gaps</p>
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-4">
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Cost to Address</h4>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Training Investment</span>
                <span className="font-medium text-[var(--text-primary)]">{formatCurrency(summary.totalTrainingCostNeeded)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-[var(--text-secondary)]">Hiring Investment</span>
                <span className="font-medium text-[var(--text-primary)]">{formatCurrency(summary.totalHiringCostNeeded)}</span>
              </div>
            </div>

            {/* Top Gaps */}
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Critical Skill Gaps</h4>
              <div className="space-y-2">
                {(summary.topGaps || []).slice(0, 5).map((gap) => (
                  <div key={gap.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{gap.skillName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{gap.departmentName || gap.skillCategory}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">Gap: {gap.gapCount}</span>
                      <RiskBadge level={gap.priority} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Gaps by Category</CardTitle>
          <CardDescription>Skill gap distribution across categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gaps" name="Gap Count" fill={chartColors.warning()} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KeyMetricsRow({ metrics }: { metrics: KeyMetric[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.slice(0, 8).map((metric) => (
        <Card key={metric.name}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{metric.name}</p>
              <TrendIcon trend={metric.trend} />
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
              <span className="text-xs text-[var(--text-muted)]">{metric.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CriticalInsightsPanel({ insights, total, pending }: { insights: AnalyticsInsight[]; total: number; pending: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Critical Insights</CardTitle>
            <CardDescription>
              {total} active insights, {pending} pending action
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400">
              {pending} pending
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] text-center py-6">No critical insights at this time.</p>
          )}
          {insights.slice(0, 5).map((insight) => (
            <div key={insight.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="mt-0.5">
                {insight.severity === 'CRITICAL' ? (
                  <AlertCircle className="h-5 w-5 text-danger-500" />
                ) : insight.severity === 'WARNING' ? (
                  <AlertTriangle className="h-5 w-5 text-warning-500" />
                ) : (
                  <Activity className="h-5 w-5 text-accent-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{insight.title}</p>
                  <SeverityBadge severity={insight.severity} />
                </div>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{insight.description}</p>
                {insight.recommendation && (
                  <p className="text-xs text-accent-600 dark:text-accent-400 mt-1 flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {insight.recommendation}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
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

function TopAtRiskEmployeesTable({ employees }: { employees: AttritionPrediction[] }) {
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
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-muted)] uppercase">Employee</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-muted)] uppercase">Department</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-[var(--text-muted)] uppercase">Risk Score</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-[var(--text-muted)] uppercase">Risk Level</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-[var(--text-muted)] uppercase">Confidence</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-muted)] uppercase">Top Factor</th>
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
                  <tr key={emp.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]">
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{emp.employeeName || 'Unknown'}</p>
                        <p className="text-xs text-[var(--text-muted)]">{emp.jobTitle || '-'}</p>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">{emp.department || '-'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold" style={{ color: RISK_COLORS[emp.riskLevel as keyof typeof RISK_COLORS] || '#64748b' }}>
                        {emp.riskScore?.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <RiskBadge level={emp.riskLevel} />
                    </td>
                    <td className="py-2.5 px-3 text-center text-[var(--text-secondary)]">
                      {emp.confidenceScore?.toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">
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

function FlightRiskRadar({ employees }: { employees: AttritionPrediction[] }) {
  // Aggregate risk factors across top at-risk employees for radar visualization
  const radarData = useMemo(() => {
    const factorMap = new Map<string, number[]>();
    employees.forEach((emp) => {
      (emp.riskFactors || []).forEach((f) => {
        const arr = factorMap.get(f.name) || [];
        arr.push(f.score);
        factorMap.set(f.name, arr);
      });
    });
    return Array.from(factorMap.entries()).map(([name, scores]) => ({
      factor: name,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
  }, [employees]);

  if (radarData.length < 3) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flight Risk Profile</CardTitle>
        <CardDescription>Aggregate risk factor analysis for at-risk employees</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke={chartColors.grid()} />
              <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Radar name="Risk Score" dataKey="score" stroke={chartColors.danger()} fill={chartColors.danger()} fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Workforce Summary Panel ====================

function WorkforceSummaryPanel({ summary }: { summary: PredictiveAnalyticsDashboard['workforceSummary'] }) {
  const trendDirection = summary.headcountTrend?.direction;
  const items = [
    { label: 'Current Headcount', value: summary.currentHeadcount?.toLocaleString() ?? '-', icon: <Users className="h-5 w-5 text-accent-500" /> },
    { label: 'YTD Hires', value: summary.yearToDateHires?.toString() ?? '-', icon: <UserCheck className="h-5 w-5 text-success-500" /> },
    { label: 'YTD Attrition Rate', value: `${summary.yearToDateAttritionRate?.toFixed(1) ?? '-'}%`, icon: <TrendingDown className="h-5 w-5 text-danger-500" /> },
    { label: 'Avg Tenure', value: `${((summary.avgTenureMonths ?? 0) / 12).toFixed(1)} yrs`, icon: <Briefcase className="h-5 w-5 text-warning-500" /> },
    { label: 'Avg Engagement', value: `${summary.avgEngagementScore?.toFixed(1) ?? '-'}/5`, icon: <Activity className="h-5 w-5 text-accent-500" /> },
    { label: 'Open Positions', value: summary.openPositions?.toString() ?? '-', icon: <Target className="h-5 w-5 text-accent-500" /> },
    { label: 'Avg Time to Fill', value: `${summary.avgTimeToFill?.toFixed(0) ?? '-'} days`, icon: <GraduationCap className="h-5 w-5 text-warning-500" /> },
    {
      label: 'Headcount Trend',
      value: `${trendDirection === 'UP' ? '+' : trendDirection === 'DOWN' ? '-' : ''}${summary.headcountTrend?.changeCount ?? 0}`,
      icon: trendDirection === 'UP' ? <TrendingUp className="h-5 w-5 text-success-500" /> : trendDirection === 'DOWN' ? <TrendingDown className="h-5 w-5 text-danger-500" /> : <Minus className="h-5 w-5 text-gray-400" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--bg-surface)]">{item.icon}</div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">{item.value}</p>
              <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
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
  { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
  { id: 'attrition', label: 'Attrition Risk', icon: <ShieldAlert className="h-4 w-4" /> },
  { id: 'workforce', label: 'Workforce Planning', icon: <Users className="h-4 w-4" /> },
  { id: 'engagement', label: 'Engagement & Performance', icon: <Target className="h-4 w-4" /> },
  { id: 'skills', label: 'Skill Gaps', icon: <GraduationCap className="h-4 w-4" /> },
];

export default function PredictiveAnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedYear] = useState(new Date().getFullYear());

  const { data: dashboard, isLoading, error, refetch } = usePredictiveDashboard(isAuthenticated && hasHydrated);
  const { data: orgTrends } = useOrganizationTrends(selectedYear, isAuthenticated && hasHydrated);

  React.useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Loading state
  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
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
                <AlertCircle className="h-6 w-6" />
                <CardTitle>Error Loading Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--text-secondary)] mb-4">{error?.message || 'Unable to load predictive analytics data'}</p>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Predictive Analytics
            </h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
              AI-powered workforce insights and predictions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* TODO: Wire up export when backend PDF/Excel export endpoints are available */}
            <Button variant="outline" size="sm" onClick={() => { /* TODO: exportToPdf */ }}>
              <Download className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => { /* TODO: exportToExcel */ }}>
              <Download className="h-4 w-4 mr-1" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] p-1 overflow-x-auto">
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
              <KeyMetricsRow metrics={dashboard.keyMetrics} />
            )}

            {/* Attrition Risk Cards */}
            <AttritionRiskCards summary={attritionSummary} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AttritionTrendChart trends={trends} />
              <HeadcountForecastChart trends={trends} summary={workforceSummary} />
            </div>

            {/* Insights + At Risk Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CriticalInsightsPanel
                insights={dashboard.criticalInsights || []}
                total={dashboard.totalActiveInsights ?? 0}
                pending={dashboard.pendingActionItems ?? 0}
              />
              <TopAtRiskEmployeesTable employees={attritionSummary.topAtRiskEmployees || []} />
            </div>
          </div>
        )}

        {/* ==================== Attrition Tab ==================== */}
        {activeTab === 'attrition' && (
          <div className="space-y-6">
            <AttritionRiskCards summary={attritionSummary} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-[var(--text-primary)]">{attritionSummary.avgRiskScore?.toFixed(1) ?? '-'}</p>
                  <p className="text-sm text-[var(--text-muted)]">Avg Risk Score</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-danger-600">{attritionSummary.predictedAttritionRate?.toFixed(1) ?? '-'}%</p>
                  <p className="text-sm text-[var(--text-muted)]">Predicted Attrition Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-accent-600">{attritionSummary.totalEmployees?.toLocaleString() ?? '-'}</p>
                  <p className="text-sm text-[var(--text-muted)]">Total Employees Analyzed</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AttritionTrendChart trends={trends} />
              <DepartmentRiskHeatmap departmentRisks={attritionSummary.departmentRisks || []} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopRiskFactorsChart employees={attritionSummary.topAtRiskEmployees || []} />
              <FlightRiskRadar employees={attritionSummary.topAtRiskEmployees || []} />
            </div>

            <TopAtRiskEmployeesTable employees={attritionSummary.topAtRiskEmployees || []} />
          </div>
        )}

        {/* ==================== Workforce Planning Tab ==================== */}
        {activeTab === 'workforce' && (
          <div className="space-y-6">
            <WorkforceSummaryPanel summary={workforceSummary} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HeadcountForecastChart trends={trends} summary={workforceSummary} />
              <CostProjectionChart trends={trends} />
            </div>

            {/* Hiring Needs by Department */}
            <Card>
              <CardHeader>
                <CardTitle>Hiring Needs by Department</CardTitle>
                <CardDescription>Open positions and time-to-fill analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(attritionSummary.departmentRisks || []).map((d) => ({
                        name: d.departmentName.length > 12 ? d.departmentName.slice(0, 12) + '...' : d.departmentName,
                        atRisk: d.atRiskCount,
                        total: d.employeeCount,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="total" name="Total Employees" fill={chartColors.primary()} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="atRisk" name="At Risk" fill={chartColors.danger()} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                  <p className="text-3xl font-bold text-accent-600">{workforceSummary.avgEngagementScore?.toFixed(1) ?? '-'}</p>
                  <p className="text-sm text-[var(--text-muted)]">Avg Engagement (out of 5)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-success-600">{workforceSummary.avgPerformanceRating?.toFixed(1) ?? '-'}</p>
                  <p className="text-sm text-[var(--text-muted)]">Avg Performance Rating</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-accent-600">
                    {trends.length > 0 ? (trends[trends.length - 1].highPerformersCount ?? 0) : '-'}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">High Performers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-warning-600">
                    {trends.length > 0 ? (trends[trends.length - 1].lowPerformersCount ?? 0) : '-'}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">Needs Improvement</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EngagementTrendChart trends={trends} />
              <PerformanceDistributionChart trends={trends} />
            </div>

            {/* Engagement vs Attrition Correlation */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement vs Attrition Correlation</CardTitle>
                <CardDescription>Monthly engagement scores plotted against attrition rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends.map((t) => ({
                      label: t.periodLabel,
                      engagement: t.avgEngagementScore ?? 0,
                      attrition: t.attritionRate ?? 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                      <YAxis yAxisId="left" domain={[0, 5]} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} label={{ value: 'Engagement', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-muted)', fontSize: 11 } }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}%`} label={{ value: 'Attrition %', angle: 90, position: 'insideRight', style: { fill: 'var(--text-muted)', fontSize: 11 } }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="engagement" name="Engagement" stroke={chartColors.primary()} strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="attrition" name="Attrition %" stroke={chartColors.danger()} strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
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
            <SkillGapsSection summary={skillGapSummary} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
