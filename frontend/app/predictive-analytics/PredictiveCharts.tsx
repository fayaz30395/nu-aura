'use client';

/**
 * PredictiveCharts — all recharts-based chart components for the Predictive Analytics page.
 *
 * Kept in a separate file so next/dynamic can code-split the entire recharts bundle
 * away from the initial page JS. Only loaded client-side (ssr: false).
 */

import { useMemo } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { chartColors } from '@/lib/utils/theme-colors';
import type {
  PredictiveAnalyticsDashboard,
  AttritionPrediction,
  WorkforceTrend,
} from '@/lib/types/core/predictive-analytics';

// ─── Shared tooltip ───────────────────────────────────────────────────────────

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
      <div className="bg-[var(--bg-input)] p-4 rounded-lg shadow-[var(--shadow-dropdown)] border border-[var(--border-main)]">
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

// ─── Attrition Trend ──────────────────────────────────────────────────────────

interface AttritionTrendChartProps {
  trends: WorkforceTrend[];
}

export function AttritionTrendChart({ trends }: AttritionTrendChartProps) {
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
        <CardTitle>Attrition &amp; Hiring Trends</CardTitle>
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
              <Area type="monotone" dataKey="attritionRate" name="Total Attrition %" stroke="var(--chart-danger)" fill="var(--chart-danger)" fillOpacity={0.125} strokeWidth={2} />
              <Area type="monotone" dataKey="voluntaryRate" name="Voluntary %" stroke="var(--chart-warning)" fill="var(--chart-warning)" fillOpacity={0.125} strokeWidth={2} />
              <Area type="monotone" dataKey="hiringRate" name="Hiring Rate %" stroke="var(--chart-success)" fill="var(--chart-success)" fillOpacity={0.125} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Department Risk Heatmap ───────────────────────────────────────────────────

const RISK_COLORS = {
  CRITICAL: 'var(--chart-danger)',
  HIGH: 'var(--chart-warning)',
  MEDIUM: 'var(--chart-warning)',
  LOW: 'var(--chart-success)',
} as const;

interface DepartmentRiskHeatmapProps {
  departmentRisks: PredictiveAnalyticsDashboard['attritionSummary']['departmentRisks'];
}

export function DepartmentRiskHeatmap({ departmentRisks }: DepartmentRiskHeatmapProps) {
  const chartData = useMemo(
    () =>
      (departmentRisks || [])
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

// ─── Top Risk Factors ─────────────────────────────────────────────────────────

interface TopRiskFactorsChartProps {
  employees: AttritionPrediction[];
}

export function TopRiskFactorsChart({ employees }: TopRiskFactorsChartProps) {
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

// ─── Headcount Forecast ───────────────────────────────────────────────────────

interface HeadcountForecastChartProps {
  trends: WorkforceTrend[];
  summary: PredictiveAnalyticsDashboard['workforceSummary'];
}

export function HeadcountForecastChart({ trends, summary }: HeadcountForecastChartProps) {
  const chartData = useMemo(() => {
    const historical = trends.map((t) => ({
      label: t.periodLabel,
      headcount: t.totalHeadcount ?? 0,
      hires: t.newHires ?? 0,
      terminations: t.terminations ?? 0,
      type: 'actual' as string,
    }));

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
      forecast.push({ label: `${months[m]} ${y} (F)`, headcount: projected, hires: 0, terminations: 0, type: 'forecast' as string });
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
              <Line type="monotone" dataKey="headcount" name="Headcount" stroke={chartColors.primary()} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Cost Projection ──────────────────────────────────────────────────────────

interface CostProjectionChartProps {
  trends: WorkforceTrend[];
}

export function CostProjectionChart({ trends }: CostProjectionChartProps) {
  const chartData = useMemo(
    () =>
      trends.map((t) => ({
        label: t.periodLabel,
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

// ─── Engagement Trend ─────────────────────────────────────────────────────────

interface EngagementTrendChartProps {
  trends: WorkforceTrend[];
}

export function EngagementTrendChart({ trends }: EngagementTrendChartProps) {
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
        <CardTitle>Engagement &amp; Performance Trends</CardTitle>
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

// ─── Performance Distribution ─────────────────────────────────────────────────

interface PerformanceDistributionChartProps {
  trends: WorkforceTrend[];
}

export function PerformanceDistributionChart({ trends }: PerformanceDistributionChartProps) {
  const latest = trends[trends.length - 1];
  const total = latest ? (latest.totalHeadcount ?? 0) : 0;
  const high = latest ? (latest.highPerformersCount ?? 0) : 0;
  const low = latest ? (latest.lowPerformersCount ?? 0) : 0;
  const mid = Math.max(0, total - high - low);

  const pieData = [
    { name: 'High Performers', value: high, color: 'var(--chart-success)' },
    { name: 'Average', value: mid, color: 'var(--chart-primary)' },
    { name: 'Below Expectations', value: low, color: 'var(--chart-danger)' },
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
                // @ts-expect-error recharts Pie label typing is incomplete for custom render functions
                label={(props: Record<string, unknown>) => `${props.name} ${(Number(props.percent) * 100).toFixed(0)}%`}
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

// ─── Flight Risk Radar ────────────────────────────────────────────────────────

interface FlightRiskRadarProps {
  employees: AttritionPrediction[];
}

export function FlightRiskRadar({ employees }: FlightRiskRadarProps) {
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

// ─── Hiring Needs by Department (inline in workforce tab) ─────────────────────

interface HiringNeedsByDeptChartProps {
  departmentRisks: PredictiveAnalyticsDashboard['attritionSummary']['departmentRisks'];
}

export function HiringNeedsByDeptChart({ departmentRisks }: HiringNeedsByDeptChartProps) {
  const data = (departmentRisks || []).map((d) => ({
    name: d.departmentName.length > 12 ? d.departmentName.slice(0, 12) + '...' : d.departmentName,
    atRisk: d.atRiskCount,
    total: d.employeeCount,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="total" name="Total Employees" fill={chartColors.primary()} radius={[4, 4, 0, 0]} />
        <Bar dataKey="atRisk" name="At Risk" fill={chartColors.danger()} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Engagement vs Attrition Correlation ─────────────────────────────────────

interface EngagementAttritionCorrelationChartProps {
  trends: WorkforceTrend[];
}

export function EngagementAttritionCorrelationChart({ trends }: EngagementAttritionCorrelationChartProps) {
  const data = trends.map((t) => ({
    label: t.periodLabel,
    engagement: t.avgEngagementScore ?? 0,
    attrition: t.attritionRate ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
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
  );
}

// ─── Skill Gaps by Category ───────────────────────────────────────────────────

interface SkillGapsByCategoryChartProps {
  summary: PredictiveAnalyticsDashboard['skillGapSummary'];
}

export function SkillGapsByCategoryChart({ summary }: SkillGapsByCategoryChartProps) {
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
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={categoryData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid()} />
        <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
        <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="gaps" name="Gap Count" fill={chartColors.warning()} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
