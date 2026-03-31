'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referralService } from '@/lib/services/hire/referral.service';
import { ReferralRequest, ReferralPolicyRequest, ReferralStatus } from '@/lib/types/hire/referral';

// Query keys for cache management
export const referralKeys = {
  all: ['referrals'] as const,
  myReferrals: () => [...referralKeys.all, 'my-referrals'] as const,
  list: () => [...referralKeys.all, 'list'] as const,
  listPaginated: (page: number, size: number) => [...referralKeys.list(), { page, size }] as const,
  byStatus: (status: ReferralStatus) => [...referralKeys.all, 'status', status] as const,
  detail: (id: string) => [...referralKeys.all, 'detail', id] as const,
  bonusEligible: () => [...referralKeys.all, 'bonus-eligible'] as const,
  policies: () => [...referralKeys.all, 'policies'] as const,
  policy: (id: string) => [...referralKeys.all, 'policy', id] as const,
  dashboard: () => [...referralKeys.all, 'dashboard'] as const,
};

// ========== QUERIES ==========

export function useMyReferrals() {
  return useQuery({
    queryKey: referralKeys.myReferrals(),
    queryFn: () => referralService.getMyReferrals(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllReferrals(page = 0, size = 20) {
  return useQuery({
    queryKey: referralKeys.listPaginated(page, size),
    queryFn: () => referralService.getAllReferrals(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

export function useReferralsByStatus(status: ReferralStatus) {
  return useQuery({
    queryKey: referralKeys.byStatus(status),
    queryFn: () => referralService.getReferralsByStatus(status),
    enabled: !!status,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReferral(id: string, enabled = true) {
  return useQuery({
    queryKey: referralKeys.detail(id),
    queryFn: () => referralService.getReferral(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBonusEligibleReferrals() {
  return useQuery({
    queryKey: referralKeys.bonusEligible(),
    queryFn: () => referralService.getBonusEligibleReferrals(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivePolicies() {
  return useQuery({
    queryKey: referralKeys.policies(),
    queryFn: () => referralService.getActivePolicies(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useReferralDashboard() {
  return useQuery({
    queryKey: referralKeys.dashboard(),
    queryFn: () => referralService.getDashboard(),
    staleTime: 5 * 60 * 1000,
  });
}

// ========== MUTATIONS ==========

export function useSubmitReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReferralRequest) => referralService.submitReferral(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.myReferrals() });
      queryClient.invalidateQueries({ queryKey: referralKeys.list() });
      queryClient.invalidateQueries({ queryKey: referralKeys.dashboard() });
    },
  });
}

export function useUpdateReferralStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: ReferralStatus;
      notes?: string;
    }) => referralService.updateStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.all });
    },
  });
}

export function useRejectReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      reason,
      stage,
    }: {
      id: string;
      reason: string;
      stage?: string;
    }) => referralService.rejectReferral(id, reason, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.all });
    },
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReferralPolicyRequest) => referralService.createPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.policies() });
    },
  });
}

export function useTogglePolicyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      referralService.togglePolicyStatus(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.policies() });
    },
  });
}
