'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eSignatureService } from '@/lib/services/hire/esignature.service';
import type {
  CreateSignatureRequestRequest,
  SignatureApprovalRequest,
  SignatureStatus,
} from '@/lib/types/hire/esignature';

// ==================== Query Keys ====================

export const esignKeys = {
  all: ['esignature'] as const,
  request: (id: string) => [...esignKeys.all, 'request', id] as const,
  approvals: (requestId: string) => [...esignKeys.all, 'approvals', requestId] as const,
  byStatus: (status: SignatureStatus) => [...esignKeys.all, 'status', status] as const,
};

// ==================== Queries ====================

export function useSignatureRequest(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: esignKeys.request(id),
    queryFn: () => eSignatureService.getSignatureRequest(id),
    enabled: enabled && !!id,
    staleTime: 30 * 1000, // 30s — status can change
  });
}

export function useSignatureApprovals(requestId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: esignKeys.approvals(requestId),
    queryFn: () => eSignatureService.getApprovalsByRequest(requestId),
    enabled: enabled && !!requestId,
    staleTime: 30 * 1000,
  });
}

// ==================== Mutations ====================

export function useCreateSignatureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSignatureRequestRequest) =>
      eSignatureService.createSignatureRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: esignKeys.all });
    },
  });
}

export function useSendForSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eSignatureService.sendForSignature(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: esignKeys.request(id) });
      queryClient.invalidateQueries({ queryKey: esignKeys.all });
    },
  });
}

export function useAddSigner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, signer }: { requestId: string; signer: SignatureApprovalRequest }) =>
      eSignatureService.addSigner(requestId, signer),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: esignKeys.approvals(data.signatureRequestId) });
    },
  });
}

export function useCancelSignatureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      eSignatureService.cancelSignatureRequest(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: esignKeys.request(id) });
    },
  });
}
