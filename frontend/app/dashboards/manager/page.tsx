'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {AnimatePresence, motion} from 'framer-motion';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  FolderKanban,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import {ChartLoadingFallback} from '@/lib/utils/lazy-components';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useManagerDashboard, useManagerTeamProjects} from '@/lib/hooks/queries';
import type {TeamMemberProjectAllocation, TeamMemberWithProjects} from '@/lib/types/core/dashboard';

const ManagerAttendanceTrendChart = dynamic(
  () => import('./ManagerCharts').then((mod) => ({default: mod.ManagerAttendanceTrendChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

const ManagerPerformanceRadarChart = dynamic(
  () => import('./ManagerCharts').then((mod) => ({default: mod.ManagerPerformanceRadarChart})),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

// Utility function to format dates
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Utility: format role strings like TECHNOLOGY_LEAD → "Technology Lead"
const formatRole = (role: string) =>
  role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Utility: get allocation bar color class based on percentage
const getAllocationColor = (pct: number) => {
  if (pct > 100) return 'bg-danger-500';
  if (pct >= 75) return 'bg-accent-600';
  return 'bg-success-500';
};

// Utility: get allocation text color class
const getAllocationTextColor = (pct: number) => {
  if (pct > 100) return 'text-danger-600 dark:text-danger-400';
  if (pct >= 75) return 'text-accent-700 dark:text-accent-400';
  return 'text-success-600 dark:text-success-400';
};

// Utility: priority dot color
const priorityDotColor: Record<string, string> = {
  CRITICAL: 'bg-danger-500',
  HIGH: 'bg-warning-500',
  MEDIUM: 'bg-warning-500',
  LOW: 'bg-success-500',
};

// Utility: status badge styles
const statusBadgeStyles: Record<string, string> = {
  IN_PROGRESS: 'bg-accent-500/10 text-accent-700 dark:text-accent-400 border-accent-500/20',
  PLANNED: 'bg-surface-500/10 text-surface-600 dark:text-surface-400 border-surface-500/20',
  DRAFT: 'bg-transparent text-surface-500 dark:text-surface-500 border-surface-300 dark:border-surface-600',
  COMPLETED: 'bg-success-500/10 text-success-700 dark:text-success-400 border-success-500/20',
  ON_HOLD: 'bg-warning-500/10 text-warning-700 dark:text-warning-400 border-warning-500/20',
};


export default function ManagerDashboardPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasPermission, isReady: permissionsReady} = usePermissions();
  const hasManagerAccess = hasPermission(Permissions.EMPLOYEE_VIEW_TEAM);
  const {data: dashboardData, isLoading: loading, error} = useManagerDashboard(
    hasHydrated && isAuthenticated && hasManagerAccess
  );
  const {
    data: teamProjectsData,
    isLoading: teamProjectsLoading,
    error: teamProjectsError,
  } = useManagerTeamProjects(hasHydrated && isAuthenticated && hasManagerAccess);

  useEffect(() => {
    if (!hasHydrated || !permissionsReady) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    // DEF-37: Gate on EMPLOYEE:VIEW_TEAM permission (manager-only)
    if (!hasPermission(Permissions.EMPLOYEE_VIEW_TEAM)) {
      router.replace('/me/dashboard');
      return;
    }
  }, [hasHydrated, permissionsReady, isAuthenticated, router, hasPermission]);

  // Loading skeleton
  const DashboardSkeleton = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[80px] rounded-lg"/>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[220px] rounded-lg"/>
        <Skeleton className="h-[220px] rounded-lg"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-[220px] rounded-lg lg:col-span-2"/>
        <Skeleton className="h-[220px] rounded-lg"/>
      </div>
    </div>
  );

  // DEF-37: Don't render any dashboard content until permission is confirmed
  if (!hasHydrated || !permissionsReady || !hasManagerAccess) {
    return null;
  }

  if (loading) {
    return (
      <AppLayout activeMenuItem="dashboard">
        <div className="p-6">
          <DashboardSkeleton/>
        </div>
      </AppLayout>
    );
  }

  if (error || !dashboardData) {
    return (
      <AppLayout activeMenuItem="dashboard">
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-2xl font-bold skeuo-emboss">Team Dashboard</h1>
            <p className="text-[var(--text-secondary)] mt-1">Manager overview</p>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <AlertCircle className="h-5 w-5 text-[var(--status-warning-text)] flex-shrink-0"/>
            <p className="text-sm text-[var(--text-secondary)] flex-1">
              Team dashboard data is temporarily unavailable. Some metrics may not be displayed.
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['Team Size', 'Present Today', 'On Leave', 'Pending Actions'].map((label) => (
              <Card key={label}>
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">--</p>
                  <p className="text-caption mt-1">No data</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const {teamOverview, teamAttendance, teamLeave, teamPerformance, actionItems, teamAlerts} = dashboardData;

  // Attendance trend chart data
  const attendanceTrendData = teamAttendance.weeklyTrend.map((day) => ({
    name: day.dayOfWeek.substring(0, 3),
    rate: parseFloat((day.attendanceRate || 0).toFixed(1)),
  }));

  // Team Pulse Radar Data - all values from real API data
  const pulseData = [
    {subject: 'Goals', A: teamPerformance.goalCompletionRate || 0, fullMark: 100},
    {subject: 'Training', A: teamPerformance.trainingCompletionRate || 0, fullMark: 100},
    {subject: 'Feedback', A: (teamPerformance.avgFeedbackScore || 0) * 20, fullMark: 100},
    {subject: 'Engagement', A: teamPerformance.engagementScore || 0, fullMark: 100},
    {subject: 'Attendance', A: teamAttendance.weeklyAttendanceRate || 0, fullMark: 100},
  ];

  // Animation variants
  const containerVariants = {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {staggerChildren: 0.1}
    }
  };

  const itemVariants = {
    hidden: {y: 20, opacity: 0},
    visible: {y: 0, opacity: 1}
  };

  return (
    <AppLayout activeMenuItem="dashboard">
      <motion.div
        className="p-4 space-y-4 bg-[var(--bg-secondary)]/30 dark:bg-[var(--bg-primary)]/30 min-h-screen"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse"/>
              <span
                className="text-2xs font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">Live Insights</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Team <span
              className="text-transparent bg-clip-text bg-gradient-to-r from-accent-700 to-accent-600 dark:from-accent-400 dark:to-accent-400 skeuo-emboss">Pulse</span>
            </h1>
            <p className="text-[var(--text-secondary)] mt-1 text-sm">
              Optimizing productivity for <span className="font-semibold">{dashboardData.departmentName}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`px-4 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-[var(--shadow-card)] transition-all duration-200 text-xs ${teamOverview.teamHealthStatus === 'EXCELLENT'
                ? 'bg-success-500/10 border-success-500/20 text-success-700 dark:text-success-400'
                : 'bg-warning-500/10 border-warning-500/20 text-warning-700 dark:text-warning-400'
              }`}>
              <Activity className="h-4 w-4"/>
              <span className="font-bold">Health: {teamOverview.teamHealthStatus.replace('_', ' ')}</span>
            </div>
          </div>
        </motion.div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={itemVariants}>
            <Card
              className="group border-0 shadow-[var(--shadow-dropdown)] bg-[var(--bg-card)] hover:shadow-[var(--shadow-dropdown)] transition-all duration-300 overflow-hidden relative skeuo-card max-h-[80px]">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users
                  className="h-10 w-10 text-accent-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
              </div>
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-2xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Team Force</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-[var(--text-primary)]">{teamOverview.totalTeamSize}</span>
                    <div className="h-6 w-0.5 rounded-full bg-accent-500"/>
                    <div className="flex flex-col">
                      <span className="text-2xs font-bold text-[var(--text-muted)]">Reports</span>
                      <span
                        className="text-xs font-bold text-accent-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{teamOverview.directReports} Direct</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card
              className="group border-0 shadow-[var(--shadow-dropdown)] bg-[var(--bg-card)] hover:shadow-[var(--shadow-dropdown)] transition-all duration-300 overflow-hidden relative skeuo-card max-h-[80px]">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <UserCheck
                  className="h-10 w-10 text-success-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
              </div>
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-2xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Availability
                    Today</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-2xl font-black text-[var(--text-primary)]">{teamAttendance.presentToday}</span>
                    <div className="h-6 w-0.5 rounded-full bg-success-500"/>
                    <div className="flex flex-col">
                      <span className="text-2xs font-bold text-[var(--text-muted)]">On-Site</span>
                      <span
                        className="text-xs font-bold text-success-600 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{teamAttendance.workFromHomeToday} WFH</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card
              className="group border-0 shadow-[var(--shadow-dropdown)] bg-[var(--bg-card)] hover:shadow-[var(--shadow-dropdown)] transition-all duration-300 overflow-hidden relative skeuo-card max-h-[80px]">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Calendar
                  className="h-10 w-10 text-warning-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
              </div>
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-2xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Out of Office</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-2xl font-black text-[var(--text-primary)]">{teamAttendance.onLeaveToday}</span>
                    <div className="h-6 w-0.5 rounded-full bg-warning-500"/>
                    <div className="flex flex-col">
                      <span className="text-2xs font-bold text-[var(--text-muted)]">Confirmed</span>
                      <span
                        className="text-xs font-bold text-warning-600 dark:text-warning-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{teamLeave.pendingApprovals} Pending</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card
              className="group border-0 shadow-[var(--shadow-dropdown)] bg-[var(--bg-card)] hover:shadow-[var(--shadow-dropdown)] transition-all duration-300 overflow-hidden relative skeuo-card max-h-[80px]">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap
                  className="h-10 w-10 text-accent-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
              </div>
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-2xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Active Tasks</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-2xl font-black text-[var(--text-primary)]">{actionItems.totalActionItems}</span>
                    <div className="h-6 w-0.5 rounded-full bg-accent-500"/>
                    <div className="flex flex-col">
                      <span className="text-2xs font-bold text-[var(--text-muted)]">Total</span>
                      <span
                        className="text-xs font-bold text-accent-600 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{actionItems.overdueApprovals + actionItems.overdueReviews} Alert</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Central Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Team Attendance Analytics */}
          <motion.div variants={itemVariants}>
            <Card
              className="border-0 shadow-[var(--shadow-elevated)] bg-[var(--bg-card)] overflow-hidden max-h-[220px]">
              <CardHeader
                className="border-b border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50 py-2.5 px-4">
                <CardTitle className="row-between">
                  <div className="flex items-center gap-4">
                    <Activity
                      className="h-4 w-4 text-accent-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                    <span className="text-sm">Attendance Flow</span>
                  </div>
                  <Badge variant="outline"
                         className="text-2xs font-bold uppercase tracking-tighter self-center">Real-time</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-accent-500/5 rounded-xl border border-accent-500/10">
                      <p className="text-2xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Weekly
                        Rate</p>
                      <span
                        className="text-xl font-black text-accent-600 dark:text-accent-400 font-mono tracking-tighter cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                        {teamAttendance.weeklyAttendanceRate?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-success-500/5 rounded-xl border border-success-500/10">
                      <p
                        className="text-2xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Stability</p>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xl font-black text-success-600 dark:text-success-400 font-mono tracking-tighter cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                          {teamAttendance.monthlyAttendanceRate?.toFixed(1)}%
                        </span>
                        {teamAttendance.monthlyAttendanceChange !== 0 && (
                          <div
                            className={`p-1 rounded-full ${teamAttendance.monthlyAttendanceChange > 0 ? 'bg-success-500' : 'bg-danger-500'}`}>
                            {teamAttendance.monthlyAttendanceChange > 0 ? <TrendingUp className="h-3 w-3 text-white"/> :
                              <TrendingDown className="h-3 w-3 text-white"/>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-36 w-full">
                    <ManagerAttendanceTrendChart data={attendanceTrendData}/>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Pulse Radar & Performance */}
          <motion.div variants={itemVariants}>
            <Card
              className="border-0 shadow-[var(--shadow-elevated)] bg-[var(--bg-card)] overflow-hidden max-h-[280px]">
              <CardHeader
                className="border-b border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50 py-2.5 px-4">
                <CardTitle className="flex items-center gap-4">
                  <Star
                    className="h-4 w-4 text-warning-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                  <span className="text-sm">Performance DNA</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-4">
                    <div>
                      <p className="text-2xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Avg
                        Rating</p>
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-3xl font-black text-[var(--text-primary)]">{teamPerformance.avgPerformanceRating?.toFixed(1)}</span>
                        <span className="text-sm font-bold text-[var(--text-muted)]">/ 5.0</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-2xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Goal
                        Execution</p>
                      <div
                        className="relative h-3 w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{width: 0}}
                          animate={{width: `${teamPerformance.goalCompletionRate}%`}}
                          transition={{duration: 1.5, ease: "easeOut"}}
                          className="absolute h-full bg-gradient-to-r from-warning-400 to-warning-500 rounded-full"
                        />
                      </div>
                      <div
                        className="flex justify-between mt-1 font-bold text-xs text-warning-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                        <span>{teamPerformance.goalCompletionRate?.toFixed(0)}% Completed</span>
                        <span>On Track</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-36">
                    <ManagerPerformanceRadarChart data={pulseData}/>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Lists & Detailed Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pending Approvals */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="border-0 shadow-[var(--shadow-elevated)] bg-[var(--bg-card)] overflow-hidden">
              <CardHeader
                className="border-b border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50 py-2.5 px-4">
                <CardTitle className="row-between">
                  <div className="flex items-center gap-2">
                    <FileText
                      className="h-4 w-4 text-accent-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                    <span className="text-sm">Approval Pipeline</span>
                  </div>
                  <Badge
                    className="bg-accent-500/10 text-accent-700 dark:text-accent-400 border-accent-500/20 text-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                    {teamLeave.pendingLeaveRequests.length} Active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  className="divide-y divide-surface-200/50 dark:divide-surface-700/50 max-h-[220px] overflow-y-auto">
                  {teamLeave.pendingLeaveRequests.slice(0, 5).map((leave) => (
                    <div
                      key={leave.requestId}
                      className="px-4 py-2 hover:bg-[var(--bg-card-hover)] transition-all duration-200 group cursor-pointer"
                    >
                      <div className="row-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 text-white flex items-center justify-center font-black text-xs shadow-[var(--shadow-elevated)]">
                            {leave.employeeName?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="font-bold text-xs text-[var(--text-primary)] group-hover:text-accent-500 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{leave.employeeName}</span>
                              {leave.urgency === 'HIGH' && (
                                <span className="animate-pulse flex h-1.5 w-1.5 rounded-full bg-danger-500"/>
                              )}
                            </div>
                            <p className="text-2xs font-bold text-[var(--text-muted)]">
                              {leave.leaveType} • {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-[var(--text-primary)]">{leave.days}d</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {teamLeave.pendingLeaveRequests.length === 0 && (
                    <div className="p-6 text-center">
                      <div
                        className="h-10 w-10 rounded-full bg-success-500/10 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle
                          className="h-5 w-5 text-success-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                      </div>
                      <p className="text-sm font-black text-[var(--text-primary)]">Clear Pipeline</p>
                      <p className="text-[var(--text-muted)] mt-0.5 text-xs font-bold">All approvals are up to date.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Items Summary */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-[var(--shadow-elevated)] bg-[var(--bg-card)] h-full">
              <CardHeader
                className="border-b border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50 py-2.5 px-4">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList
                    className="h-4 w-4 text-accent-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                  <span className="text-sm">Immediate Acts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-1.5">
                  {[
                    {
                      label: 'Leaves',
                      count: actionItems.leaveApprovals,
                      icon: Calendar,
                      color: 'text-warning-500',
                      bg: 'bg-warning-500/10'
                    },
                    {
                      label: 'Timesheets',
                      count: actionItems.timesheetApprovals,
                      icon: Clock,
                      color: 'text-accent-500',
                      bg: 'bg-accent-500/10'
                    },
                    {
                      label: 'Performance',
                      count: actionItems.performanceReviewsDue,
                      icon: Target,
                      color: 'text-accent-700',
                      bg: 'bg-accent-700/10'
                    },
                    {
                      label: 'One-on-Ones',
                      count: actionItems.oneOnOnesDue,
                      icon: Users,
                      color: 'text-success-500',
                      bg: 'bg-success-500/10'
                    }
                  ].map((item, idx) => (
                    <div key={idx}
                         className="row-between p-2 rounded-xl bg-[var(--bg-secondary)]/50 dark:bg-[var(--bg-secondary)]/50 border border-[var(--border-main)]/20 hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)] transition-all group">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${item.bg}`}>
                          <item.icon className={`h-3.5 w-3.5 ${item.color}`}/>
                        </div>
                        <span className="font-bold text-xs text-[var(--text-primary)]">{item.label}</span>
                      </div>
                      <span
                        className="text-sm font-black text-[var(--text-primary)] opacity-40 group-hover:opacity-100 transition-opacity">{item.count}</span>
                    </div>
                  ))}

                  {(actionItems.overdueApprovals > 0 || actionItems.overdueReviews > 0) && (
                    <div
                      className="mt-2 p-2 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-600 dark:text-danger-400 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                      <AlertCircle className="h-4 w-4 animate-bounce"/>
                      <div>
                        <p
                          className="font-black text-xs leading-tight">{actionItems.overdueApprovals + actionItems.overdueReviews} Overdue</p>
                        <p className="text-2xs font-bold uppercase tracking-widest opacity-70">Immediate attention</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Team Projects & Allocations */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-[var(--shadow-elevated)] bg-[var(--bg-card)] overflow-hidden">
            <CardHeader className="border-b border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50">
              <CardTitle className="row-between">
                <div className="flex items-center gap-2">
                  <FolderKanban
                    className="h-4 w-4 text-accent-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                  <span className="text-sm">Team Projects & Allocations</span>
                </div>
                {teamProjectsData?.summary && (
                  <div className="flex items-center gap-2 text-2xs font-bold text-[var(--text-muted)]">
                    <span>{teamProjectsData.summary.totalReports} Reports</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]"/>
                    <span
                      className="text-success-600 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{teamProjectsData.summary.allocatedCount} Allocated</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]"/>
                    <span
                      className="text-warning-600 dark:text-warning-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{teamProjectsData.summary.unallocatedCount} Unallocated</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]"/>
                    <span>Avg: {teamProjectsData.summary.avgAllocation}%</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {/* Loading state */}
              {teamProjectsLoading && (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-xl"/>
                  ))}
                </div>
              )}

              {/* Error / Coming Soon state */}
              {!teamProjectsLoading && teamProjectsError && (
                <div className="p-8 text-center">
                  <div
                    className="h-14 w-14 rounded-full bg-accent-500/10 flex items-center justify-center mx-auto mb-4">
                    <Briefcase
                      className="h-7 w-7 text-accent-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                  </div>
                  <p className="text-base font-black text-[var(--text-primary)]">Coming Soon</p>
                  <p className="text-[var(--text-muted)] mt-1 text-sm font-bold">
                    Team project allocations will appear here once the feature is deployed.
                  </p>
                </div>
              )}

              {/* Empty state */}
              {!teamProjectsLoading && !teamProjectsError && teamProjectsData && teamProjectsData.teamMembers.length === 0 && (
                <div className="p-8 text-center">
                  <div
                    className="h-14 w-14 rounded-full bg-surface-500/10 flex items-center justify-center mx-auto mb-4">
                    <FolderKanban className="h-7 w-7 text-surface-400"/>
                  </div>
                  <p className="text-base font-black text-[var(--text-primary)]">No Project Data</p>
                  <p className="text-[var(--text-muted)] mt-1 text-sm font-bold">
                    No team members have project allocations yet.
                  </p>
                </div>
              )}

              {/* Team member project cards */}
              {!teamProjectsLoading && !teamProjectsError && teamProjectsData && teamProjectsData.teamMembers.length > 0 && (
                <div className="space-y-4">
                  {teamProjectsData.teamMembers.map((member: TeamMemberWithProjects) => (
                    <div
                      key={member.employeeId}
                      className="p-4 rounded-xl border border-[var(--border-main)]/30 bg-[var(--bg-secondary)]/30 dark:bg-[var(--bg-secondary)]/20 hover:border-[var(--border-main)] transition-all duration-200"
                    >
                      {/* Member header */}
                      <div className="row-between mb-2">
                        <div className="flex items-center gap-4">
                          <div
                            className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 text-white flex items-center justify-center font-black text-xs shadow-[var(--shadow-elevated)]">
                            {member.employeeName?.charAt(0)}
                          </div>
                          <div>
                            <button
                              onClick={() => router.push(`/employees/${member.employeeId}`)}
                              className="font-extrabold text-[var(--text-primary)] hover:text-accent-600 dark:hover:text-accent-400 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                            >
                              {member.employeeName}
                            </button>
                            <p className="text-xs font-bold text-[var(--text-muted)]">
                              {member.designation} &middot; {member.employeeCode}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {member.isOverAllocated && (
                            <div
                              className="flex items-center gap-1 text-xs font-black text-danger-600 dark:text-danger-400 bg-danger-500/10 px-2.5 py-1 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                              <AlertTriangle className="h-3.5 w-3.5"/>
                              Over-allocated
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <div
                              className="w-24 h-2 rounded-full bg-[var(--bg-secondary)] dark:bg-surface-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getAllocationColor(member.totalAllocation)}`}
                                style={{width: `${Math.min(member.totalAllocation, 100)}%`}}
                              />
                            </div>
                            <span
                              className={`text-sm font-black tabular-nums ${getAllocationTextColor(member.totalAllocation)}`}>
                              {member.totalAllocation}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Projects list */}
                      {member.projects.length > 0 ? (
                        <div className="space-y-1.5 ml-11">
                          {member.projects.map((project: TeamMemberProjectAllocation) => (
                            <div
                              key={project.projectId}
                              className="row-between p-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-all duration-200 group"
                            >
                              <div className="flex items-center gap-4">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${priorityDotColor[project.projectPriority] || 'bg-surface-400'}`}/>
                                <button
                                  onClick={() => router.push(`/projects/${project.projectId}`)}
                                  className="font-bold text-sm text-[var(--text-primary)] hover:text-accent-600 dark:hover:text-accent-400 transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                                >
                                  {project.projectName}
                                  <ExternalLink
                                    className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                </button>
                                <Badge
                                  variant="outline"
                                  className={`text-2xs font-bold uppercase tracking-tighter border ${statusBadgeStyles[project.projectStatus] || statusBadgeStyles.DRAFT}`}
                                >
                                  {project.projectStatus.replace(/_/g, ' ')}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-muted)]">
                                <span className="hidden sm:inline">{formatRole(project.role)}</span>
                                <span
                                  className="tabular-nums font-black text-[var(--text-primary)]">{project.allocationPercentage}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="ml-14 text-sm font-bold text-[var(--text-muted)] italic">
                          No active project assignments
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Global Alert Section */}
        <AnimatePresence>
          {teamAlerts && teamAlerts.length > 0 && (
            <motion.div
              initial={{height: 0, opacity: 0}}
              animate={{height: 'auto', opacity: 1}}
              exit={{height: 0, opacity: 0}}
            >
              <Card
                className="border-0 shadow-[var(--shadow-elevated)] bg-danger-50 dark:bg-danger-950 overflow-hidden">
                <CardContent className="p-4">
                  <div className="row-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-7 w-7 rounded-lg bg-danger-500 text-white flex items-center justify-center shadow-[var(--shadow-elevated)]">
                        <AlertTriangle className="h-4 w-4"/>
                      </div>
                      <h2 className="text-sm font-black text-[var(--text-primary)] tracking-tight">System Alerts</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamAlerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="p-4 rounded-xl bg-[var(--glass-bg)] border border-danger-500/10">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-danger-500 text-white font-black px-1.5 py-0 text-2xs">CRITICAL</Badge>
                          <span
                            className="text-2xs font-black text-[var(--text-muted)] uppercase tracking-widest">{alert.type}</span>
                        </div>
                        <h4 className="font-extrabold text-xs text-[var(--text-primary)] mb-0.5">{alert.title}</h4>
                        <p
                          className="text-2xs font-bold text-[var(--text-muted)] leading-relaxed line-clamp-2">{alert.description}</p>
                        <div
                          className="mt-2 pt-2 border-t border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50 row-between">
                          <span
                            className="text-2xs font-black uppercase text-accent-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">Action: {alert.actionRequired}</span>
                          <Button variant="ghost" size="sm" className="font-black text-2xs h-6 px-2">RESOLVE</Button>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Goals Overview */}
          <Card className="border-0 shadow-[var(--shadow-elevated)]">
            <CardHeader className="py-2.5 px-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target
                  className="h-4 w-4 text-accent-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                Team Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-success-50 dark:bg-success-900/20 rounded-lg text-center">
                    <p
                      className="text-lg font-bold text-success-600 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                      {teamPerformance.goalsOnTrack}
                    </p>
                    <p className="text-2xs text-[var(--text-secondary)]">
                      On Track
                    </p>
                  </div>
                  <div className="p-2 bg-warning-50 dark:bg-warning-900/20 rounded-lg text-center">
                    <p
                      className="text-lg font-bold text-warning-600 dark:text-warning-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                      {teamPerformance.goalsAtRisk}
                    </p>
                    <p className="text-2xs text-[var(--text-secondary)]">
                      At Risk
                    </p>
                  </div>
                  <div className="p-2 bg-accent-50 dark:bg-accent-900/20 rounded-lg text-center">
                    <p
                      className="text-lg font-bold text-accent-600 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                      {teamPerformance.goalsCompleted}
                    </p>
                    <p className="text-2xs text-[var(--text-secondary)]">
                      Completed
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-main)]">
                  <div className="row-between mb-1">
                    <span className="text-xs text-[var(--text-secondary)]">
                      Completion Rate
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {teamPerformance.goalCompletionRate?.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-2">
                    <div
                      className="bg-accent-600 h-2 rounded-full transition-all"
                      style={{width: `${teamPerformance.goalCompletionRate}%`}}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* One-on-Ones & Feedback */}
          <Card className="border-0 shadow-[var(--shadow-elevated)]">
            <CardHeader className="py-2.5 px-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users
                  className="h-4 w-4 text-accent-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                Engagement & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="space-y-1.5">
                <div className="p-2.5 bg-[var(--bg-secondary)] rounded-lg">
                  <div className="row-between">
                    <span className="text-xs text-[var(--text-secondary)]">
                      One-on-Ones This Month
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {teamPerformance.oneOnOnesCompletedThisMonth}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-2xs mt-0.5">
                    <span className="text-[var(--text-muted)]">Scheduled:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {teamPerformance.oneOnOnesScheduled}
                    </span>
                    {teamPerformance.oneOnOnesOverdue > 0 && (
                      <span
                        className="text-danger-600 dark:text-danger-400 flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                        <AlertCircle className="h-3 w-3"/>
                        {teamPerformance.oneOnOnesOverdue} overdue
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-[var(--bg-secondary)] rounded-lg">
                  <div className="row-between">
                    <span className="text-xs text-[var(--text-secondary)]">
                      Average Feedback Score
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {teamPerformance.avgFeedbackScore?.toFixed(1)}
                    </span>
                  </div>
                  {teamPerformance.pendingFeedbackRequests > 0 && (
                    <div className="flex items-center gap-1 text-2xs mt-0.5">
                      <Clock
                        className="h-3 w-3 text-warning-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                      <span
                        className="text-warning-600 dark:text-warning-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                        {teamPerformance.pendingFeedbackRequests} pending
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-[var(--bg-secondary)] rounded-lg">
                  <div className="row-between">
                    <span className="text-xs text-[var(--text-secondary)]">
                      Training Completion
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
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
