'use client';

import { useQuery } from '@tanstack/react-query';
import { feedback360Service } from '@/lib/services/feedback360.service';
import { performanceKeys } from './performanceKeys';

// ─── 360 Feedback Hooks ───────────────────────────────────────────────────

export function useActiveFeedback360Cycles() {
  return useQuery({
    queryKey: [...performanceKeys.feedback360Cycles(), 'active'],
    queryFn: () => feedback360Service.getActiveCycles(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyPending360Reviews() {
  return useQuery({
    queryKey: [...performanceKeys.feedback360(), 'my-pending'],
    queryFn: () => feedback360Service.getMyPendingReviews(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyFeedback360Summaries() {
  return useQuery({
    queryKey: [...performanceKeys.feedback360(), 'my-summaries'],
    queryFn: () => feedback360Service.getMySummaries(),
    staleTime: 10 * 60 * 1000,
  });
}
