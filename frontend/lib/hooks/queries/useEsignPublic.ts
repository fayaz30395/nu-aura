'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { esignPublicService } from '@/lib/services/esign-public.service';

// External signature info response type
export interface ExternalSignatureInfoResponse {
  approvalId: string;
  documentTitle: string;
  documentDescription: string;
  documentType: string;
  documentUrl: string;
  documentName: string;
  status: string;
  signerEmail: string;
  tokenExpiresAt: string;
  tokenValid: boolean;
  errorMessage?: string;
  candidateName?: string;
  companyName?: string;
}

// This is a public (unauthenticated) signing page.
// Token comes from URL parameters, not from auth state.

// Query keys for cache management
export const esignPublicKeys = {
  all: ['esign-public'] as const,
  info: (token: string) => [...esignPublicKeys.all, 'info', token] as const,
};

// ========== Queries ==========

/**
 * Get signature information for a document (public, token-based).
 * Pass token from URL params; pass enabled=false until token is available.
 */
export function useSignatureInfo(token: string | undefined, enabled: boolean = false) {
  return useQuery<ExternalSignatureInfoResponse>({
    queryKey: esignPublicKeys.info(token || ''),
    queryFn: () => {
      if (!token) throw new Error('Token is required');
      return esignPublicService.getSignatureInfo(token) as Promise<ExternalSignatureInfoResponse>;
    },
    enabled: enabled && !!token,
    staleTime: 0, // Always fresh
  });
}

// ========== Mutations ==========

/**
 * Sign a document with drawn or typed signature.
 */
export function useSignDocument() {
  return useMutation({
    mutationFn: (params: {
      token: string;
      signerEmail: string;
      signatureMethod: string;
      signatureData: string;
      comments?: string;
    }) =>
      esignPublicService.sign(params.token, {
        signerEmail: params.signerEmail,
        signatureMethod: params.signatureMethod,
        signatureData: params.signatureData,
        comments: params.comments,
      }),
  });
}

/**
 * Decline to sign a document.
 */
export function useDeclineDocument() {
  return useMutation({
    mutationFn: (params: {
      token: string;
      signerEmail: string;
      reason?: string;
    }) => esignPublicService.decline(params.token, params.signerEmail, params.reason),
  });
}
