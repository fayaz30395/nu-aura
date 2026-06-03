'use client';

import React, {memo} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
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
import {StatusBadge} from '@/components/ui/StatusBadge';
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
    <motion.tr
      whileHover={{backgroundColor: 'var(--surface-hover)'}}
      transition={{duration: 0.16, ease: [0.16, 1, 0.3, 1]}}
      className="group h-14 cursor-pointer border-b border-[var(--border-soft)] transition-colors"
      onClick={() => router.push(`/recruitment/candidates/${candidate.id}`)}
    >
      {/* Candidate Info */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="h-10 w-10 shrink-0 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center"
          >
            <span className="text-sm font-semibold text-accent-700 dark:text-accent-300">
              {candidate.firstName.charAt(0).toUpperCase()}{candidate.lastName.charAt(0).toUpperCase()}
            </span>
          </motion.div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--text-1)]">{candidate.fullName}</div>
            <div className="text-xs text-[var(--text-3)] truncate">{candidate.email}</div>
          </div>
        </div>
      </td>

      {/* Job */}
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-[var(--text-1)]">{candidate.jobTitle || '—'}</div>
        <div className="text-xs text-[var(--text-3)] font-mono">{candidate.candidateCode || '—'}</div>
      </td>

      {/* Experience */}
      <td className="px-6 py-4">
        <div className="text-sm text-[var(--text-2)]">
          {candidate.totalExperience ? <span className="font-mono tabular-nums">{candidate.totalExperience}</span> : '—'}{candidate.totalExperience && ' yrs'}
        </div>
      </td>

      {/* Stage */}
      <td className="px-6 py-4 text-center">
        {candidate.currentStage && (
          <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${getStageColor(candidate.currentStage)}`}>
            {candidate.currentStage.replace(/_/g, ' ')}
          </span>
        )}
      </td>

      {/* Status */}
      <td className="px-6 py-4 text-center">
        <StatusBadge status={candidate.status || ''} />
      </td>

      {/* Source */}
      <td className="px-6 py-4">
        <span className="text-sm text-[var(--text-2)]">
          {candidate.source?.replace(/_/g, ' ') || '—'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <motion.div
          className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100"
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{duration: 0.16}}
        >
          {/* Primary: View */}
          <button
            onClick={() => onView(candidate)}
            aria-label={`View ${candidate.fullName}`}
            className="p-1.5 text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all duration-150 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
            title="View"
          >
            <Eye className="h-4 w-4"/>
          </button>

          {/* Primary: Edit */}
          <button
            onClick={() => onEdit(candidate)}
            aria-label={`Edit ${candidate.fullName}`}
            className="p-1.5 text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all duration-150 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
            title="Edit"
          >
            <Edit2 className="h-4 w-4"/>
          </button>

          {/* Match score badge (inline, no button needed) */}
          {matchScore && (
            <div className={`px-2.5 py-1 text-xs font-semibold rounded-full tabular-nums ${getMatchScoreColor(matchScore.overallScore)}`}>
              {Math.round(matchScore.overallScore)}%
            </div>
          )}

          {/* More actions dropdown */}
          <div className="relative group/actions">
            <button
              aria-label={`More actions for ${candidate.fullName}`}
              className="p-1.5 text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all duration-150 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="5" r="1"/>
                <circle cx="12" cy="12" r="1"/>
                <circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
            <motion.div
              initial={{opacity: 0, y: -2}}
              whileHover={{opacity: 1, y: 0}}
              transition={{duration: 0.12}}
              className="absolute right-0 top-full mt-2 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-[var(--sh-pop)] opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-50"
            >
              <div className="px-3 py-2 text-2xs font-bold text-[var(--text-3)] uppercase tracking-[0.08em]">AI Actions</div>
              <button
                onClick={() => onCalculateMatch(candidate)}
                disabled={aiLoadingState === `match-${candidate.id}`}
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-hover)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] inset-ring"
              >
                {aiLoadingState === `match-${candidate.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> :
                  <Brain className="h-3.5 w-3.5"/>}
                <span>Match Score</span>
              </button>
              <button
                onClick={() => onScreeningSummary(candidate)}
                disabled={aiLoadingState === `screening-${candidate.id}`}
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-hover)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] inset-ring"
              >
                {aiLoadingState === `screening-${candidate.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> :
                  <FileText className="h-3.5 w-3.5"/>}
                <span>Screening Summary</span>
              </button>
              <button
                onClick={() => onSynthesizeFeedback(candidate)}
                disabled={aiLoadingState === `feedback-${candidate.id}`}
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-hover)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] inset-ring"
              >
                {aiLoadingState === `feedback-${candidate.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> :
                  <MessageSquare className="h-3.5 w-3.5"/>}
                <span>Synthesize Feedback</span>
              </button>

              <div className="my-1 border-t border-[var(--border-soft)]"/>
              <button
                onClick={() => onViewScorecard(candidate)}
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-hover)] flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] inset-ring"
              >
                <TrendingUp className="h-3.5 w-3.5"/>
                <span>Interview Scorecards</span>
              </button>
              <button
                onClick={() => router.push(`/recruitment/interviews?candidateId=${candidate.id}`)}
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-hover)] flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] inset-ring"
              >
                <Calendar className="h-3.5 w-3.5"/>
                <span>Schedule Interview</span>
              </button>

              {candidate.status === 'SELECTED' && (
                <>
                  <div className="my-1 border-t border-[var(--border-soft)]"/>
                  <button
                    onClick={() => onOffer(candidate)}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--ok-fg)] hover:bg-[var(--ok-bg)] flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] inset-ring"
                  >
                    <Send className="h-3.5 w-3.5"/>
                    <span>Generate Offer</span>
                  </button>
                </>
              )}
              {candidate.status === 'OFFER_EXTENDED' && (
                <>
                  <div className="my-1 border-t border-[var(--border-soft)]"/>
                  <button
                    onClick={() => onESign(candidate)}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-hover)] flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] inset-ring"
                  >
                    <FileSignature className="h-3.5 w-3.5"/>
                    <span>Send for E-Sign</span>
                  </button>
                  <button
                    onClick={() => onAccept(candidate)}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--ok-fg)] hover:bg-[var(--ok-bg)] flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] inset-ring"
                  >
                    <CheckCircle className="h-3.5 w-3.5"/>
                    <span>Accept Offer</span>
                  </button>
                  <button
                    onClick={() => onDecline(candidate)}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--err-fg)] hover:bg-[var(--err-bg)] flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] inset-ring"
                  >
                    <XCircle className="h-3.5 w-3.5"/>
                    <span>Decline Offer</span>
                  </button>
                </>
              )}

              <PermissionGate permission={Permissions.CANDIDATE_EVALUATE}>
                <div className="my-1 border-t border-[var(--border-soft)]"/>
                <button
                  onClick={() => onDelete(candidate)}
                  className="w-full px-3 py-2 text-left text-sm text-[var(--err-fg)] hover:bg-[var(--err-bg)] flex items-center gap-2 transition-colors cursor-pointer rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] inset-ring"
                >
                  <Trash2 className="h-3.5 w-3.5"/>
                  <span>Delete</span>
                </button>
              </PermissionGate>
            </motion.div>
          </div>
        </motion.div>
      </td>
    </motion.tr>
  );
});
