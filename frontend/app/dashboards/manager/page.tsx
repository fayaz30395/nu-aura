'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Calendar,
  ClipboardList,
  Target,
  AlertTriangle,
  FileText,
  Activity,
  Zap,
  Star,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { useManagerDashboard } from '@/lib/hooks/queries';

// Utility function to format dates
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};


export default function ManagerDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { data: dashboardData, isLoading: loading, error } = useManagerDashboard(
    hasHydrated && isAuthenticated
  );

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

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
              <p className="text-red-700 dark:text-red-400">{error instanceof Error ? error.message : String(error)}</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { teamOverview, teamAttendance, teamLeave, teamPerformance, actionItems, teamAlerts } = dashboardData;

  // Attendance trend chart data
  const attendanceTrendData = teamAttendance.weeklyTrend.map((day) => ({
    name: day.dayOfWeek.substring(0, 3),
    rate: parseFloat((day.attendanceRate || 0).toFixed(1)),
  }));

  // Team Pulse Radar Data - all values from real API data
  const pulseData = [
    { subject: 'Goals', A: teamPerformance.goalCompletionRate || 0, fullMark: 100 },
    { subject: 'Training', A: teamPerformance.trainingCompletionRate || 0, fullMark: 100 },
    { subject: 'Feedback', A: (teamPerformance.avgFeedbackScore || 0) * 20, fullMark: 100 },
    { subject: 'Engagement', A: teamPerformance.engagementScore || 0, fullMark: 100 },
    { subject: 'Attendance', A: teamAttendance.weeklyAttendanceRate || 0, fullMark: 100 },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <AppLayout activeMenuItem="dashboard">
      <motion.div
        className="p-6 space-y-8 bg-[var(--bg-secondary)]/30 dark:bg-[var(--bg-primary)]/30 min-h-screen"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">Live Insights</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl">
              Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-primary-400 dark:to-indigo-400 skeuo-emboss">Pulse</span>
            </h1>
            <p className="text-[var(--text-secondary)] mt-2 text-lg">
              Optimizing productivity for <span className="font-semibold">{dashboardData.departmentName}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border shadow-sm transition-all duration-300 ${teamOverview.teamHealthStatus === 'EXCELLENT'
              ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}>
              <Activity className="h-5 w-5" />
              <span className="font-bold">Health Index: {teamOverview.teamHealthStatus.replace('_', ' ')}</span>
            </div>
          </div>
        </motion.div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="group border-0 shadow-xl bg-[var(--bg-card)] hover:shadow-2xl transition-all duration-500 overflow-hidden relative skeuo-card">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="h-16 w-16 text-primary-500" />
              </div>
              <CardContent className="p-8">
                <div className="flex flex-col gap-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">Team Force</p>
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-black text-[var(--text-primary)]">{teamOverview.totalTeamSize}</span>
                    <div className="h-10 w-1 rounded-full bg-primary-500" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-muted)]">Reports</span>
                      <span className="text-sm font-bold text-primary-600">{teamOverview.directReports} Direct</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="group border-0 shadow-xl bg-[var(--bg-card)] hover:shadow-2xl transition-all duration-500 overflow-hidden relative skeuo-card">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <UserCheck className="h-16 w-16 text-emerald-500" />
              </div>
              <CardContent className="p-8">
                <div className="flex flex-col gap-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">Availability Today</p>
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-black text-[var(--text-primary)]">{teamAttendance.presentToday}</span>
                    <div className="h-10 w-1 rounded-full bg-emerald-500" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-muted)]">On-Site</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{teamAttendance.workFromHomeToday} WFH</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="group border-0 shadow-xl bg-[var(--bg-card)] hover:shadow-2xl transition-all duration-500 overflow-hidden relative skeuo-card">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Calendar className="h-16 w-16 text-amber-500" />
              </div>
              <CardContent className="p-8">
                <div className="flex flex-col gap-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">Out of Office</p>
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-black text-[var(--text-primary)]">{teamAttendance.onLeaveToday}</span>
                    <div className="h-10 w-1 rounded-full bg-amber-500" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-muted)]">Confirmed</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{teamLeave.pendingApprovals} Pending</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="group border-0 shadow-xl bg-[var(--bg-card)] hover:shadow-2xl transition-all duration-500 overflow-hidden relative skeuo-card">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="h-16 w-16 text-indigo-500" />
              </div>
              <CardContent className="p-8">
                <div className="flex flex-col gap-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">Active Tasks</p>
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-black text-[var(--text-primary)]">{actionItems.totalActionItems}</span>
                    <div className="h-10 w-1 rounded-full bg-indigo-500" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-muted)]">Total</span>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{actionItems.overdueApprovals + actionItems.overdueReviews} Alert</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Central Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team Attendance Analytics */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-2xl bg-[var(--bg-card)] overflow-hidden">
              <CardHeader className="border-b border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Activity className="h-6 w-6 text-indigo-500" />
                    <span>Attendance Flow</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold uppercase tracking-tighter self-center">Real-time</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10">
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Weekly Rate</p>
                      <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tighter">
                        {teamAttendance.weeklyAttendanceRate?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Stability</p>
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tighter">
                          {teamAttendance.monthlyAttendanceRate?.toFixed(1)}%
                        </span>
                        {teamAttendance.monthlyAttendanceChange !== 0 && (
                          <div className={`p-1.5 rounded-full ${teamAttendance.monthlyAttendanceChange > 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                            {teamAttendance.monthlyAttendanceChange > 0 ? <TrendingUp className="h-3 w-3 text-white" /> : <TrendingDown className="h-3 w-3 text-white" />}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={attendanceTrendData}>
                        <defs>
                          <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-muted)', fontSize: 12, fontWeight: 700 }} />
                        <YAxis hide domain={[0, 110]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        <Area type="monotone" dataKey="rate" stroke="#6366F1" strokeWidth={4} fillOpacity={1} fill="url(#colorRate)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Pulse Radar & Performance */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-2xl bg-[var(--bg-card)] overflow-hidden h-full">
              <CardHeader className="border-b border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50">
                <CardTitle className="flex items-center gap-4">
                  <Star className="h-6 w-6 text-amber-500" />
                  <span>Performance DNA</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                  <div className="space-y-8">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Avg Rating</p>
                      <div className="flex items-baseline gap-4">
                        <span className="text-5xl font-black text-[var(--text-primary)]">{teamPerformance.avgPerformanceRating?.toFixed(1)}</span>
                        <span className="text-xl font-bold text-[var(--text-muted)]">/ 5.0</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Goal Execution</p>
                      <div className="relative h-4 w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${teamPerformance.goalCompletionRate}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="absolute h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between mt-2 font-bold text-sm text-amber-600">
                        <span>{teamPerformance.goalCompletionRate?.toFixed(0)}% Completed</span>
                        <span>On Track</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={pulseData}>
                        <PolarGrid stroke="#94A3B8" opacity={0.5} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--chart-muted)', fontSize: 10, fontWeight: 800 }} />
                        <PolarRadiusAxis hide />
                        <Radar
                          name="Team"
                          dataKey="A"
                          stroke="#F59E0B"
                          fill="#F59E0B"
                          fillOpacity={0.3}
                          strokeWidth={3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Lists & Detailed Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Approvals */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="border-0 shadow-2xl bg-[var(--bg-card)] overflow-hidden">
              <CardHeader className="border-b border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText className="h-6 w-6 text-primary-500" />
                    <span>Approval Pipeline</span>
                  </div>
                  <Badge className="bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-500/20">
                    {teamLeave.pendingLeaveRequests.length} Active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-surface-200/50 dark:divide-surface-700/50">
                  {teamLeave.pendingLeaveRequests.slice(0, 5).map((leave) => (
                    <div
                      key={leave.requestId}
                      className="p-6 hover:bg-[var(--bg-card-hover)] transition-all duration-300 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg">
                            {leave.employeeName?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-4">
                              <span className="font-extrabold text-[var(--text-primary)] group-hover:text-primary-500 transition-colors">{leave.employeeName}</span>
                              {leave.urgency === 'HIGH' && (
                                <span className="animate-pulse flex h-2 w-2 rounded-full bg-red-500" />
                              )}
                            </div>
                            <p className="text-sm font-bold text-[var(--text-muted)] mt-1">
                              {leave.leaveType} • {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black uppercase tracking-tighter text-[var(--text-muted)] block mb-1">Impact</span>
                          <span className="text-sm font-extrabold text-[var(--text-primary)]">{leave.days} Days</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {teamLeave.pendingLeaveRequests.length === 0 && (
                    <div className="p-12 text-center">
                      <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-emerald-500" />
                      </div>
                      <p className="text-xl font-black text-[var(--text-primary)]">Clear Pipeline</p>
                      <p className="text-[var(--text-muted)] mt-1 font-bold">All approvals are up to date.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Items Summary */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-2xl bg-[var(--bg-card)] h-full">
              <CardHeader className="border-b border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50">
                <CardTitle className="flex items-center gap-4">
                  <ClipboardList className="h-6 w-6 text-indigo-500" />
                  <span>Immediate Acts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[
                    { label: 'Leaves', count: actionItems.leaveApprovals, icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'Timesheets', count: actionItems.timesheetApprovals, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Performance', count: actionItems.performanceReviewsDue, icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    { label: 'One-on-Ones', count: actionItems.oneOnOnesDue, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-3xl bg-[var(--bg-secondary)]/50 dark:bg-[var(--bg-secondary)]/50 border border-[var(--border-main)]/20 hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)] transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${item.bg}`}>
                          <item.icon className={`h-6 w-6 ${item.color}`} />
                        </div>
                        <span className="font-extrabold text-[var(--text-primary)]">{item.label}</span>
                      </div>
                      <span className="text-2xl font-black text-[var(--text-primary)] opacity-40 group-hover:opacity-100 transition-opacity">{item.count}</span>
                    </div>
                  ))}

                  {(actionItems.overdueApprovals > 0 || actionItems.overdueReviews > 0) && (
                    <div className="mt-6 p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-4">
                      <AlertCircle className="h-8 w-8 animate-bounce" />
                      <div>
                        <p className="font-black text-lg leading-tight">{actionItems.overdueApprovals + actionItems.overdueReviews} Overdue</p>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-70">Immediate attention required</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Global Alert Section */}
        <AnimatePresence>
          {teamAlerts && teamAlerts.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <Card className="border-0 shadow-2xl bg-danger-50 dark:bg-danger-950 overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg">
                        <AlertTriangle className="h-7 w-7" />
                      </div>
                      <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">System Alerts</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamAlerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="p-6 rounded-3xl bg-white/40 dark:bg-black/20 border border-red-500/10">
                        <div className="flex items-center gap-4 mb-4">
                          <Badge className="bg-red-500 text-white font-black px-3 py-1">CRITICAL</Badge>
                          <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">{alert.type}</span>
                        </div>
                        <h4 className="font-extrabold text-[var(--text-primary)] mb-2">{alert.title}</h4>
                        <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">{alert.description}</p>
                        <div className="mt-6 pt-6 border-t border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50 flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-primary-500">Action: {alert.actionRequired}</span>
                          <Button variant="ghost" size="sm" className="font-black">RESOLVE</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

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
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {teamPerformance.goalsOnTrack}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      On Track
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {teamPerformance.goalsAtRisk}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      At Risk
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {teamPerformance.goalsCompleted}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Completed
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-main)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">
                      Completion Rate
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {teamPerformance.goalCompletionRate?.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-2">
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
                <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">
                      One-on-Ones This Month
                    </span>
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      {teamPerformance.oneOnOnesCompletedThisMonth}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--text-muted)]">Scheduled:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
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

                <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">
                      Average Feedback Score
                    </span>
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
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

                <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">
                      Training Completion
                    </span>
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      {teamPerformance.trainingCompletionRate?.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AppLayout>
  );
}
