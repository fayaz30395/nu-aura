import { CandidateStatus, RecruitmentStage } from '@/lib/types/recruitment';

/**
 * Status badge color mapping for candidates.
 * Extracted from the monolithic page component for reuse.
 */
export function getStatusColor(status: CandidateStatus): string {
  const colorMap: Record<CandidateStatus, string> = {
    NEW: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    SCREENING: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    INTERVIEW: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    SELECTED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    OFFER_EXTENDED: 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300',
    OFFER_ACCEPTED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300',
    OFFER_DECLINED: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    WITHDRAWN: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]',
  };
  return colorMap[status] || 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]';
}

/**
 * Stage badge color mapping for recruitment pipeline stages.
 */
export function getStageColor(stage?: RecruitmentStage): string {
  const colorMap: Record<RecruitmentStage, string> = {
    RECRUITERS_PHONE_CALL: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    PANEL_REVIEW: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    PANEL_REJECT: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    PANEL_SHORTLISTED: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300',
    TECHNICAL_INTERVIEW_SCHEDULED: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
    TECHNICAL_INTERVIEW_COMPLETED: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
    MANAGEMENT_INTERVIEW_SCHEDULED: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300',
    MANAGEMENT_INTERVIEW_COMPLETED: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300',
    CLIENT_INTERVIEW_SCHEDULED: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
    CLIENT_INTERVIEW_COMPLETED: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
    HR_FINAL_INTERVIEW_COMPLETED: 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300',
    CANDIDATE_REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    OFFER_NDA_TO_BE_RELEASED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  };
  return colorMap[stage || 'RECRUITERS_PHONE_CALL'] || 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]';
}

/**
 * Match score color mapping for AI-generated match percentages.
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
  if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
  return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
}

/**
 * Compute candidate stats from the full list.
 */
export function computeStats(candidates: { status: CandidateStatus }[]) {
  return {
    total: candidates.length,
    new: candidates.filter(c => c.status === 'NEW').length,
    interview: candidates.filter(c => c.status === 'INTERVIEW').length,
    selected: candidates.filter(c => c.status === 'SELECTED' || c.status === 'OFFER_ACCEPTED').length,
  };
}

/**
 * Filter candidates based on search query, status, and job opening.
 * Generic to preserve the full Candidate type through the filter chain.
 */
export function filterCandidates<T extends { fullName: string; email: string; candidateCode: string; status: string; jobOpeningId: string }>(
  candidates: T[],
  searchQuery: string,
  statusFilter: string,
  jobFilter: string,
): T[] {
  return candidates.filter(candidate => {
    const matchesSearch = candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.candidateCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || candidate.status === statusFilter;
    const matchesJob = !jobFilter || candidate.jobOpeningId === jobFilter;
    return matchesSearch && matchesStatus && matchesJob;
  });
}
