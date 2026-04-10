'use client';

import {useState} from 'react';
import {Star, ChevronDown, ChevronRight, User} from 'lucide-react';
import type {
  InterviewScorecard,
  ScorecardRecommendation,
} from '@/lib/types/hire/scorecard';

// ==================== Constants ====================

const RECOMMENDATION_CONFIG: Record<
  ScorecardRecommendation,
  { label: string; bgClass: string; textClass: string }
> = {
  STRONG_YES: {
    label: 'Strong Yes',
    bgClass: 'bg-[var(--success-100)]',
    textClass: 'text-[var(--success-700)]',
  },
  YES: {
    label: 'Yes',
    bgClass: 'bg-[var(--success-50)]',
    textClass: 'text-[var(--success-600)]',
  },
  NEUTRAL: {
    label: 'Neutral',
    bgClass: 'bg-[var(--surface-100)]',
    textClass: 'text-[var(--text-muted)]',
  },
  NO: {
    label: 'No',
    bgClass: 'bg-[var(--warning-50)]',
    textClass: 'text-[var(--warning-600)]',
  },
  STRONG_NO: {
    label: 'Strong No',
    bgClass: 'bg-[var(--danger-50)]',
    textClass: 'text-[var(--danger-600)]',
  },
};

// ==================== Helpers ====================

function computeWeightedAverage(
  criteria: { rating: number; weight: number }[]
): number {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = criteria.reduce((sum, c) => sum + c.rating * c.weight, 0);
  return Math.round((weighted / totalWeight) * 10) / 10;
}

function getConsensusLabel(scorecards: InterviewScorecard[]): {
  label: string;
  color: string;
} {
  const recs = scorecards
    .map((s) => s.recommendation)
    .filter((r): r is ScorecardRecommendation => !!r);

  if (recs.length === 0) return {label: 'No recommendations', color: 'var(--text-muted)'};

  const positive = recs.filter((r) => r === 'STRONG_YES' || r === 'YES').length;
  const negative = recs.filter((r) => r === 'STRONG_NO' || r === 'NO').length;
  const ratio = positive / recs.length;

  if (ratio >= 0.75) return {label: 'Strong consensus: Hire', color: 'var(--success-600)'};
  if (ratio >= 0.5) return {label: 'Leaning: Hire', color: 'var(--success-400)'};
  if (negative / recs.length >= 0.75) return {label: 'Strong consensus: Pass', color: 'var(--danger-600)'};
  if (negative / recs.length >= 0.5) return {label: 'Leaning: Pass', color: 'var(--warning-500)'};
  return {label: 'Mixed signals', color: 'var(--warning-400)'};
}

function renderStars(rating: number, size: number = 14) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= Math.round(rating)
              ? 'fill-[var(--warning-400)] text-[var(--warning-400)]'
              : 'fill-none text-[var(--text-muted)]'
          }
        />
      ))}
    </div>
  );
}

// ==================== Sub-components ====================

function RecommendationBadge({recommendation}: { recommendation?: ScorecardRecommendation }) {
  if (!recommendation) {
    return (
      <span className="inline-flex px-2 py-0.5 text-xs rounded-md bg-[var(--surface-100)] text-[var(--text-muted)]">
        Pending
      </span>
    );
  }
  const config = RECOMMENDATION_CONFIG[recommendation];
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${config.bgClass} ${config.textClass}`}
    >
      {config.label}
    </span>
  );
}

interface ScorecardCardProps {
  scorecard: InterviewScorecard;
}

function ScorecardCard({scorecard}: ScorecardCardProps) {
  const [expanded, setExpanded] = useState(false);
  const weightedAvg = computeWeightedAverage(scorecard.criteria);

  // Group criteria by category
  const grouped = scorecard.criteria.reduce<Record<string, typeof scorecard.criteria>>(
    (acc, c) => {
      const cat = c.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(c);
      return acc;
    },
    {}
  );

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]">
      {/* Header row */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-md bg-[var(--accent-50)] text-[var(--accent-primary)]">
            <User size={16}/>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {scorecard.interviewerName ?? 'Interviewer'}
            </p>
            <p className="text-2xs text-[var(--text-muted)]">
              {scorecard.submittedAt
                ? `Submitted ${new Date(scorecard.submittedAt).toLocaleDateString()}`
                : scorecard.status === 'DRAFT'
                  ? 'Draft'
                  : 'Submitted'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Weighted average */}
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Weighted Avg</p>
            <p className="text-sm font-semibold text-[var(--text-heading)]">
              {weightedAvg}/5
            </p>
          </div>

          {/* Overall rating */}
          <div className="text-center">
            <p className="text-xs text-[var(--text-muted)] mb-0.5">Rating</p>
            {renderStars(scorecard.overallRating ?? 0, 14)}
          </div>

          {/* Recommendation */}
          <RecommendationBadge recommendation={scorecard.recommendation}/>

          {/* Expand toggle */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="cursor-pointer p-1.5 rounded-md hover:bg-[var(--bg-main)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
            aria-label={expanded ? 'Collapse criteria' : 'Expand criteria'}
          >
            {expanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
          </button>
        </div>
      </div>

      {/* Overall notes */}
      {scorecard.overallNotes && (
        <div className="px-4 pb-2">
          <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
            &ldquo;{scorecard.overallNotes}&rdquo;
          </p>
        </div>
      )}

      {/* Expanded criteria detail */}
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] px-4 py-2">
          {Object.entries(grouped).map(([category, criteria]) => (
            <div key={category} className="mb-2 last:mb-0">
              <p className="text-xs uppercase tracking-wide font-medium text-[var(--text-muted)] mb-1">
                {category}
              </p>
              <div className="space-y-1">
                {criteria.map((c, i) => (
                  <div
                    key={`${c.name}-${i}`}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-[var(--text-primary)] truncate">
                        {c.name}
                      </span>
                      <span className="text-2xs text-[var(--text-muted)] shrink-0">
                        w:{c.weight}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(c.rating, 12)}
                      {c.notes && (
                        <span className="text-2xs text-[var(--text-muted)] max-w-[160px] truncate">
                          {c.notes}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== Main Component ====================

interface ScorecardSummaryProps {
  scorecards: InterviewScorecard[];
}

export function ScorecardSummary({scorecards}: ScorecardSummaryProps) {
  if (scorecards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Star size={32} className="text-[var(--text-muted)] mb-2"/>
        <p className="text-sm text-[var(--text-muted)]">
          No scorecards submitted yet
        </p>
      </div>
    );
  }

  const consensus = getConsensusLabel(scorecards);
  const avgOverall =
    scorecards.reduce((sum, s) => sum + (s.overallRating ?? 0), 0) /
    scorecards.length;

  return (
    <div className="space-y-4">
      {/* Summary stats bar */}
      <div className="flex items-center gap-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Scorecards
          </p>
          <p className="text-lg font-semibold text-[var(--text-heading)] mt-1">
            {scorecards.length}
          </p>
        </div>
        <div className="h-8 w-px bg-[var(--border-subtle)]"/>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Avg Rating
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-semibold text-[var(--text-heading)]">
              {Math.round(avgOverall * 10) / 10}
            </span>
            {renderStars(avgOverall, 14)}
          </div>
        </div>
        <div className="h-8 w-px bg-[var(--border-subtle)]"/>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Consensus
          </p>
          <p
            className="text-sm font-semibold mt-1"
            style={{color: consensus.color}}
          >
            {consensus.label}
          </p>
        </div>
      </div>

      {/* Individual scorecards */}
      <div className="space-y-2">
        {scorecards.map((sc) => (
          <ScorecardCard key={sc.id} scorecard={sc}/>
        ))}
      </div>
    </div>
  );
}
