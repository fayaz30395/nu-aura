'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedback360Service } from '@/lib/services/grow/feedback360.service';
import type { CycleRequest, FeedbackResponse } from '@/lib/services/grow/feedback360.service';
import { performanceKeys } from './performanceKeys';

// ─── 360 Feedback Query Hooks ────────────────────────────────────────────

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

// ─── 360 Feedback Mutation Hooks ─────────────────────────────────────────

export function useCreateFeedback360Cycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CycleRequest) => feedback360Service.createCycle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback360Cycles() });
    },
  });
}

export function useActivateFeedback360Cycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feedback360Service.activateCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback360Cycles() });
    },
  });
}

export function useCloseFeedback360Cycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feedback360Service.closeCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback360Cycles() });
    },
  });
}

export function useDeleteFeedback360Cycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feedback360Service.deleteCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback360Cycles() });
    },
  });
}

export function useSubmitFeedback360Response() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FeedbackResponse) => feedback360Service.submitResponse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback360() });
    },
  });
}

export function useShareFeedback360Summary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (summaryId: string) => feedback360Service.shareWithEmployee(summaryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback360() });
    },
  });
}
