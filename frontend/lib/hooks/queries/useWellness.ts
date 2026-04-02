'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wellnessService } from '@/lib/services/grow/wellness.service';
import {
  HealthLog,
  WellnessProgram,
  WellnessChallenge,
} from '@/lib/types/grow/wellness';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const wellnessKeys = {
  all: ['wellness'] as const,
  // Programs
  programs: () => [...wellnessKeys.all, 'programs'] as const,
  activePrograms: () => [...wellnessKeys.programs(), 'active'] as const,
  programDetail: (id: string) => [...wellnessKeys.programs(), 'detail', id] as const,
  // Challenges
  challenges: () => [...wellnessKeys.all, 'challenges'] as const,
  activeChallenges: () => [...wellnessKeys.challenges(), 'active'] as const,
  challengeDetail: (id: string) => [...wellnessKeys.challenges(), 'detail', id] as const,
  // Leaderboard
  leaderboard: () => [...wellnessKeys.all, 'leaderboard'] as const,
  leaderboardTop: (limit: number) => [...wellnessKeys.leaderboard(), { limit }] as const,
  // My Points
  myPoints: () => [...wellnessKeys.all, 'myPoints'] as const,
  // Health Logs
  healthLogs: () => [...wellnessKeys.all, 'healthLogs'] as const,
  myHealthLogs: (page?: number, size?: number) =>
    [...wellnessKeys.healthLogs(), 'my', { page, size }] as const,
};

// ─── Program Queries ───────────────────────────────────────────────────────

export function useActivePrograms(enabled: boolean = true) {
  return useQuery({
    queryKey: wellnessKeys.activePrograms(),
    queryFn: () => wellnessService.getActivePrograms(),
    enabled,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000,
  });
}

export function useProgramDetail(programId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: wellnessKeys.programDetail(programId),
    queryFn: () => wellnessService.getActivePrograms().then(programs => programs.find(p => p.id === programId) ?? null),
    enabled: enabled && !!programId,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

// ─── Challenge Queries ─────────────────────────────────────────────────────

export function useActiveChallenges(enabled: boolean = true) {
  return useQuery({
    queryKey: wellnessKeys.activeChallenges(),
    queryFn: () => wellnessService.getActiveChallenges(),
    enabled,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useChallengeDetail(challengeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: wellnessKeys.challengeDetail(challengeId),
    queryFn: () => wellnessService.getActiveChallenges().then(challenges => challenges.find(c => c.id === challengeId) ?? null),
    enabled: enabled && !!challengeId,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

// ─── Leaderboard Query ─────────────────────────────────────────────────────

export function useWellnessLeaderboard(limit: number = 5, enabled: boolean = true) {
  return useQuery({
    queryKey: wellnessKeys.leaderboardTop(limit),
    queryFn: () => wellnessService.getLeaderboard(limit),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ─── My Points Query ───────────────────────────────────────────────────────

export function useMyWellnessPoints(enabled: boolean = true) {
  return useQuery({
    queryKey: wellnessKeys.myPoints(),
    queryFn: () => wellnessService.getMyPoints(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Health Logs Query ─────────────────────────────────────────────────────

export function useMyHealthLogs(page: number = 0, size: number = 20, enabled: boolean = true) {
  return useQuery({
    queryKey: wellnessKeys.myHealthLogs(page, size),
    queryFn: () => wellnessService.getHealthLogs(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], new Date().toISOString().split('T')[0]),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────

export function useLogHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: HealthLog) => wellnessService.logHealth(data),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: wellnessKeys.myHealthLogs() });
      queryClient.invalidateQueries({ queryKey: wellnessKeys.myPoints() });
      queryClient.invalidateQueries({ queryKey: wellnessKeys.leaderboard() });
    },
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeId: string) => wellnessService.joinChallenge(challengeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wellnessKeys.activeChallenges() });
      queryClient.invalidateQueries({ queryKey: wellnessKeys.myPoints() });
    },
  });
}

export function useLeaveChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeId: string) => wellnessService.leaveChallenge(challengeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wellnessKeys.activeChallenges() });
      queryClient.invalidateQueries({ queryKey: wellnessKeys.myPoints() });
    },
  });
}

// ─── Admin Mutations ───────────────────────────────────────────────────────

export function useCreateWellnessProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<WellnessProgram>) => wellnessService.createProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wellnessKeys.programs() });
    },
  });
}

export function useCreateWellnessChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      programId,
      data,
    }: {
      programId: string | null;
      data: Partial<WellnessChallenge>;
    }) => wellnessService.createChallenge(programId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wellnessKeys.challenges() });
    },
  });
}

// ─── Upcoming Challenges ───────────────────────────────────────────────────

export function useUpcomingChallenges(enabled: boolean = true) {
  return useQuery({
    queryKey: [...wellnessKeys.challenges(), 'upcoming'] as const,
    queryFn: () => wellnessService.getUpcomingChallenges(),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Featured Programs ─────────────────────────────────────────────────────

export function useFeaturedPrograms(enabled: boolean = true) {
  return useQuery({
    queryKey: [...wellnessKeys.programs(), 'featured'] as const,
    queryFn: () => wellnessService.getFeaturedPrograms(),
    enabled,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
