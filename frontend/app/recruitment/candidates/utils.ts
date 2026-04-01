import { CandidateStatus, RecruitmentStage } from '@/lib/types/hire/recruitment';

/**
 * Status badge color mapping for candidates.
 * Extracted from the monolithic page component for reuse.
 */
export function getStatusColor(status: CandidateStatus): string {
  const colorMap: Record<CandidateStatus, string> = {
    NEW: 'badge-status status-info',
    SCREENING: 'badge-status status-info',
    INTERVIEW: 'badge-status status-warning',
    SELECTED: 'badge-status status-success',
    OFFER_EXTENDED: 'badge-status status-info',
    OFFER_ACCEPTED: 'badge-status status-success',
    OFFER_DECLINED: 'badge-status status-danger',
    REJECTED: 'badge-status status-danger',
    WITHDRAWN: 'badge-status status-neutral',
  };
  return colorMap[status] || 'badge-status status-neutral';
}

/**
 * Stage badge color mapping for recruitment pipeline stages.
 */
export function getStageColor(stage?: RecruitmentStage): string {
  const colorMap: Record<RecruitmentStage, string> = {
    RECRUITERS_PHONE_CALL: 'badge-status status-info',
    PANEL_REVIEW: 'badge-status status-info',
    PANEL_REJECT: 'badge-status status-danger',
    PANEL_SHORTLISTED: 'badge-status status-success',
    TECHNICAL_INTERVIEW_SCHEDULED: 'badge-status status-warning',
    TECHNICAL_INTERVIEW_COMPLETED: 'badge-status status-info',
    MANAGEMENT_INTERVIEW_SCHEDULED: 'badge-status status-warning',
    MANAGEMENT_INTERVIEW_COMPLETED: 'badge-status status-info',
    CLIENT_INTERVIEW_SCHEDULED: 'badge-status status-warning',
    CLIENT_INTERVIEW_COMPLETED: 'badge-status status-info',
    HR_FINAL_INTERVIEW_COMPLETED: 'badge-status status-success',
    CANDIDATE_REJECTED: 'badge-status status-danger',
    OFFER_NDA_TO_BE_RELEASED: 'badge-status status-success',
  };
  return colorMap[stage || 'RECRUITERS_PHONE_CALL'] || 'badge-status status-neutral';
}

/**
 * Match score color mapping for AI-generated match percentages.
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 70) return 'badge-status status-success';
  if (score >= 50) return 'badge-status status-warning';
  return 'badge-status status-danger';
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
