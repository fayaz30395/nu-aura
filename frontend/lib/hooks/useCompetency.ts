'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  employeeSkillService,
  competencyService,
  skillGapService,
} from '@/lib/services/grow/competencyService';
import type {
  EmployeeSkillRequest,
  CompetencyRequest,
} from '@/lib/types/grow/competency';

// ─── Query Key Factory ───────────────────────────────────────────────────

export const competencyKeys = {
  all: ['competency'] as const,
  skills: () => [...competencyKeys.all, 'skills'] as const,
  employeeSkills: (employeeId: string) =>
    [...competencyKeys.skills(), 'employee', employeeId] as const,
  reviewCompetencies: (reviewId: string) =>
    [...competencyKeys.all, 'review', reviewId] as const,
  skillGaps: (employeeId: string) =>
    [...competencyKeys.all, 'gaps', employeeId] as const,
};

// ─── Employee Skills Hooks ───────────────────────────────────────────────

export function useEmployeeSkills(employeeId: string) {
  return useQuery({
    queryKey: competencyKeys.employeeSkills(employeeId),
    queryFn: () => employeeSkillService.getByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useAddEmployeeSkill(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmployeeSkillRequest) =>
      employeeSkillService.addOrUpdate(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: competencyKeys.employeeSkills(employeeId),
      });
      notifications.show({
        title: 'Skill Updated',
        message: 'Your skill assessment has been saved successfully.',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to save skill assessment. Please try again.',
        color: 'red',
      });
    },
  });
}

export function useVerifySkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: string) => employeeSkillService.verify(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: competencyKeys.skills() });
      notifications.show({
        title: 'Skill Verified',
        message: 'The skill has been verified successfully.',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to verify skill. Please try again.',
        color: 'red',
      });
    },
  });
}

export function useRemoveSkill(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: string) => employeeSkillService.remove(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: competencyKeys.employeeSkills(employeeId),
      });
      notifications.show({
        title: 'Skill Removed',
        message: 'The skill has been removed.',
        color: 'blue',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to remove skill. Please try again.',
        color: 'red',
      });
    },
  });
}

// ─── Review Competency Hooks ─────────────────────────────────────────────

export function useReviewCompetencies(reviewId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: competencyKeys.reviewCompetencies(reviewId),
    queryFn: () => competencyService.getByReview(reviewId),
    enabled: enabled && !!reviewId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useAddCompetency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CompetencyRequest) => competencyService.add(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: competencyKeys.reviewCompetencies(variables.reviewId),
      });
      notifications.show({
        title: 'Competency Added',
        message: 'Competency assessment has been saved.',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to add competency. Please try again.',
        color: 'red',
      });
    },
  });
}

export function useRemoveCompetency(reviewId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (competencyId: string) =>
      competencyService.remove(competencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: competencyKeys.reviewCompetencies(reviewId),
      });
      notifications.show({
        title: 'Competency Removed',
        message: 'The competency has been removed from the review.',
        color: 'blue',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to remove competency. Please try again.',
        color: 'red',
      });
    },
  });
}

// ─── Skill Gap Hooks ─────────────────────────────────────────────────────

export function useSkillGapAnalysis(employeeId: string) {
  return useQuery({
    queryKey: competencyKeys.skillGaps(employeeId),
    queryFn: () => skillGapService.analyze(employeeId),
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
