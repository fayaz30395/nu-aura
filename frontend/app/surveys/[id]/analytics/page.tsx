'use client';

import React from 'react';
import {useParams, useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {ArrowLeft, BarChart3, MessageSquare, PieChart as PieChartIcon, TrendingUp, Users,} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {AppLayout} from '@/components/layout/AppLayout';
import {Button, Card, CardContent,} from '@/components/ui';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useSurveyDetail} from '@/lib/hooks/queries/useSurveys';
import {useSurveyAnalytics} from '@/lib/hooks/queries/useSurveyQuestions';
import {QuestionType} from '@/lib/types/grow/survey';
import {chartColors, iconSize, motion as dsMotion, typography,} from '@/lib/design-system';

const PIE_COLORS = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.success,
  chartColors.warning,
  chartColors.danger,
  chartColors.info,
  chartColors.accent,
  chartColors.muted,
];

const _isRatingType = (questionType: string): boolean =>
  questionType === QuestionType.RATING ||
  questionType === QuestionType.NPS ||
  questionType === QuestionType.SCALE;

const _isChoiceType = (questionType: string): boolean =>
  questionType === QuestionType.SINGLE_CHOICE ||
  questionType === QuestionType.MULTIPLE_CHOICE;

export default function SurveyAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const {data: survey, isLoading: surveyLoading} = useSurveyDetail(surveyId);
  const {data: analytics, isLoading: analyticsLoading} = useSurveyAnalytics(surveyId);

  const isLoading = surveyLoading || analyticsLoading;

  const breadcrumbs = [
    {label: 'Dashboard', href: '/dashboard'},
    {label: 'Surveys', href: '/surveys'},
    {label: survey?.title ?? 'Survey', href: `/surveys/${surveyId}`},
    {label: 'Analytics'},
  ];

  // Derive response rate
  const totalResponses = analytics?.totalResponses ?? 0;
  const completionRate = analytics?.completionRate ?? 0;

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="surveys">
      <PermissionGate
        permission={Permissions.SURVEY_VIEW}
        fallback={
          <div className="flex flex-col items-center justify-center py-24">
            <p className={typography.sectionTitle}>
              You do not have permission to view survey analytics.
            </p>
          </div>
        }
      >
        <motion.div className="space-y-6" {...dsMotion.pageEnter}>
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/surveys/${surveyId}`)}
              >
                <ArrowLeft className={iconSize.button}/>
              </Button>
              <div>
                <h1 className={typography.pageTitle}>
                  {surveyLoading ? <span className="skeleton-aura inline-block h-6 w-48 rounded" /> : `${survey?.title} — Analytics`}
                </h1>
                <p className={typography.bodySecondary}>
                  Response data and question-level insights
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg bg-[var(--bg-surface)]"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="card-aura">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                      <Users className="h-6 w-6 text-accent-600 dark:text-accent-400"/>
                    </div>
                    <div>
                      <p className={typography.bodySecondary}>Total Responses</p>
                      <p className={typography.statLarge}>{totalResponses}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-aura">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-success-100 p-4 dark:bg-success-900">
                      <TrendingUp className="h-6 w-6 text-success-600 dark:text-success-400"/>
                    </div>
                    <div>
                      <p className={typography.bodySecondary}>Completion Rate</p>
                      <p className={typography.statLarge}>
                        {completionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-aura">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                      <BarChart3 className="h-6 w-6 text-accent-600 dark:text-accent-400"/>
                    </div>
                    <div>
                      <p className={typography.bodySecondary}>Questions</p>
                      <p className={typography.statLarge}>
                        {analytics?.questionStats?.length ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Per-question charts */}
          {!isLoading && analytics?.questionStats && analytics.questionStats.length > 0 && (
            <motion.div className="space-y-6" {...dsMotion.staggerContainer}>
              {analytics.questionStats.map((stat) => {
                const hasDistribution =
                  stat.optionDistribution &&
                  Object.keys(stat.optionDistribution).length > 0;

                // Determine chart type from distribution keys or averageRating
                const showBarChart = stat.averageRating != null || !hasDistribution;
                const showPieChart = hasDistribution && !stat.averageRating;

                // Bar chart data for rating/NPS/likert
                const barData = hasDistribution
                  ? Object.entries(stat.optionDistribution!).map(([key, value]) => ({
                    name: key,
                    count: value,
                  }))
                  : [];

                // Pie chart data for choice questions
                const pieData = hasDistribution
                  ? Object.entries(stat.optionDistribution!).map(([name, value]) => ({
                    name,
                    value,
                  }))
                  : [];

                return (
                  <motion.div key={stat.questionId} variants={dsMotion.staggerItem.variants}>
                    <Card className="card-aura">
                      <CardContent className="p-6">
                        <div className="mb-4 flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            {hasDistribution ? (
                              showPieChart ? (
                                <PieChartIcon className={`${iconSize.cardInline} mt-0.5 text-[var(--text-secondary)]`}/>
                              ) : (
                                <BarChart3 className={`${iconSize.cardInline} mt-0.5 text-[var(--text-secondary)]`}/>
                              )
                            ) : (
                              <MessageSquare className={`${iconSize.cardInline} mt-0.5 text-[var(--text-secondary)]`}/>
                            )}
                            <div>
                              <h3 className={typography.cardTitle}>
                                {stat.questionText}
                              </h3>
                              <p className={typography.caption}>
                                {stat.responseCount} responses
                                {stat.averageRating != null &&
                                  ` | Avg: ${stat.averageRating.toFixed(1)}`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Rating / NPS / Likert → Bar Chart */}
                        {showBarChart && barData.length > 0 && (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={barData}>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke={chartColors.grid}
                                />
                                <XAxis
                                  dataKey="name"
                                  tick={{fontSize: 12, fill: chartColors.tooltip.text}}
                                />
                                <YAxis
                                  allowDecimals={false}
                                  tick={{fontSize: 12, fill: chartColors.tooltip.text}}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: chartColors.tooltip.bg,
                                    border: `1px solid ${chartColors.tooltip.border}`,
                                    borderRadius: 8,
                                    color: chartColors.tooltip.text,
                                  }}
                                />
                                <Bar
                                  dataKey="count"
                                  fill={chartColors.primary}
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Choice → Pie Chart */}
                        {showPieChart && pieData.length > 0 && (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({name, percent}) =>
                                    `${name} (${(percent * 100).toFixed(0)}%)`
                                  }
                                  outerRadius={80}
                                  dataKey="value"
                                >
                                  {pieData.map((_, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                                    />
                                  ))}
                                </Pie>
                                <Legend/>
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: chartColors.tooltip.bg,
                                    border: `1px solid ${chartColors.tooltip.border}`,
                                    borderRadius: 8,
                                    color: chartColors.tooltip.text,
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Text questions — just show count */}
                        {!hasDistribution && barData.length === 0 && (
                          <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-surface)] p-4">
                            <MessageSquare className={`${iconSize.cardInline} text-[var(--text-muted)]`}/>
                            <span className={typography.bodySecondary}>
                              {stat.responseCount} text responses collected
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Empty state */}
          {!isLoading &&
            (!analytics?.questionStats || analytics.questionStats.length === 0) && (
              <Card className="card-aura">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="h-12 w-12 text-[var(--text-muted)]"/>
                  <p className="mt-4 text-lg font-medium text-[var(--text-primary)]">
                    No analytics data yet
                  </p>
                  <p className={typography.bodySecondary}>
                    Analytics will appear once responses are collected
                  </p>
                </CardContent>
              </Card>
            )}
        </motion.div>
      </PermissionGate>
    </AppLayout>
  );
}
