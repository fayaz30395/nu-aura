'use client';

import React, {memo} from 'react';
import {useRouter} from 'next/navigation';
import {Candidate} from '@/lib/types/hire/recruitment';
import {CandidateMatchResponse} from '@/lib/types/hire/ai-recruitment';
import {
  Brain,
  Calendar,
  CheckCircle,
  Edit2,
  Eye,
  FileSignature,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {getMatchScoreColor, getStageColor, getStatusColor} from './utils';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

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
          <div
            className="flex-shrink-0 h-10 w-10 bg-accent-100 dark:bg-accent-900/30 rounded-xl flex items-center justify-center">
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
          {candidate.status?.replace(/_/g, ' ') ?? '-'}
        </span>
      </td>

      {/* Source */}
      <td className="px-6 py-4 text-body-secondary">
        {candidate.source?.replace(/_/g, ' ') || '-'}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {/* Primary: View */}
          <button
            onClick={() => onView(candidate)}
            aria-label={`View ${candidate.fullName}`}
            className="p-1.5 text-[var(--text-muted)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors rounded-md cursor-pointer"
            title="View"
          >
            <Eye className="h-4 w-4"/>
          </button>

          {/* Primary: Edit */}
          <button
            onClick={() => onEdit(candidate)}
            aria-label={`Edit ${candidate.fullName}`}
            className="p-1.5 text-[var(--text-muted)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors rounded-md cursor-pointer"
            title="Edit"
          >
            <Edit2 className="h-4 w-4"/>
          </button>

          {/* Match score badge (inline, no button needed) */}
          {matchScore && (
            <div
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${getMatchScoreColor(matchScore.overallScore)}`}>
              {Math.round(matchScore.overallScore)}%
            </div>
          )}

          {/* More actions dropdown */}
          <div className="relative group">
            <button
              aria-label={`More actions for ${candidate.fullName}`}
              className="p-1.5 text-[var(--text-muted)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors rounded-md cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-[var(--shadow-dropdown)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              {/* AI Actions */}
              <div className="px-2 py-1 text-2xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">AI Actions</div>
              <button
                onClick={() => onCalculateMatch(candidate)}
                disabled={aiLoadingState === `match-${candidate.id}`}
                className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {aiLoadingState === `match-${candidate.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Brain className="h-3.5 w-3.5"/>}
                Match Score
              </button>
              <button
                onClick={() => onScreeningSummary(candidate)}
                disabled={aiLoadingState === `screening-${candidate.id}`}
                className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {aiLoadingState === `screening-${candidate.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <FileText className="h-3.5 w-3.5"/>}
                Screening Summary
              </button>
              <button
                onClick={() => onSynthesizeFeedback(candidate)}
                disabled={aiLoadingState === `feedback-${candidate.id}`}
                className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {aiLoadingState === `feedback-${candidate.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <MessageSquare className="h-3.5 w-3.5"/>}
                Synthesize Feedback
              </button>

              {/* Interview */}
              <div className="border-t border-[var(--border-subtle)] my-1"/>
              <button
                onClick={() => onViewScorecard(candidate)}
                className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2 cursor-pointer"
              >
                <TrendingUp className="h-3.5 w-3.5"/>
                Interview Scorecards
              </button>
              <button
                onClick={() => router.push(`/recruitment/interviews?candidateId=${candidate.id}`)}
                className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5"/>
                Schedule Interview
              </button>

              {/* Offer actions (conditional) */}
              {candidate.status === 'SELECTED' && (
                <>
                  <div className="border-t border-[var(--border-subtle)] my-1"/>
                  <button
                    onClick={() => onOffer(candidate)}
                    className="w-full px-4 py-2 text-left text-sm text-success-700 dark:text-success-400 hover:bg-[var(--bg-secondary)] flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5"/>
                    Generate Offer
                  </button>
                </>
              )}
              {candidate.status === 'OFFER_EXTENDED' && (
                <>
                  <div className="border-t border-[var(--border-subtle)] my-1"/>
                  <button
                    onClick={() => onESign(candidate)}
                    className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2 cursor-pointer"
                  >
                    <FileSignature className="h-3.5 w-3.5"/>
                    Send for E-Sign
                  </button>
                  <button
                    onClick={() => onAccept(candidate)}
                    className="w-full px-4 py-2 text-left text-sm text-success-700 dark:text-success-400 hover:bg-[var(--bg-secondary)] flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="h-3.5 w-3.5"/>
                    Accept Offer
                  </button>
                  <button
                    onClick={() => onDecline(candidate)}
                    className="w-full px-4 py-2 text-left text-sm text-danger-700 dark:text-danger-400 hover:bg-[var(--bg-secondary)] flex items-center gap-2 cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5"/>
                    Decline Offer
                  </button>
                </>
              )}

              {/* Destructive */}
              <PermissionGate permission={Permissions.CANDIDATE_EVALUATE}>
                <div className="border-t border-[var(--border-subtle)] my-1"/>
                <button
                  onClick={() => onDelete(candidate)}
                  className="w-full px-4 py-2 text-left text-sm text-danger-700 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/20 flex items-center gap-2 cursor-pointer rounded-b-lg"
                >
                  <Trash2 className="h-3.5 w-3.5"/>
                  Delete
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
});
