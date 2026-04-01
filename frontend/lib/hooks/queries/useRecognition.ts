'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recognitionService } from '@/lib/services/grow/recognition.service';
import type { RecognitionRequest, ReactionType } from '@/lib/types/grow/recognition';
import { notifications } from '@mantine/notifications';

// ─── Query Key Factory ─────────────────────────────────────────────────────
export const recognitionKeys = {
  all: ['recognition'] as const,
  feed: () => [...recognitionKeys.all, 'feed'] as const,
  feedList: (page: number, size: number) => [...recognitionKeys.feed(), 'list', { page, size }] as const,
  detail: (id: string) => [...recognitionKeys.all, 'detail', id] as const,
  received: () => [...recognitionKeys.all, 'received'] as const,
  receivedList: (page: number, size: number) => [...recognitionKeys.received(), 'list', { page, size }] as const,
  given: () => [...recognitionKeys.all, 'given'] as const,
  givenList: (page: number, size: number) => [...recognitionKeys.given(), 'list', { page, size }] as const,
  badges: () => [...recognitionKeys.all, 'badges'] as const,
  myPoints: () => [...recognitionKeys.all, 'myPoints'] as const,
  leaderboard: (limit: number) => [...recognitionKeys.all, 'leaderboard', limit] as const,
  dashboard: () => [...recognitionKeys.all, 'dashboard'] as const,
  milestones: (days: number) => [...recognitionKeys.all, 'milestones', days] as const,
};

// ─── Query Hooks ───────────────────────────────────────────────────────────

export function usePublicFeed(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: recognitionKeys.feedList(page, size),
    queryFn: () => recognitionService.getPublicFeed(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRecognitionDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: recognitionKeys.detail(id),
    queryFn: () => recognitionService.getRecognitionById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMyReceivedRecognitions(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: recognitionKeys.receivedList(page, size),
    queryFn: () => recognitionService.getMyReceivedRecognitions(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMyGivenRecognitions(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: recognitionKeys.givenList(page, size),
    queryFn: () => recognitionService.getMyGivenRecognitions(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useActiveBadges() {
  return useQuery({
    queryKey: recognitionKeys.badges(),
    queryFn: () => recognitionService.getActiveBadges(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useMyPoints() {
  return useQuery({
    queryKey: recognitionKeys.myPoints(),
    queryFn: () => recognitionService.getMyPoints(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLeaderboard(limit: number = 10) {
  return useQuery({
    queryKey: recognitionKeys.leaderboard(limit),
    queryFn: () => recognitionService.getLeaderboard(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useEngagementDashboard() {
  return useQuery({
    queryKey: recognitionKeys.dashboard(),
    queryFn: () => recognitionService.getDashboard(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpcomingMilestones(days: number = 7) {
  return useQuery({
    queryKey: recognitionKeys.milestones(days),
    queryFn: () => recognitionService.getUpcomingMilestones(days),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────

export function useGiveRecognition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecognitionRequest) => recognitionService.giveRecognition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recognitionKeys.feed() });
      queryClient.invalidateQueries({ queryKey: recognitionKeys.given() });
      queryClient.invalidateQueries({ queryKey: recognitionKeys.myPoints() });
      queryClient.invalidateQueries({ queryKey: recognitionKeys.dashboard() });
      notifications.show({
        title: 'Success',
        message: 'Recognition given successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to give recognition',
        color: 'red',
      });
    },
  });
}

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recognitionId, reactionType }: { recognitionId: string; reactionType: ReactionType }) =>
      recognitionService.addReaction(recognitionId, reactionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recognitionKeys.feed() });
      queryClient.invalidateQueries({ queryKey: recognitionKeys.received() });
      queryClient.invalidateQueries({ queryKey: recognitionKeys.given() });
    },
  });
}

export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recognitionId, reactionType }: { recognitionId: string; reactionType: ReactionType }) =>
      recognitionService.removeReaction(recognitionId, reactionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recognitionKeys.feed() });
      queryClient.invalidateQueries({ queryKey: recognitionKeys.received() });
      queryClient.invalidateQueries({ queryKey: recognitionKeys.given() });
    },
  });
}
