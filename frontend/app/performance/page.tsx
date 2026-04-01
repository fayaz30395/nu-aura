'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Flag,
  ClipboardCheck,
  MessageSquare,
  CalendarDays,
  Users,
  BarChart3,
  CheckCircle,
  Clock,
  TrendingUp,
  SlidersHorizontal,
  Grid3X3,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import {
  useAllGoals,
  usePerformanceActiveCycles,
  useOkrDashboardSummary,
  useMyPending360Reviews,
} from '@/lib/hooks/queries/usePerformance';
import { AppLayout } from '@/components/layout';
import { PageErrorFallback } from '@/components/errors/PageErrorFallback';
import { SkeletonStatCard } from '@/components/ui/Skeleton';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

interface DashboardStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  averageProgress: number;
  activeReviewCycles: number;
  pendingReviews: number;
  okrObjectives: number;
  okrProgress: number;
  pending360Reviews: number;
}

const performanceModules = [
  {
    id: 'goals',
    title: 'Goals',
    description: 'Set and track individual, team, and organizational goals',
    href: '/performance/goals',
    icon: Flag,
    color: 'bg-accent-500',
    lightColor: 'bg-accent-50',
    textColor: 'text-accent-600',
  },
  {
    id: 'okr',
    title: 'OKR Management',
    description: 'Objectives and Key Results for strategic alignment',
    href: '/performance/okr',
    icon: SlidersHorizontal,
    color: 'bg-accent-700',
    lightColor: 'bg-accent-50',
    textColor: 'text-accent-600',
  },
  {
    id: 'reviews',
    title: 'Performance Reviews',
    description: 'Conduct and manage employee performance reviews',
    href: '/performance/reviews',
    icon: ClipboardCheck,
    color: 'bg-success-500',
    lightColor: 'bg-success-50',
    textColor: 'text-success-600',
  },
  {
    id: '360-feedback',
    title: '360 Feedback',
    description: 'Multi-rater feedback from peers, managers, and direct reports',
    href: '/performance/360-feedback',
    icon: Users,
    color: 'bg-warning-500',
    lightColor: 'bg-warning-50',
    textColor: 'text-warning-600',
  },
  {
    id: 'feedback',
    title: 'Continuous Feedback',
    description: 'Give and receive ongoing feedback throughout the year',
    href: '/performance/feedback',
    icon: MessageSquare,
    color: 'bg-accent-500',
    lightColor: 'bg-accent-50',
    textColor: 'text-accent-700',
  },
  {
    id: 'cycles',
    title: 'Review Cycles',
    description: 'Manage review periods and deadlines',
    href: '/performance/cycles',
    icon: CalendarDays,
    color: 'bg-accent-500',
    lightColor: 'bg-accent-50',
    textColor: 'text-accent-600',
  },
  {
    id: 'pip',
    title: 'PIPs',
    description: 'Create and track Performance Improvement Plans with check-ins',
    href: '/performance/pip',
    icon: AlertCircle,
    color: 'bg-danger-500',
    lightColor: 'bg-danger-50',
    textColor: 'text-danger-600',
  },
  {
    id: 'calibration',
    title: 'Calibration',
    description: 'Finalize ratings with distribution view and bell-curve check',
    href: '/performance/calibration',
    icon: Sliders,
    color: 'bg-accent-500',
    lightColor: 'bg-accent-50',
    textColor: 'text-accent-600',
  },
  {
    id: '9box',
    title: '9-Box Grid',
    description: 'Talent segmentation by performance and potential',
    href: '/performance/9box',
    icon: Grid3X3,
    color: 'bg-danger-500',
    lightColor: 'bg-danger-50',
    textColor: 'text-danger-600',
  },
  {
    id: 'competency-matrix',
    title: 'Competency Matrix',
    description: 'Manage competency frameworks, assess skills, and identify gaps',
    href: '/performance/competency-matrix',
    icon: BarChart3,
    color: 'bg-accent-500',
    lightColor: 'bg-accent-50',
    textColor: 'text-accent-700',
  },
];

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) => (
  <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] dark:border-[var(--border-main)] p-4 shadow-sm skeuo-card">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--text-muted)] skeuo-deboss">{title}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] mt-1 skeuo-emboss">{value}</p>
        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </div>
);

export default function PerformancePage() {
  const goalsQuery = useAllGoals(0, 20);
  const cyclesQuery = usePerformanceActiveCycles();
  const okrQuery = useOkrDashboardSummary();
  const pending360Query = useMyPending360Reviews();

  const stats: DashboardStats = useMemo(() => {
    const goals = goalsQuery.data?.content || [];
    const cycles = cyclesQuery.data || [];
    const okrSummary = okrQuery.data;
    const pending360 = pending360Query.data || [];

    const activeGoals = goals.filter((g) => g.status === 'ACTIVE' || g.status === 'IN_PROGRESS');
    const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
    const avgProgress = goals.length > 0
      ? Math.round(goals.reduce((acc: number, g) => acc + (g.progressPercentage || 0), 0) / goals.length)
      : 0;

    return {
      totalGoals: goals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      averageProgress: avgProgress,
      activeReviewCycles: cycles.length,
      pendingReviews: 0,
      okrObjectives: okrSummary?.totalObjectives || 0,
      okrProgress: Math.round(okrSummary?.averageProgress || 0),
      pending360Reviews: pending360.length,
    };
  }, [goalsQuery.data, cyclesQuery.data, okrQuery.data, pending360Query.data]);

  const loading = goalsQuery.isLoading || cyclesQuery.isLoading || okrQuery.isLoading || pending360Query.isLoading;
  const hasError = goalsQuery.isError || cyclesQuery.isError || okrQuery.isError || pending360Query.isError;

  if (hasError) {
    return (
      <AppLayout activeMenuItem="performance">
        <PageErrorFallback
          title="Failed to load performance data"
          error={new Error('Unable to fetch performance metrics. Please check your connection and try again.')}
          onReset={() => {
            goalsQuery.refetch();
            cyclesQuery.refetch();
            okrQuery.refetch();
            pending360Query.refetch();
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="performance">
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] skeuo-emboss">Performance Management</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1 skeuo-deboss">
          Track goals, conduct reviews, and manage employee performance
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              title="Active Goals"
              value={stats.activeGoals}
              subtitle={`${stats.completedGoals} completed`}
              icon={Flag}
              color="bg-accent-500"
            />
            <StatCard
              title="Goal Progress"
              value={`${stats.averageProgress}%`}
              subtitle="Average across all goals"
              icon={TrendingUp}
              color="bg-success-500"
            />
            <StatCard
              title="OKR Objectives"
              value={stats.okrObjectives}
              subtitle={`${stats.okrProgress}% progress`}
              icon={SlidersHorizontal}
              color="bg-accent-700"
            />
            <StatCard
              title="Pending Reviews"
              value={stats.pending360Reviews}
              subtitle="360 feedback requests"
              icon={Clock}
              color="bg-warning-500"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      {stats.pending360Reviews > 0 && (
        <div className="mb-8 p-4 tint-orange border border-[var(--status-warning-border)] rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-warning-100 dark:bg-warning-900/40 rounded-lg">
                <Clock className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="font-medium text-warning-800 dark:text-warning-300">
                  You have {stats.pending360Reviews} pending 360 feedback request(s)
                </p>
                <p className="text-sm text-warning-600 dark:text-warning-400">
                  Complete your feedback to help your colleagues grow
                </p>
              </div>
            </div>
            <Link
              href="/performance/360-feedback"
              className="px-4 py-2 bg-warning-600 hover:bg-warning-700 dark:bg-warning-700 dark:hover:bg-warning-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Review Now
            </Link>
          </div>
        </div>
      )}

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {performanceModules.map((module) => {
          // Determine permission gate per module
          let permission: string | null = null;
          switch (module.id) {
            case 'goals':
            case 'okr':
              // Goals and OKRs are self-service — no permission gate required
              permission = null;
              break;
            case 'reviews':
              permission = Permissions.REVIEW_VIEW;
              break;
            case '360-feedback':
              permission = Permissions.FEEDBACK_360_VIEW;
              break;
            case 'feedback':
              permission = Permissions.FEEDBACK_CREATE;
              break;
            case 'cycles':
              permission = Permissions.REVIEW_VIEW;
              break;
            case 'pip':
              permission = Permissions.PIP_VIEW;
              break;
            case 'calibration':
              permission = Permissions.CALIBRATION_VIEW;
              break;
            case '9box':
              permission = Permissions.REVIEW_VIEW;
              break;
            case 'competency-matrix':
              permission = Permissions.REVIEW_VIEW;
              break;
            default:
              permission = null;
          }

          const CardLink = (
            <Link
              href={module.href}
              aria-label={`Go to ${module.title} management`}
              className="group card-interactive rounded-xl border border-[var(--border-main)] dark:border-[var(--border-main)] shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden skeuo-card"
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg ${module.lightColor}`}>
                    <module.icon className={`h-5 w-5 ${module.textColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-secondary)] group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{module.description}</p>
                  </div>
                </div>
              </div>
              <div className={`h-1 ${module.color} transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left`} />
            </Link>
          );

          if (permission) {
            return (
              <PermissionGate key={module.id} permission={permission} fallback={null}>
                {CardLink}
              </PermissionGate>
            );
          }

          return <div key={module.id}>{CardLink}</div>;
        })}
      </div>

      {/* Getting Started Section */}
      <div className="mt-6 skeuo-card rounded-xl border border-[var(--border-main)] dark:border-[var(--border-main)] p-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-secondary)] mb-3 skeuo-emboss">Getting Started</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 tint-info rounded-lg border border-[var(--status-info-border)]">
            <CheckCircle className="h-6 w-6 text-accent-600 dark:text-accent-400 mb-2" />
            <h3 className="font-medium text-[var(--text-primary)]">Set SMART Goals</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Make goals Specific, Measurable, Achievable, Relevant, and Time-bound
            </p>
          </div>
          <div className="p-4 tint-success rounded-lg border border-[var(--status-success-border)]">
            <MessageSquare className="h-6 w-6 text-success-600 dark:text-success-400 mb-2" />
            <h3 className="font-medium text-[var(--text-primary)]">Give Regular Feedback</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Continuous feedback helps improve performance year-round
            </p>
          </div>
          <div className="p-4 tint-info rounded-lg border border-[var(--status-info-border)]">
            <BarChart3 className="h-6 w-6 text-accent-800 dark:text-accent-600 mb-2" />
            <h3 className="font-medium text-[var(--text-primary)]">Track Progress</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Update your goals and OKRs regularly to stay on track
            </p>
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
