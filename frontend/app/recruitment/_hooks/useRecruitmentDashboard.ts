'use client';

import {useMemo} from 'react';
import {
  useAllInterviews,
  useCandidates,
  useJobOpenings,
  useJobOpeningsByStatus,
} from '@/lib/hooks/queries/useRecruitment';
import type {Candidate, Interview} from '@/lib/types/hire/recruitment';
import type {QueryStateResult} from '@/components/ui/QueryState';

export interface RecruitmentStats {
  openRequisitions: number;
  inPipeline: number;
  pendingOffers: number;
  interviewsThisWeek: number;
}

function isThisWeek(dateString?: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return date >= startOfWeek && date <= endOfWeek;
}

const isUpcoming = (i: Interview) =>
  isThisWeek(i.scheduledAt) && (i.status === 'SCHEDULED' || i.status === 'RESCHEDULED');

/** Loads the recruitment dashboard queries and derives stats and highlight lists. */
export function useRecruitmentDashboard() {
  // Fetched for cache warm-up of the jobs list the dashboard links to.
  useJobOpenings(0, 100);
  const candidatesQuery = useCandidates(0, 100);
  const openJobsQuery = useJobOpeningsByStatus('OPEN');
  const interviewsQuery = useAllInterviews(0, 100);

  const statsQuery: QueryStateResult<RecruitmentStats> = useMemo(() => {
    const candidates = candidatesQuery.data?.content;
    const openJobs = openJobsQuery.data;
    const interviews = interviewsQuery.data?.content;
    const ready = candidates !== undefined && openJobs !== undefined && interviews !== undefined;
    return {
      data: ready
        ? {
          openRequisitions: openJobs.length,
          inPipeline: candidates.filter(
            (c) => c.status === 'NEW' || c.status === 'SCREENING' || c.status === 'INTERVIEW' || c.status === 'SELECTED',
          ).length,
          pendingOffers: candidates.filter((c) => c.status === 'OFFER_EXTENDED').length,
          interviewsThisWeek: interviews.filter(isUpcoming).length,
        }
        : undefined,
      isPending: candidatesQuery.isPending || openJobsQuery.isPending || interviewsQuery.isPending,
      isError: candidatesQuery.isError || openJobsQuery.isError || interviewsQuery.isError,
      isFetching: candidatesQuery.isFetching || openJobsQuery.isFetching || interviewsQuery.isFetching,
      refetch: () => {
        void candidatesQuery.refetch();
        void openJobsQuery.refetch();
        void interviewsQuery.refetch();
      },
    };
  }, [candidatesQuery, openJobsQuery, interviewsQuery]);

  const needingAttention: Candidate[] = useMemo(() => {
    const candidates = candidatesQuery.data?.content || [];
    return candidates
      .filter((c) => c.status === 'OFFER_EXTENDED' || c.status === 'INTERVIEW' || c.status === 'SCREENING')
      .sort((a, b) => new Date(b.appliedDate || b.createdAt).getTime() - new Date(a.appliedDate || a.createdAt).getTime())
      .slice(0, 5);
  }, [candidatesQuery.data]);

  const upcomingInterviews: Interview[] = useMemo(() => {
    const interviews = interviewsQuery.data?.content || [];
    return interviews
      .filter(isUpcoming)
      .sort((a, b) => new Date(a.scheduledAt || '').getTime() - new Date(b.scheduledAt || '').getTime())
      .slice(0, 5);
  }, [interviewsQuery.data]);

  return {statsQuery, candidatesQuery, interviewsQuery, needingAttention, upcomingInterviews};
}
