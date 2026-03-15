'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Users,
    TrendingUp,
    Award,
    PieChart as PieChartIcon,
    Search,
    Filter,
    Download,
    RefreshCw,
    AlertCircle,
    TrendingDown,
    ShieldCheck,
    Zap,
    Clock,
    Briefcase
} from 'lucide-react';
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
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useOrganizationHealth } from '@/lib/hooks/queries/useAnalytics';
import { Skeleton } from '@/components/ui/Skeleton';
import { chartColors } from '@/lib/utils/theme-colors';

const COLORS = chartColors.palette();

export default function OrganizationHealthPage() {
    const { data, isLoading: loading, error, refetch } = useOrganizationHealth();

    if (loading) return <LoadingSkeleton />;

    if (error || !data) {
        return (
            <AppLayout activeMenuItem="analytics">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Card className="max-w-md border-red-100 dark:border-red-900/30">
                        <CardContent className="pt-6 text-center">
                            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Failed to load Dashboard</h2>
                            <p className="text-[var(--text-secondary)] mb-6">{error?.message || 'Unable to load organization health data'}</p>
                            <Button onClick={() => refetch()} variant="primary">Try Again</Button>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    const { healthScore, turnover, diversity, tenure, engagement, training } = data;

    return (
        <AppLayout activeMenuItem="analytics">
            <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Organization Health</h1>
                        <p className="text-[var(--text-secondary)] mt-1">Executive summary of workforce vitality and performance</p>
                    </motion.div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                            Refresh Data
                        </Button>
                        <Button variant="primary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                            Export Report
                        </Button>
                    </div>
                </div>

                {/* Global Health Hero */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <motion.div
                        className="lg:col-span-4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Card className="h-full bg-gradient-to-br from-primary-600 to-primary-800 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <ShieldCheck className="h-48 w-48" />
                            </div>
                            <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full relative z-10">
                                <span className="text-primary-100 text-sm font-medium tracking-wider uppercase mb-2">Organization Pulse</span>
                                <div className="text-8xl font-black mb-4">{healthScore.score}</div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] rounded-full mb-6">
                                    <Zap className="h-5 w-5 text-yellow-300" />
                                    <span className="font-bold text-lg">{healthScore.status}</span>
                                </div>
                                <div className="flex items-center gap-2 text-primary-100 italic">
                                    {healthScore.trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    <span>{Math.abs(healthScore.trend)}% Improvement since last quarter</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-[var(--bg-card)] border-none shadow-sm shadow-primary-100/20">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Staff Retention</CardTitle>
                                    <Users className="h-5 w-5 text-green-500" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end justify-between mb-4">
                                    <div>
                                        <div className="text-3xl font-bold">{100 - turnover.annualTurnoverRate}%</div>
                                        <div className="text-sm text-[var(--text-muted)]">Annual Stability Rate</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-green-600 dark:text-green-400 font-medium flex items-center justify-end gap-1">
                                            <TrendingUp className="h-3 w-3" /> 1.2%
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)]">vs prev year</div>
                                    </div>
                                </div>
                                <div className="h-24">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={turnover.trend}>
                                            <defs>
                                                <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={chartColors.success()} stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor={chartColors.success()} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="value" stroke={chartColors.success()} fill="url(#retentionGrad)" strokeWidth={2} dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[var(--bg-card)] border-none shadow-sm shadow-primary-100/20">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Engagement Intensity</CardTitle>
                                    <Activity className="h-5 w-5 text-orange-500" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end justify-between mb-4">
                                    <div>
                                        <div className="text-3xl font-bold">{engagement.overallEngagementScore}/100</div>
                                        <div className="text-sm text-[var(--text-muted)]">Avg Engagement Score</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-primary-600 font-medium">{engagement.participationRate}%</div>
                                        <div className="text-xs text-[var(--text-muted)]">Participation</div>
                                    </div>
                                </div>
                                <div className="h-24">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={engagement.engagementTrend}>
                                            <Bar dataKey="value" fill={chartColors.warning()} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
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
                                <PieChartIcon className="h-5 w-5 text-primary-500" /> Diversity & Inclusion
                            </CardTitle>
                            <CardDescription>Workforce makeup by gender</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(diversity.genderDistribution).map(([name, value]) => ({ name, value }))}
                                            cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value"
                                        >
                                            {Object.entries(diversity.genderDistribution).map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 mt-4">
                                {Object.entries(diversity.genderDistribution).map(([name, _], idx) => (
                                    <div key={name} className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                        <span className="text-xs text-[var(--text-secondary)]">{name}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--bg-card)]">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5 text-indigo-500" /> Tenure Distribution
                            </CardTitle>
                            <CardDescription>Employee longevity profile</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={Object.entries(tenure.tenureDistribution).map(([label, value]) => ({ label, value }))}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                        <Bar dataKey="value" fill={chartColors.secondary()} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center mt-4">
                                <span className="text-sm font-semibold text-[var(--text-primary)]">Avg Tenure: {tenure.averageTenureYears} Years</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--bg-card)]">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Award className="h-5 w-5 text-yellow-500" /> Learning Vitality
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
                                            className="h-full bg-yellow-400"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${training.completionRate}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl">
                                        <div className="text-xs text-[var(--text-muted)] mb-1">Total Hours</div>
                                        <div className="text-2xl font-bold">{training.totalTrainingHours}</div>
                                    </div>
                                    <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl">
                                        <div className="text-xs text-[var(--text-muted)] mb-1">Active Learners</div>
                                        <div className="text-2xl font-bold">{training.activeLearners}</div>
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
                                    <tr className="text-sm text-[var(--text-muted)] border-b dark:border-[var(--border-main)]800">
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
                                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${90 - idx * 5}%` }} />
                                                    </div>
                                                    <span>{90 - idx * 5}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-1.5 bg-[var(--bg-secondary)] rounded-full">
                                                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${85 - idx * 3}%` }} />
                                                    </div>
                                                    <span>{85 - idx * 3}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-[var(--text-secondary)]">{count}</td>
                                            <td className="py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${idx === 0 ? 'bg-green-100 text-green-700 dark:bg-green-950/30' :
                                                        idx === 4 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30' :
                                                            'bg-primary-100 text-primary-700 dark:bg-primary-950/30'
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
                        <div className="h-8 w-64 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-lg" />
                        <div className="h-4 w-96 bg-[var(--bg-secondary)]/50 rounded-lg" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-10 w-32 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-lg" />
                        <div className="h-10 w-32 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-lg" />
                    </div>
                </div>
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-4 h-64 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl" />
                    <div className="col-span-4 h-64 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl" />
                    <div className="col-span-4 h-64 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl" />
                </div>
                <div className="grid grid-cols-3 gap-6">
                    <div className="h-96 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl" />
                    <div className="h-96 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl" />
                    <div className="h-96 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-3xl" />
                </div>
            </div>
        </AppLayout>
    );
}
