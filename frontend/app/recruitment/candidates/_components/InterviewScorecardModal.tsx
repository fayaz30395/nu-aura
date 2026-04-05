'use client';

import React from 'react';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Card, CardContent} from '@/components/ui/Card';
import {Skeleton} from '@/components/ui/Skeleton';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {useInterviewsByCandidate} from '@/lib/hooks/queries/useRecruitment';
import type {Interview, InterviewResult, InterviewStatus} from '@/lib/types/hire/recruitment';

interface InterviewScorecardModalProps {
  open: boolean;
  candidateId: string;
  candidateName: string;
  onSynthesizeFeedback: () => void;
  onClose: () => void;
}

// ==================== Helpers ====================

function StarRating({rating}: { rating: number | null | undefined }) {
  const filled = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({length: 10}).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < filled
              ? 'fill-warning-400 text-warning-400'
              : 'fill-transparent text-[var(--border-main)]'
          }`}
        />
      ))}
      {rating != null && (
        <span className="ml-1 text-xs font-medium text-[var(--text-muted)]">{rating}/10</span>
      )}
    </div>
  );
}

function ResultBadge({result}: { result: InterviewResult | null | undefined }) {
  if (!result) return <span className="text-caption">Pending</span>;
  const map: Record<InterviewResult, { label: string; variant: string; Icon: React.ElementType }> = {
    SELECTED: {label: 'Selected', variant: 'success', Icon: CheckCircle},
    REJECTED: {label: 'Rejected', variant: 'danger', Icon: XCircle},
    ON_HOLD: {label: 'On Hold', variant: 'warning', Icon: Clock},
    PENDING: {label: 'Pending', variant: 'info', Icon: AlertCircle},
  };
  const {label, variant, Icon} = map[result];
  return (
    <Badge variant={variant as 'success' | 'danger' | 'warning' | 'info'} className="flex items-center gap-1 text-xs">
      <Icon className="h-3 w-3"/>
      {label}
    </Badge>
  );
}

function StatusBadge({status}: { status: InterviewStatus }) {
  const map: Record<InterviewStatus, { label: string; variant: string }> = {
    SCHEDULED: {label: 'Scheduled', variant: 'info'},
    RESCHEDULED: {label: 'Rescheduled', variant: 'warning'},
    COMPLETED: {label: 'Completed', variant: 'success'},
    CANCELLED: {label: 'Cancelled', variant: 'danger'},
    NO_SHOW: {label: 'No Show', variant: 'danger'},
  };
  const {label, variant} = map[status] ?? {label: status, variant: 'info'};
  return <Badge variant={variant as 'success' | 'danger' | 'warning' | 'info'} className="text-xs">{label}</Badge>;
}

function RoundLabel({round}: { round: string | null | undefined }) {
  const labels: Record<string, string> = {
    SCREENING: 'Screening',
    TECHNICAL_1: 'Technical 1',
    TECHNICAL_2: 'Technical 2',
    HR: 'HR',
    MANAGERIAL: 'Managerial',
    FINAL: 'Final',
  };
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-md bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300">
      {round ? (labels[round] ?? round) : '—'}
    </span>
  );
}

// ==================== Aggregate Stats ====================

interface AggregateStats {
  total: number;
  completed: number;
  avgRating: number | null;
  resultCounts: Record<string, number>;
}

function computeAggregateStats(interviews: Interview[]): AggregateStats {
  const completed = interviews.filter((i) => i.status === 'COMPLETED');
  const withRating = completed.filter((i) => i.rating != null);
  const avgRating =
    withRating.length > 0
      ? withRating.reduce((sum, i) => sum + (i.rating ?? 0), 0) / withRating.length
      : null;

  const resultCounts: Record<string, number> = {};
  for (const i of completed) {
    const r = i.result ?? 'PENDING';
    resultCounts[r] = (resultCounts[r] ?? 0) + 1;
  }

  return {total: interviews.length, completed: completed.length, avgRating, resultCounts};
}

// ==================== Main Component ====================

export function InterviewScorecardModal({
                                          open,
                                          candidateId,
                                          candidateName,
                                          onSynthesizeFeedback,
                                          onClose,
                                        }: InterviewScorecardModalProps) {
  const {data, isLoading, isError} = useInterviewsByCandidate(candidateId, open);

  if (!open) return null;

  const interviews: Interview[] = (data as unknown as {
    content?: Interview[]
  })?.content ?? (Array.isArray(data) ? (data as Interview[]) : []);
  const stats = computeAggregateStats(interviews);

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
      <div
        className="bg-[var(--bg-card)] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-[var(--border-main)] shadow-[var(--shadow-elevated)]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[var(--border-main)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent-500"/>
              Interview Scorecards
            </h2>
            <p className="text-body-muted mt-0.5">{candidateName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded-md"
          >
            <X className="h-5 w-5"/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-24 w-full rounded-xl"/>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <AlertCircle className="h-8 w-8 mb-2 text-danger-400"/>
              <p className="text-sm">Failed to load interviews. Please try again.</p>
            </div>
          )}

          {!isLoading && !isError && interviews.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <Users className="h-10 w-10 mb-4 opacity-40"/>
              <p className="text-sm font-medium">No interviews scheduled yet</p>
              <p className="text-xs mt-1">Interviews will appear here once scheduled for this candidate.</p>
            </div>
          )}

          {!isLoading && !isError && interviews.length > 0 && (
            <>
              {/* Aggregate Stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                    <p className="text-caption mt-1">Total Rounds</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.completed}</p>
                    <p className="text-caption mt-1">Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {stats.avgRating != null ? stats.avgRating.toFixed(1) : '—'}
                    </p>
                    <p className="text-caption mt-1">Avg Rating</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-success-600">
                      {stats.resultCounts['SELECTED'] ?? 0}
                    </p>
                    <p className="text-caption mt-1">Selected Votes</p>
                  </CardContent>
                </Card>
              </div>

              {/* Result Breakdown */}
              {Object.keys(stats.resultCounts).length > 0 && (
                <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                    Result Breakdown
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(stats.resultCounts).map(([result, count]) => (
                      <div key={result} className="flex items-center gap-2">
                        <ResultBadge result={result as InterviewResult}/>
                        <span className="text-sm font-medium text-[var(--text-primary)]">×{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-Interview Scorecards */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                  Interviewer Scorecards
                </p>
                <div className="space-y-4">
                  {interviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="p-4 border border-[var(--border-main)] rounded-xl bg-[var(--bg-card)] space-y-4"
                    >
                      {/* Row 1: Round + Status + Result */}
                      <div className="flex flex-wrap items-center gap-2">
                        <RoundLabel round={interview.interviewRound}/>
                        <StatusBadge status={interview.status}/>
                        <ResultBadge result={interview.result}/>
                        {interview.interviewType && (
                          <span className="text-caption">
                            ({interview.interviewType.replace('_', ' ')})
                          </span>
                        )}
                      </div>

                      {/* Row 2: Interviewer + Date */}
                      <div className="meta-row">
                        {interview.interviewerName && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5"/>
                            {interview.interviewerName}
                          </span>
                        )}
                        {interview.scheduledAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5"/>
                            {new Date(interview.scheduledAt).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      {/* Row 3: Rating */}
                      {interview.rating != null && (
                        <div className="flex items-center gap-2">
                          <span className="text-caption">Rating:</span>
                          <StarRating rating={interview.rating}/>
                        </div>
                      )}

                      {/* Row 4: Feedback */}
                      {interview.feedback && (
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                          <div className="flex items-center gap-1 mb-1">
                            <MessageSquare className="h-3.5 w-3.5 text-[var(--text-muted)]"/>
                            <span className="text-xs font-medium text-[var(--text-muted)]">Feedback</span>
                          </div>
                          <p className="text-body-secondary leading-relaxed">
                            {interview.feedback}
                          </p>
                        </div>
                      )}

                      {/* Row 5: Notes */}
                      {interview.notes && (
                        <div>
                          <span className="text-caption">Notes: </span>
                          <span className="text-xs text-[var(--text-secondary)]">{interview.notes}</span>
                        </div>
                      )}

                      {interview.status !== 'COMPLETED' && !interview.feedback && !interview.rating && (
                        <p className="text-caption italic">
                          Scorecard not yet submitted
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="row-between gap-4 p-6 border-t border-[var(--border-main)]">
          <Button
            type="button"
            onClick={onSynthesizeFeedback}
            disabled={interviews.length === 0}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4"/>
            AI Feedback Synthesis
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
