'use client';

import {useMemo} from 'react';
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
import {AppLayout} from '@/components/layout';
import {PageErrorFallback} from '@/components/errors/PageErrorFallback';
import {SkeletonStatCard} from '@/components/ui/Skeleton';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {Button} from '@/components/ui/Button';
import {useRouter} from 'next/navigation';

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
    color: "bg-accent",
    lightColor: "bg-accent-subtle",
    textColor: "text-accent",
  },
  {
    id: 'okr',
    title: 'OKR Management',
    description: 'Objectives and Key Results for strategic alignment',
    href: '/performance/okr',
    icon: SlidersHorizontal,
    color: "bg-accent",
    lightColor: "bg-accent-subtle",
    textColor: "text-accent",
  },
  {
    id: 'reviews',
    title: 'Performance Reviews',
    description: 'Conduct and manage employee performance reviews',
    href: '/performance/reviews',
    icon: ClipboardCheck,
    color: "bg-status-success-bg",
    lightColor: "bg-status-success-bg",
    textColor: "text-status-success-text",
  },
  {
    id: '360-feedback',
    title: '360 Feedback',
    description: 'Multi-rater feedback from peers, managers, and direct reports',
    href: '/performance/360-feedback',
    icon: Users,
    color: "bg-status-warning-bg",
    lightColor: "bg-status-warning-bg",
    textColor: "text-status-warning-text",
  },
  {
    id: 'feedback',
    title: 'Continuous Feedback',
    description: 'Give and receive ongoing feedback throughout the year',
    href: '/performance/feedback',
    icon: MessageSquare,
    color: "bg-accent",
    lightColor: "bg-accent-subtle",
    textColor: "text-accent",
  },
  {
    id: 'cycles',
    title: 'Review Cycles',
    description: 'Manage review periods and deadlines',
    href: '/performance/cycles',
    icon: CalendarDays,
    color: "bg-accent",
    lightColor: "bg-accent-subtle",
    textColor: "text-accent",
  },
  {
    id: 'pip',
    title: 'PIPs',
    description: 'Create and track Performance Improvement Plans with check-ins',
    href: '/performance/pip',
    icon: AlertCircle,
    color: "bg-status-danger-bg",
    lightColor: "bg-status-danger-bg",
    textColor: "text-status-danger-text",
  },
  {
    id: 'calibration',
    title: 'Calibration',
    description: 'Finalize ratings with distribution view and bell-curve check',
    href: '/performance/calibration',
    icon: Sliders,
    color: "bg-accent",
    lightColor: "bg-accent-subtle",
    textColor: "text-accent",
  },
  {
    id: '9box',
    title: '9-Box Grid',
    description: 'Talent segmentation by performance and potential',
    href: '/performance/9box',
    icon: Grid3X3,
    color: "bg-status-danger-bg",
    lightColor: "bg-status-danger-bg",
    textColor: "text-status-danger-text",
  },
  {
    id: 'competency-matrix',
    title: 'Competency Matrix',
    description: 'Manage competency frameworks, assess skills, and identify gaps',
    href: '/performance/competency-matrix',
    icon: BarChart3,
    color: "bg-accent",
    lightColor: "bg-accent-subtle",
    textColor: "text-accent",
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
  <div
    className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] dark:border-[var(--border-main)] p-4 shadow-[var(--shadow-card)] skeuo-card">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--text-muted)] skeuo-deboss">{title}</p>
        <p
          className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] mt-1 skeuo-emboss">{value}</p>
        {subtitle && <p className="text-caption mt-1">{subtitle}</p>}
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className='h-5 w-5 text-inverse'/>
      </div>
    </div>
  </div>
);

const PERFORMANCE_ALLOWED_ROLES = [
  'SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'HR_MANAGER',
  'MANAGER', 'TEAM_LEAD', 'SKIP_LEVEL_MANAGER', 'REPORTING_MANAGER',
];

export default function PerformancePage() {
  const router = useRouter();
  const {hasAnyRole, isReady} = usePermissions();

  // P0-002: Block EMPLOYEE/non-management roles from accessing admin performance hub
  const hasAccess = hasAnyRole(...PERFORMANCE_ALLOWED_ROLES);

  // All hooks MUST be called before any early return (React rules of hooks)
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

  // P0-002: Block EMPLOYEE/non-management roles AFTER all hooks
  if (isReady && !hasAccess) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <TrendingUp className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4"/>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Access Restricted</h2>
          <p className="text-[var(--text-muted)] max-w-md mb-6">
            You don&apos;t have permission to access the Performance Management hub.
            View your goals and reviews from My Dashboard.
          </p>
          <Button onClick={() => router.push('/me/dashboard')} className="skeuo-button">
            Go to My Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

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
          <h1
            className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] skeuo-emboss">Performance
            Management</h1>
          <p className="text-body-muted mt-1 skeuo-deboss">
            Track goals, conduct reviews, and manage employee performance
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            <>
              <SkeletonStatCard/>
              <SkeletonStatCard/>
              <SkeletonStatCard/>
              <SkeletonStatCard/>
            </>
          ) : (
            <>
              <StatCard
                title="Active Goals"
                value={stats.activeGoals}
                subtitle={`${stats.completedGoals} completed`}
                icon={Flag}
                color="bg-accent"
              />
              <StatCard
                title="Goal Progress"
                value={`${stats.averageProgress}%`}
                subtitle="Average across all goals"
                icon={TrendingUp}
                color="bg-status-success-bg"
              />
              <StatCard
                title="OKR Objectives"
                value={stats.okrObjectives}
                subtitle={`${stats.okrProgress}% progress`}
                icon={SlidersHorizontal}
                color="bg-accent"
              />
              <StatCard
                title="Pending Reviews"
                value={stats.pending360Reviews}
                subtitle="360 feedback requests"
                icon={Clock}
                color="bg-status-warning-bg"
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        {stats.pending360Reviews > 0 && (
          <div className="mb-8 p-4 tint-orange border border-[var(--status-warning-border)] rounded-lg">
            <div className="row-between">
              <div className="flex items-center gap-4">
                <div className='p-2 bg-status-warning-bg rounded-lg'>
                  <Clock className='h-5 w-5 text-status-warning-text'/>
                </div>
                <div>
                  <p className='font-medium text-status-warning-text'>
                    You have {stats.pending360Reviews} pending 360 feedback request(s)
                  </p>
                  <p className='text-sm text-status-warning-text'>
                    Complete your feedback to help your colleagues grow
                  </p>
                </div>
              </div>
              <Link
                href="/performance/360-feedback"
                className='px-4 py-2 bg-status-warning-bg hover:bg-status-warning-bg text-inverse rounded-lg text-sm font-medium transition-colors'
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
                className="group card-interactive rounded-xl border border-[var(--border-main)] dark:border-[var(--border-main)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all duration-200 overflow-hidden skeuo-card"
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg ${module.lightColor}`}>
                      <module.icon className={`h-5 w-5 ${module.textColor}`}/>
                    </div>
                    <div className="flex-1">
                      <h3
                        className='text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-secondary)] group-hover:text-accent transition-colors'>
                        {module.title}
                      </h3>
                      <p className="text-caption mt-0.5">{module.description}</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`h-1 ${module.color} transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left`}/>
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
        <div
          className="mt-6 skeuo-card rounded-xl border border-[var(--border-main)] dark:border-[var(--border-main)] p-4">
          <h2
            className="text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-secondary)] mb-4 skeuo-emboss">Getting
            Started</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 tint-info rounded-lg border border-[var(--status-info-border)]">
              <CheckCircle className='h-6 w-6 text-accent mb-2'/>
              <h3 className="font-medium text-[var(--text-primary)]">Set SMART Goals</h3>
              <p className="text-body-secondary mt-1">
                Make goals Specific, Measurable, Achievable, Relevant, and Time-bound
              </p>
            </div>
            <div className="p-4 tint-success rounded-lg border border-[var(--status-success-border)]">
              <MessageSquare className='h-6 w-6 text-status-success-text mb-2'/>
              <h3 className="font-medium text-[var(--text-primary)]">Give Regular Feedback</h3>
              <p className="text-body-secondary mt-1">
                Continuous feedback helps improve performance year-round
              </p>
            </div>
            <div className="p-4 tint-info rounded-lg border border-[var(--status-info-border)]">
              <BarChart3 className='h-6 w-6 text-accent mb-2'/>
              <h3 className="font-medium text-[var(--text-primary)]">Track Progress</h3>
              <p className="text-body-secondary mt-1">
                Update your goals and OKRs regularly to stay on track
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
