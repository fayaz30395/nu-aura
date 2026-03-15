'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/notifications/ToastProvider';

export interface PreboardingCandidate {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  expectedJoiningDate: string;
  designation: string;
  status: string;
  completionPercentage: number;
  createdAt: string;
}

interface PreboardingResponse {
  content: PreboardingCandidate[];
}

export interface CreatePreboardingRequest {
  firstName: string;
  lastName?: string;
  email: string;
  expectedJoiningDate: string;
  designation?: string;
}

// Query Key Factory
export const preboardingKeys = {
  all: ['preboarding'] as const,
  candidates: () => [...preboardingKeys.all, 'candidates'] as const,
};

// Query Hooks

/**
 * Fetch all preboarding candidates
 */
export function usePreboardingCandidates() {
  return useQuery({
    queryKey: preboardingKeys.candidates(),
    queryFn: async () => {
      const response = await apiClient.get<PreboardingResponse>('/api/v1/preboarding/candidates');
      return response.data.content || [];
    },
  });
}

// Mutation Hooks

/**
 * Create a new preboarding candidate invitation
 */
export function useCreatePreboardingCandidate() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CreatePreboardingRequest) =>
      apiClient.post('/api/v1/preboarding/candidates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preboardingKeys.candidates() });
      toast.success('Candidate invited successfully');
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to invite candidate';
      toast.error(message);
    },
  });
}

/**
 * Resend invitation to a preboarding candidate
 */
export function useResendPreboardingInvitation() {
  const toast = useToast();

  return useMutation({
    mutationFn: (candidateId: string) =>
      apiClient.post(`/api/v1/preboarding/candidates/${candidateId}/resend`),
    onSuccess: () => {
      toast.success('Invitation resent successfully');
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to resend invitation';
      toast.error(message);
    },
  });
}
