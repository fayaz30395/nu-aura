'use client';

import React, {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Award,
  Clock,
  Download,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import {ChartLoadingFallback} from '@/lib/utils/lazy-components';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {useOrganizationHealth} from '@/lib/hooks/queries/useAnalytics';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {chartColors} from '@/lib/utils/theme-colors';
import {Stat} from '@/components/ui/Stat';

const RetentionSparkline = dynamic(
  () => import('./OrgHealthCharts').then((mod) => ({default: mod.RetentionSparkline})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const EngagementSparkline = dynamic(
  () => import('./OrgHealthCharts').then((mod) => ({default: mod.EngagementSparkline})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const GenderPieChart = dynamic(
  () => import('./OrgHealthCharts').then((mod) => ({default: mod.GenderPieChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);
const TenureBarChart = dynamic(
  () => import('./OrgHealthCharts').then((mod) => ({default: mod.TenureBarChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

const COLORS = chartColors.palette();

export default function OrganizationHealthPage() {
  const router = useRouter();
  const {hasPermission, isReady: permReady} = usePermissions();
  const {data, isLoading: loading, error, refetch} = useOrganizationHealth();

  // RBAC guard — org health requires REPORT_VIEW permission (DEF-52)
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.REPORT_VIEW)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  // RBAC guard — block render for unauthorized users (DEF-52)
  if (!permReady || !hasPermission(Permissions.REPORT_VIEW)) {
    return null;
  }

  if (loading) return <LoadingSkeleton/>;

  if (error || !data) {
    return (
      <AppLayout activeMenuItem="analytics">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md border-danger-100 dark:border-danger-900/30">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-danger-500 mx-auto mb-4"/>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Failed to load Dashboard</h2>
              <p
                className="text-[var(--text-secondary)] mb-6">{error?.message || 'Unable to load organization health data'}</p>
              <Button onClick={() => refetch()} variant="primary">Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const {healthScore, turnover, diversity, tenure, engagement, training} = data;

  return (
    <AppLayout activeMenuItem="analytics">
      <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div
            initial={{opacity: 0, x: -20}}
            animate={{opacity: 1, x: 0}}
          >
            <h1 className="text-xl font-bold">Organization Health</h1>
            <p className="text-[var(--text-secondary)] mt-1">Executive summary of workforce vitality and performance</p>
          </motion.div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4"/>}>
              Refresh Data
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Download className="h-4 w-4"/>}>
              Export Report
            </Button>
          </div>
        </div>

        {/* Global Health Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div
            className="lg:col-span-4"
            initial={{opacity: 0, scale: 0.95}}
            animate={{opacity: 1, scale: 1}}
          >
            <Card className="h-full bg-[var(--bg-card)]">
              <CardContent className="p-8 flex flex-col h-full">
                <span className="text-micro">Organization Pulse</span>
                <div className="mt-4 text-stat-large">{healthScore.score}</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">{healthScore.status}</div>
                <div
                  className={`mt-6 text-xs font-medium tabular-nums ${
                    healthScore.trend >= 0
                      ? 'text-success-700 dark:text-success-400'
                      : 'text-danger-700 dark:text-danger-400'
                  }`}
                >
                  <span aria-hidden="true">{healthScore.trend >= 0 ? '+ ' : '− '}</span>
                  <span className="sr-only">{healthScore.trend >= 0 ? 'up ' : 'down '}</span>
                  {Math.abs(healthScore.trend)}% vs last quarter
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[var(--bg-card)] border-none shadow-[var(--shadow-card)] shadow-accent-100/20">
              <CardHeader className="pb-2">
                <div className="row-between">
                  <CardTitle className="text-lg">Staff Retention</CardTitle>
                  <Users className="h-5 w-5 text-success-500"/>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-4">
                  <Stat
                    label="Annual Stability Rate"
                    value={`${100 - turnover.annualTurnoverRate}%`}
                  />
                  <div className="text-right">
                    <div
                      className="text-success-600 dark:text-success-400 font-medium flex items-center justify-end gap-1">
                      <TrendingUp className="h-3 w-3"/> 1.2%
                    </div>
                    <div className="text-caption">vs prev year</div>
                  </div>
                </div>
                <div className="h-24">
                  <RetentionSparkline data={turnover.trend}/>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--bg-card)] border-none shadow-[var(--shadow-card)] shadow-accent-100/20">
              <CardHeader className="pb-2">
                <div className="row-between">
                  <CardTitle className="text-lg">Engagement Intensity</CardTitle>
                  <Activity className="h-5 w-5 text-warning-500"/>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-4">
                  <Stat
                    label="Avg Engagement Score"
                    value={`${engagement.overallEngagementScore}/100`}
                  />
                  <div className="text-right">
                    <div className="text-accent-700 font-medium">{engagement.participationRate}%</div>
                    <div className="text-caption">Participation</div>
                  </div>
                </div>
                <div className="h-24">
                  <EngagementSparkline data={engagement.engagementTrend}/>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Breakdown Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-[var(--bg-card)]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-accent-500"/> Diversity & Inclusion
              </CardTitle>
              <CardDescription>Workforce makeup by gender</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <GenderPieChart
                  data={Object.entries(diversity.genderDistribution).map(([name, value]) => ({name, value}))}
                  colors={COLORS}
                />
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {Object.entries(diversity.genderDistribution).map(([name, _], idx) => (
                  <div key={name} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}/>
                    <span className="text-xs text-[var(--text-secondary)]">{name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-card)]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent-500"/> Tenure Distribution
              </CardTitle>
              <CardDescription>Employee longevity profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <TenureBarChart
                  data={Object.entries(tenure.tenureDistribution).map(([label, value]) => ({label, value}))}/>
              </div>
              <div className="text-center mt-4">
                <span
                  className="text-sm font-semibold text-[var(--text-primary)]">Avg Tenure: {tenure.averageTenureYears} Years</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-card)]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-warning-500"/> Learning Vitality
              </CardTitle>
              <CardDescription>Skills development & training health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 pt-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--text-secondary)]">Course Completion Rate</span>
                    <span className="font-bold">{training.completionRate}%</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-warning-400"
                      initial={{width: 0}}
                      animate={{width: `${training.completionRate}%`}}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <div className="text-caption mb-1">Total Hours</div>
                    <div className="text-xl font-bold">{training.totalTrainingHours}</div>
                  </div>
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <div className="text-caption mb-1">Active Learners</div>
                    <div className="text-xl font-bold">{training.activeLearners}</div>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-2 border-dashed">
                  View Skills Radar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Heatmap Stand-in */}
        <Card className="bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle>Department Vibrancy</CardTitle>
            <CardDescription>Stability and engagement ranking by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                <tr className="text-body-muted border-b dark:border-[var(--border-main)]800">
                  <th className="pb-4 font-medium">Department</th>
                  <th className="pb-4 font-medium">Stability</th>
                  <th className="pb-4 font-medium">Engagement</th>
                  <th className="pb-4 font-medium">Headcount</th>
                  <th className="pb-4 font-medium">Health Status</th>
                </tr>
                </thead>
                <tbody className="divide-y dark:divide-surface-800">
                {Object.entries(diversity.departmentDistribution).map(([name, count], idx) => (
                  <tr key={name} className="text-sm">
                    <td className="py-4 font-medium text-[var(--text-primary)]">{name}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-[var(--bg-secondary)] rounded-full">
                          <div className="h-full bg-success-500 rounded-full" style={{width: `${90 - idx * 5}%`}}/>
                        </div>
                        <span>{90 - idx * 5}%</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-[var(--bg-secondary)] rounded-full">
                          <div className="h-full bg-accent-500 rounded-full" style={{width: `${85 - idx * 3}%`}}/>
                        </div>
                        <span>{85 - idx * 3}%</span>
                      </div>
                    </td>
                    <td className="py-4 text-[var(--text-secondary)]">{count}</td>
                    <td className="py-4">
                                                <span
                                                  className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${idx === 0 ? 'bg-success-100 text-success-700 dark:bg-success-950/30' :
                                                    idx === 4 ? 'bg-warning-100 text-warning-700 dark:bg-warning-950/30' :
                                                      'bg-accent-100 text-accent-700 dark:bg-accent-950/30'
                                                  }`}>
                                                    {idx === 0 ? 'Peak' : idx === 4 ? 'Monitor' : 'Stable'}
                                                </span>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function LoadingSkeleton() {
  return (
    <AppLayout activeMenuItem="analytics">
      <div className="p-6 space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-lg"/>
            <div className="h-4 w-96 bg-[var(--bg-secondary)]/50 rounded-lg"/>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-lg"/>
            <div className="h-10 w-32 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-lg"/>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 h-64 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl"/>
          <div className="col-span-4 h-64 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl"/>
          <div className="col-span-4 h-64 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl"/>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="h-96 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl"/>
          <div className="h-96 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl"/>
          <div className="h-96 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl"/>
        </div>
      </div>
    </AppLayout>
  );
}
