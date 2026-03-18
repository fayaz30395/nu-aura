'use client';

import React, { memo } from 'react';
import { useRouter } from 'next/navigation';
import { Candidate } from '@/lib/types/recruitment';
import { CandidateMatchResponse } from '@/lib/types/ai-recruitment';
import {
  Eye, Edit2, Trash2, Calendar, Send, CheckCircle, XCircle,
  Loader2, Brain, FileText, MessageSquare,
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
}: CandidateTableRowProps) {
  const router = useRouter();

  return (
    <tr className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors">
      {/* Candidate Info */}
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {candidate.firstName.charAt(0)}{candidate.lastName.charAt(0)}
            </span>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-[var(--text-primary)]">{candidate.fullName}</div>
            <div className="text-sm text-[var(--text-muted)]">{candidate.email}</div>
          </div>
        </div>
      </td>

      {/* Job */}
      <td className="px-6 py-4">
        <div className="text-sm text-[var(--text-primary)]">{candidate.jobTitle || '-'}</div>
        <div className="text-xs text-[var(--text-muted)]">{candidate.candidateCode}</div>
      </td>

      {/* Experience */}
      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
        {candidate.totalExperience ? `${candidate.totalExperience} years` : '-'}
      </td>

      {/* Stage */}
      <td className="px-6 py-4">
        {candidate.currentStage && (
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStageColor(candidate.currentStage)}`}>
            {candidate.currentStage.replace(/_/g, ' ')}
          </span>
        )}
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
          {candidate.status.replace(/_/g, ' ')}
        </span>
      </td>

      {/* Source */}
      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
        {candidate.source?.replace(/_/g, ' ') || '-'}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onView(candidate)}
            className="p-2 text-[var(--text-muted)] hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>

          {/* AI: Match Score */}
          <button
            onClick={() => onCalculateMatch(candidate)}
            disabled={aiLoadingState === `match-${candidate.id}`}
            className="p-2 text-[var(--text-muted)] hover:text-purple-600 dark:hover:text-purple-400 transition-colors disabled:opacity-50"
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
            className="p-2 text-[var(--text-muted)] hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors disabled:opacity-50"
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
            className="p-2 text-[var(--text-muted)] hover:text-lime-600 dark:hover:text-lime-400 transition-colors disabled:opacity-50"
            title="Synthesize Feedback"
          >
            {aiLoadingState === `feedback-${candidate.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
          </button>

          {/* Schedule Interview */}
          <button
            onClick={() => router.push(`/recruitment/interviews?candidateId=${candidate.id}`)}
            className="p-2 text-[var(--text-muted)] hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            title="Schedule Interview"
          >
            <Calendar className="h-4 w-4" />
          </button>

          {/* Offer (only when SELECTED) */}
          {candidate.status === 'SELECTED' && (
            <button
              onClick={() => onOffer(candidate)}
              className="p-2 text-[var(--text-muted)] hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              title="Generate Offer Letter"
            >
              <Send className="h-4 w-4" />
            </button>
          )}

          {/* Accept/Decline (only when OFFER_EXTENDED) */}
          {candidate.status === 'OFFER_EXTENDED' && (
            <>
              <button
                onClick={() => onAccept(candidate)}
                className="p-2 text-[var(--text-muted)] hover:text-green-600 dark:hover:text-green-400 transition-colors"
                title="Accept Offer"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDecline(candidate)}
                className="p-2 text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Decline Offer"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Edit */}
          <button
            onClick={() => onEdit(candidate)}
            className="p-2 text-[var(--text-muted)] hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>

          {/* Delete */}
          <PermissionGate permission={Permissions.CANDIDATE_EVALUATE}>
            <button
              onClick={() => onDelete(candidate)}
              className="p-2 text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
