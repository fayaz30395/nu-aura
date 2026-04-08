'use client';

import {useCallback, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout/AppLayout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {EmptyState} from '@/components/ui/EmptyState';
import {
  useAddEvaluation,
  useAllProbations,
  useConfirmEmployee,
  useExtendProbation,
  useProbationsByStatus,
  useProbationsEndingSoon,
  useProbationStatistics,
} from '@/lib/hooks/queries/useProbation';
import {motion} from 'framer-motion';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AlertTriangle, Calendar, CheckCircle, ClipboardList, Clock, Star, UserCheck, Users,} from 'lucide-react';
import type {
  EvaluationType,
  ProbationPeriodResponse,
  ProbationRecommendation,
  ProbationStatus,
} from '@/lib/types/hrms/probation';

// ── Status configuration ─────────────────────────────────────
const getStatusConfig = (status: ProbationStatus) => {
  switch (status) {
    case 'ACTIVE':
      return {bg: 'bg-accent-100 dark:bg-accent-900/30', text: 'text-accent-700 dark:text-accent-400', label: 'Active'};
    case 'EXTENDED':
      return {
        bg: 'bg-warning-100 dark:bg-warning-900/30',
        text: 'text-warning-700 dark:text-warning-400',
        label: 'Extended'
      };
    case 'CONFIRMED':
      return {
        bg: 'bg-success-100 dark:bg-success-900/30',
        text: 'text-success-700 dark:text-success-400',
        label: 'Confirmed'
      };
    case 'FAILED':
      return {bg: 'bg-danger-100 dark:bg-danger-900/30', text: 'text-danger-700 dark:text-danger-400', label: 'Failed'};
    case 'TERMINATED':
      return {
        bg: 'bg-danger-100 dark:bg-danger-900/30',
        text: 'text-danger-700 dark:text-danger-400',
        label: 'Terminated'
      };
    case 'ON_HOLD':
      return {
        bg: 'bg-warning-100 dark:bg-warning-900/30',
        text: 'text-warning-700 dark:text-warning-400',
        label: 'On Hold'
      };
    default:
      return {
        bg: 'bg-surface-100 dark:bg-surface-900/30',
        text: 'text-surface-700 dark:text-surface-400',
        label: status
      };
  }
};

// ── Evaluation form schema ───────────────────────────────────
const evaluationFormSchema = z.object({
  probationPeriodId: z.string().min(1, 'Probation ID is required'),
  evaluationType: z.enum([
    'WEEKLY',
    'BI_WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'MID_PROBATION',
    'FINAL',
  ] as const),
  performanceRating: z.coerce.number().min(1).max(5),
  attendanceRating: z.coerce.number().min(1).max(5),
  communicationRating: z.coerce.number().min(1).max(5),
  teamworkRating: z.coerce.number().min(1).max(5),
  technicalSkillsRating: z.coerce.number().min(1).max(5),
  strengths: z.string().optional(),
  areasForImprovement: z.string().optional(),
  managerComments: z.string().optional(),
  recommendation: z.enum(['CONFIRM', 'EXTEND', 'TERMINATE', 'NEEDS_IMPROVEMENT', 'ON_TRACK'] as const),
  recommendationReason: z.string().optional(),
  isFinalEvaluation: z.boolean().optional(),
});

type EvaluationFormValues = z.infer<typeof evaluationFormSchema>;

const EVALUATION_TYPE_LABELS: Record<EvaluationType, string> = {
  WEEKLY: 'Weekly Check-in',
  BI_WEEKLY: 'Bi-Weekly Check-in',
  MONTHLY: 'Monthly Review',
  QUARTERLY: 'Quarterly Review',
  MID_PROBATION: 'Mid-Probation Review',
  FINAL: 'Final Evaluation',
};

const RECOMMENDATION_LABELS: Record<ProbationRecommendation, string> = {
  CONFIRM: 'Recommend Confirmation',
  EXTEND: 'Recommend Extension',
  TERMINATE: 'Recommend Termination',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
  ON_TRACK: 'On Track',
};

type TabKey = 'active' | 'upcoming' | 'history' | 'evaluate';

export default function ProbationPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [activePage, setActivePage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [evaluateTarget, setEvaluateTarget] = useState<ProbationPeriodResponse | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Queries
  const {data: activeData, isLoading: isActiveLoading} = useAllProbations(activePage, 20);
  const {data: endingSoon = [], isLoading: isUpcomingLoading} = useProbationsEndingSoon(14);
  const {data: historyData, isLoading: isHistoryLoading} = useProbationsByStatus(
    'CONFIRMED',
    historyPage,
    20
  );
  const {data: statistics, isLoading: _isStatsLoading} = useProbationStatistics();

  // Mutations
  const confirmEmployee = useConfirmEmployee();
  const _extendProbation = useExtendProbation();
  const addEvaluation = useAddEvaluation();

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: {errors, isSubmitting},
  } = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationFormSchema),
    defaultValues: {
      evaluationType: 'MONTHLY',
      performanceRating: 3,
      attendanceRating: 3,
      communicationRating: 3,
      teamworkRating: 3,
      technicalSkillsRating: 3,
      recommendation: 'ON_TRACK',
      isFinalEvaluation: false,
    },
  });

  const onSubmitEvaluation = useCallback(
    async (data: EvaluationFormValues) => {
      try {
        await addEvaluation.mutateAsync({
          probationPeriodId: data.probationPeriodId,
          evaluationType: data.evaluationType,
          performanceRating: data.performanceRating,
          attendanceRating: data.attendanceRating,
          communicationRating: data.communicationRating,
          teamworkRating: data.teamworkRating,
          technicalSkillsRating: data.technicalSkillsRating,
          strengths: data.strengths,
          areasForImprovement: data.areasForImprovement,
          managerComments: data.managerComments,
          recommendation: data.recommendation,
          recommendationReason: data.recommendationReason,
          isFinalEvaluation: data.isFinalEvaluation,
        });
        setSubmitSuccess(true);
        reset();
        setEvaluateTarget(null);
        setTimeout(() => {
          setSubmitSuccess(false);
          setActiveTab('active');
        }, 2000);
      } catch {
        // Error handled by React Query
      }
    },
    [addEvaluation, reset]
  );

  const handleStartEvaluation = useCallback(
    (probation: ProbationPeriodResponse) => {
      setEvaluateTarget(probation);
      setValue('probationPeriodId', probation.id);
      setActiveTab('evaluate');
    },
    [setValue]
  );

  if (!hasHydrated) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <SkeletonTable rows={5} columns={5} />
        </div>
      </AppLayout>
    );
  }
  if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  const tabs: { key: TabKey; label: string }[] = [
    {key: 'active', label: 'Active Probations'},
    {key: 'upcoming', label: 'Upcoming Reviews'},
    {key: 'history', label: 'History'},
  ];

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ── Reusable probation table ───────────────────────────────
  const renderProbationTable = (
    records: ProbationPeriodResponse[],
    showActions = false
  ) => (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] overflow-hidden skeuo-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
          <tr className="border-b border-[var(--border-main)] bg-[var(--bg-secondary)]">
            <th
              className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-2">
              Employee
            </th>
            <th
              className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-2">
              Period
            </th>
            <th
              className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-2">
              Status
            </th>
            <th
              className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-2">
              Days Left
            </th>
            <th
              className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-2">
              Manager
            </th>
            <th
              className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-2">
              Rating
            </th>
            {showActions && (
              <th
                className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-2">
                Actions
              </th>
            )}
          </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-main)]">
          {records.map((probation) => {
            const statusConfig = getStatusConfig(probation.status);
            return (
              <tr
                key={probation.id}
                className="hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {probation.employeeName}
                    </p>
                    <p className="text-caption">
                      {probation.department} {probation.designation ? `- ${probation.designation}` : ''}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-body-secondary">
                      {formatDate(probation.startDate)} - {formatDate(probation.endDate)}
                    </p>
                    <p className="text-caption">
                      {probation.durationMonths} months
                      {probation.extensionCount > 0 && (
                        <span className="text-warning-600 dark:text-warning-400">
                            {' '}(+{probation.totalExtensionDays}d ext.)
                          </span>
                      )}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                    >
                      {statusConfig.label}
                    </span>
                  {probation.isOverdue && (
                    <span
                      className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400">
                        Overdue
                      </span>
                  )}
                </td>
                <td className="px-6 py-4">
                    <span
                      className={`text-sm font-medium ${
                        probation.daysRemaining <= 7
                          ? 'text-danger-600 dark:text-danger-400'
                          : probation.daysRemaining <= 30
                            ? 'text-warning-600 dark:text-warning-400'
                            : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {probation.daysRemaining > 0
                        ? `${probation.daysRemaining} days`
                        : probation.status === 'CONFIRMED'
                          ? 'Completed'
                          : 'Overdue'}
                    </span>
                </td>
                <td className="px-6 py-4 text-body-secondary">
                  {probation.managerName || '-'}
                </td>
                <td className="px-6 py-4">
                  {probation.averageRating ? (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-warning-500 fill-warning-500"/>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                          {probation.averageRating.toFixed(1)}
                        </span>
                    </div>
                  ) : (
                    <span className="text-body-muted">-</span>
                  )}
                </td>
                {showActions && (
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {(probation.status === 'ACTIVE' || probation.status === 'EXTENDED') && (
                        <>
                          <button
                            onClick={() => handleStartEvaluation(probation)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-accent-100 text-accent-700 hover:bg-accent-200 dark:bg-accent-900/30 dark:text-accent-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          >
                            Evaluate
                          </button>
                          <PermissionGate permission={Permissions.PROBATION_MANAGE}>
                            <button
                              onClick={() =>
                                confirmEmployee.mutate({
                                  probationId: probation.id,
                                  data: {generateConfirmationLetter: true},
                                })
                              }
                              disabled={confirmEmployee.isPending}
                              className="text-xs px-2.5 py-1 rounded-lg bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/30 dark:text-success-400 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                            >
                              Confirm
                            </button>
                          </PermissionGate>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPagination = (
    data: { number: number; totalPages: number; totalElements: number } | undefined,
    page: number,
    setPage: (fn: (p: number) => number) => void
  ) => {
    if (!data || data.totalPages <= 1) return null;
    return (
      <div className="row-between mt-4">
        <p className="text-body-muted">
          Page {data.number + 1} of {data.totalPages} ({data.totalElements} total)
        </p>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-4 py-1.5 text-sm border border-[var(--border-main)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Previous
          </button>
          <button
            disabled={page >= data.totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-1.5 text-sm border border-[var(--border-main)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <AppLayout activeMenuItem="probation">
      <motion.div
        className="space-y-6"
        initial={{opacity: 0, y: 8}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
      >
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
            Probation Management
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
            Track probation periods, reviews, and confirmations
          </p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                label: 'Active',
                value: statistics.totalActiveProbations,
                icon: Users,
                gradient: 'from-accent-500 to-accent-700'
              },
              {
                label: 'Overdue',
                value: statistics.overdueCount,
                icon: AlertTriangle,
                gradient: 'from-danger-500 to-danger-600'
              },
              {
                label: 'Ending This Week',
                value: statistics.endingThisWeek,
                icon: Clock,
                gradient: 'from-warning-500 to-warning-600'
              },
              {
                label: 'Evaluations Due',
                value: statistics.evaluationsDue,
                icon: ClipboardList,
                gradient: 'from-accent-700 to-accent-800'
              },
              {
                label: 'Confirmed (Month)',
                value: statistics.confirmationsThisMonth,
                icon: CheckCircle,
                gradient: 'from-success-500 to-success-600'
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 hover:shadow-[var(--shadow-dropdown)] transition-all duration-200 skeuo-card"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                    <stat.icon className="h-5 w-5 text-white"/>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">{stat.label}</p>
                    <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-[var(--border-main)]">
          <nav className="flex gap-6 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  activeTab === tab.key
                    ? 'border-accent-700 text-accent-700 dark:text-accent-400'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-main)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {evaluateTarget && (
              <button
                onClick={() => setActiveTab('evaluate')}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  activeTab === 'evaluate'
                    ? 'border-accent-700 text-accent-700 dark:text-accent-400'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Evaluate: {evaluateTarget.employeeName}
              </button>
            )}
          </nav>
        </div>

        {/* ── Active Probations ── */}
        {activeTab === 'active' && (
          <div>
            {isActiveLoading ? (
              <SkeletonTable rows={5} columns={5} />
            ) : !activeData || activeData.content.length === 0 ? (
              <EmptyState
                title="No active probations"
                description="Active probation periods will appear here."
                icon={<UserCheck className="h-12 w-12 text-[var(--text-muted)]"/>}
              />
            ) : (
              <>
                {renderProbationTable(activeData.content, true)}
                {renderPagination(activeData, activePage, setActivePage)}
              </>
            )}
          </div>
        )}

        {/* ── Upcoming Reviews ── */}
        {activeTab === 'upcoming' && (
          <div>
            {isUpcomingLoading ? (
              <SkeletonTable rows={5} columns={4} />
            ) : endingSoon.length === 0 ? (
              <EmptyState
                title="No upcoming reviews"
                description="Probations ending in the next 14 days will appear here."
                icon={<Calendar className="h-12 w-12 text-[var(--text-muted)]"/>}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-body-secondary">
                  Probation periods ending within the next 14 days:
                </p>
                {renderProbationTable(endingSoon, true)}
              </div>
            )}
          </div>
        )}

        {/* ── History ── */}
        {activeTab === 'history' && (
          <div>
            {isHistoryLoading ? (
              <SkeletonTable rows={5} columns={5} />
            ) : !historyData || historyData.content.length === 0 ? (
              <EmptyState
                title="No completed probations"
                description="Confirmed probation records will appear here."
                icon={<CheckCircle className="h-12 w-12 text-[var(--text-muted)]"/>}
              />
            ) : (
              <>
                {renderProbationTable(historyData.content)}
                {renderPagination(historyData, historyPage, setHistoryPage)}
              </>
            )}
          </div>
        )}

        {/* ── Evaluation Form ── */}
        {activeTab === 'evaluate' && evaluateTarget && (
          <PermissionGate permission={Permissions.PROBATION_MANAGE}>
            <div className="max-w-3xl">
              {submitSuccess ? (
                <div
                  className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-xl p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-success-600 mx-auto mb-4"/>
                  <h3 className="text-xl font-semibold text-success-800 dark:text-success-300">
                    Evaluation Submitted Successfully!
                  </h3>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit(onSubmitEvaluation)}
                  className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-6 space-y-6 skeuo-card"
                >
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] skeuo-emboss">
                      Evaluation for {evaluateTarget.employeeName}
                    </h2>
                    <p className="text-body-secondary mt-1">
                      {evaluateTarget.department} - Probation ends{' '}
                      {formatDate(evaluateTarget.endDate)}
                    </p>
                  </div>

                  <input type="hidden" {...register('probationPeriodId')} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Evaluation Type */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Evaluation Type *
                      </label>
                      <select
                        {...register('evaluationType')}
                        className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                      >
                        {(Object.entries(EVALUATION_TYPE_LABELS) as [EvaluationType, string][]).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                      {errors.evaluationType && (
                        <p className="text-sm text-danger-500 mt-1">{errors.evaluationType.message}</p>
                      )}
                    </div>

                    {/* Recommendation */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Recommendation *
                      </label>
                      <select
                        {...register('recommendation')}
                        className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                      >
                        {(
                          Object.entries(RECOMMENDATION_LABELS) as [ProbationRecommendation, string][]
                        ).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {errors.recommendation && (
                        <p className="text-sm text-danger-500 mt-1">{errors.recommendation.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Ratings */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                      Ratings (1-5)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {[
                        {name: 'performanceRating' as const, label: 'Performance'},
                        {name: 'attendanceRating' as const, label: 'Attendance'},
                        {name: 'communicationRating' as const, label: 'Communication'},
                        {name: 'teamworkRating' as const, label: 'Teamwork'},
                        {name: 'technicalSkillsRating' as const, label: 'Technical'},
                      ].map((field) => (
                        <div key={field.name}>
                          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                            {field.label}
                          </label>
                          <select
                            {...register(field.name)}
                            className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                          >
                            {[1, 2, 3, 4, 5].map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                          {errors[field.name] && (
                            <p className="text-sm text-danger-500 mt-1">{errors[field.name]?.message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Text Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Strengths
                      </label>
                      <textarea
                        {...register('strengths')}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2 resize-none"
                        placeholder="Key strengths observed..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Areas for Improvement
                      </label>
                      <textarea
                        {...register('areasForImprovement')}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2 resize-none"
                        placeholder="Areas needing improvement..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Manager Comments
                    </label>
                    <textarea
                      {...register('managerComments')}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2 resize-none"
                      placeholder="Additional comments..."
                    />
                  </div>

                  {/* Final evaluation checkbox */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register('isFinalEvaluation')}
                      id="isFinal"
                      className="h-4 w-4 rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-700"
                    />
                    <label
                      htmlFor="isFinal"
                      className="text-body-secondary"
                    >
                      This is the final evaluation
                    </label>
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        reset();
                        setEvaluateTarget(null);
                        setActiveTab('active');
                      }}
                      className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || addEvaluation.isPending}
                      className="px-6 py-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-800 rounded-xl shadow-[var(--shadow-dropdown)] shadow-accent-700/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      {addEvaluation.isPending ? 'Submitting...' : 'Submit Evaluation'}
                    </button>
                  </div>

                  {addEvaluation.isError && (
                    <p className="text-sm text-danger-500 mt-2">
                      Failed to submit evaluation. Please try again.
                    </p>
                  )}
                </form>
              )}
            </div>
          </PermissionGate>
        )}
      </motion.div>
    </AppLayout>
  );
}
