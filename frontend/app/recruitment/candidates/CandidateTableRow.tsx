'use client';

import React, { memo } from 'react';
import { useRouter } from 'next/navigation';
import { Candidate } from '@/lib/types/hire/recruitment';
import { CandidateMatchResponse } from '@/lib/types/hire/ai-recruitment';
import {
  Eye, Edit2, Trash2, Calendar, Send, CheckCircle, XCircle,
  Loader2, Brain, FileText, MessageSquare, TrendingUp, FileSignature,
} from 'lucide-react';
import { getStatusColor, getStageColor, getMatchScoreColor } from './utils';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

interface CandidateTableRowProps {
  candidate: Candidate;
  matchScore?: CandidateMatchResponse;
  aiLoadingState: string | null;
  onView: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
  onOffer: (candidate: Candidate) => void;
  onAccept: (candidate: Candidate) => void;
  onDecline: (candidate: Candidate) => void;
  onCalculateMatch: (candidate: Candidate) => void;
  onScreeningSummary: (candidate: Candidate) => void;
  onSynthesizeFeedback: (candidate: Candidate) => void;
  onViewScorecard: (candidate: Candidate) => void;
  onESign: (candidate: Candidate) => void;
}

/**
 * Individual candidate table row — memoized to prevent re-renders
 * when sibling rows change (e.g., AI loading state on another row).
 */
export const CandidateTableRow = memo(function CandidateTableRow({
  candidate,
  matchScore,
  aiLoadingState,
  onView,
  onEdit,
  onDelete,
  onOffer,
  onAccept,
  onDecline,
  onCalculateMatch,
  onScreeningSummary,
  onSynthesizeFeedback,
  onViewScorecard,
  onESign,
}: CandidateTableRowProps) {
  const router = useRouter();

  return (
    <tr
      className="h-11 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors cursor-pointer"
      onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}
    >
      {/* Candidate Info */}
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-accent-100 dark:bg-accent-900/30 rounded-xl flex items-center justify-center">
            <span className="text-sm font-medium text-accent-700 dark:text-accent-300">
              {candidate.firstName.charAt(0)}{candidate.lastName.charAt(0)}
            </span>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-[var(--text-primary)]">{candidate.fullName}</div>
            <div className="text-body-muted">{candidate.email}</div>
          </div>
        </div>
      </td>

      {/* Job */}
      <td className="px-6 py-4">
        <div className="text-sm text-[var(--text-primary)]">{candidate.jobTitle || '-'}</div>
        <div className="text-caption">{candidate.candidateCode}</div>
      </td>

      {/* Experience */}
      <td className="px-6 py-4 text-body-secondary">
        {candidate.totalExperience ? `${candidate.totalExperience} years` : '-'}
      </td>

      {/* Stage */}
      <td className="px-6 py-4 text-center">
        {candidate.currentStage && (
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStageColor(candidate.currentStage)}`}>
            {candidate.currentStage.replace(/_/g, ' ')}
          </span>
        )}
      </td>

      {/* Status */}
      <td className="px-6 py-4 text-center">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
          {candidate.status.replace(/_/g, ' ')}
        </span>
      </td>

      {/* Source */}
      <td className="px-6 py-4 text-body-secondary">
        {candidate.source?.replace(/_/g, ' ') || '-'}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onView(candidate)}
            aria-label={`View ${candidate.fullName}`}
            className="p-2 text-[var(--text-muted)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>

          {/* AI: Match Score */}
          <button
            onClick={() => onCalculateMatch(candidate)}
            disabled={aiLoadingState === `match-${candidate.id}`}
            aria-label={`Calculate match score for ${candidate.fullName}`}
            className="p-2 text-[var(--text-muted)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors disabled:opacity-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            title="Calculate Match Score"
          >
            {aiLoadingState === `match-${candidate.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
          </button>
          {matchScore && (
            <div className={`px-2 py-1 text-xs font-medium rounded-full ${getMatchScoreColor(matchScore.overallScore)}`}>
              {Math.round(matchScore.overallScore)}%
            </div>
          )}

          {/* AI: Screening Summary */}
          <button
            onClick={() => onScreeningSummary(candidate)}
            disabled={aiLoadingState === `screening-${candidate.id}`}
            aria-label={`Screening summary for ${candidate.fullName}`}
            className="p-2 text-[var(--text-muted)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors disabled:opacity-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            title="Screening Summary"
          >
            {aiLoadingState === `screening-${candidate.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </button>

          {/* AI: Feedback Synthesis */}
          <button
            onClick={() => onSynthesizeFeedback(candidate)}
            disabled={aiLoadingState === `feedback-${candidate.id}`}
            aria-label={`Synthesize feedback for ${candidate.fullName}`}
            className="p-2 text-[var(--text-muted)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors disabled:opacity-50 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            title="Synthesize Feedback"
          >
            {aiLoadingState === `feedback-${candidate.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
          </button>

          {/* Interview Scorecards */}
          <button
            onClick={() => onViewScorecard(candidate)}
            aria-label={`View scorecards for ${candidate.fullName}`}
            className="p-2 text-[var(--text-muted)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            title="Interview Scorecards"
          >
            <TrendingUp className="h-4 w-4" />
          </button>

          {/* Schedule Interview */}
          <button
            onClick={() => router.push(`/recruitment/interviews?candidateId=${candidate.id}`)}
            aria-label={`Schedule interview for ${candidate.fullName}`}
            className="p-2 text-[var(--text-muted)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            title="Schedule Interview"
          >
            <Calendar className="h-4 w-4" />
          </button>

          {/* Offer (only when SELECTED) */}
          {candidate.status === 'SELECTED' && (
            <button
              onClick={() => onOffer(candidate)}
              aria-label={`Generate offer for ${candidate.fullName}`}
              className="p-2 text-[var(--text-muted)] hover:text-success-600 dark:hover:text-success-400 transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              title="Generate Offer Letter"
            >
              <Send className="h-4 w-4" />
            </button>
          )}

          {/* Accept/Decline + E-Sign (only when OFFER_EXTENDED) */}
          {candidate.status === 'OFFER_EXTENDED' && (
            <>
              <button
                onClick={() => onESign(candidate)}
                aria-label={`Send offer letter for e-signature to ${candidate.fullName}`}
                className="p-2 text-[var(--text-muted)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                title="Send for E-Sign"
              >
                <FileSignature className="h-4 w-4" />
              </button>
              <button
                onClick={() => onAccept(candidate)}
                aria-label={`Accept offer for ${candidate.fullName}`}
                className="p-2 text-[var(--text-muted)] hover:text-success-600 dark:hover:text-success-400 transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                title="Accept Offer"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDecline(candidate)}
                aria-label={`Decline offer for ${candidate.fullName}`}
                className="p-2 text-[var(--text-muted)] hover:text-danger-600 dark:hover:text-danger-400 transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                title="Decline Offer"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Edit */}
          <button
            onClick={() => onEdit(candidate)}
            aria-label={`Edit ${candidate.fullName}`}
            className="p-2 text-[var(--text-muted)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>

          {/* Delete */}
          <PermissionGate permission={Permissions.CANDIDATE_EVALUATE}>
            <button
              onClick={() => onDelete(candidate)}
              aria-label={`Delete ${candidate.fullName}`}
              className="p-2 text-[var(--text-muted)] hover:text-danger-600 dark:hover:text-danger-400 transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 focus-visible:ring-offset-2"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </PermissionGate>
        </div>
      </td>
    </tr>
  );
});
