'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  publicOfferService,
  type AcceptOfferRequest,
  type DeclineOfferRequest,
} from '@/lib/services/hire/public-offer.service';

// Query Key Factory
export const publicOfferKeys = {
  all: ['public-offer'] as const,
  offerByToken: (token: string) => [...publicOfferKeys.all, 'token', token] as const,
};

// Query Hooks

/**
 * Fetch public offer details by token (no auth required)
 */
export function usePublicOffer(token: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: publicOfferKeys.offerByToken(token || ''),
    queryFn: () => publicOfferService.getOfferByToken(token!),
    enabled: enabled && !!token,
    retry: false,
    staleTime: 0,
  });
}

// Mutation Hooks

/**
 * Accept a public offer
 */
export function useAcceptPublicOffer() {
  return useMutation({
    mutationFn: ({ token, data }: { token: string; data: AcceptOfferRequest }) =>
      publicOfferService.acceptOffer(token, data),
  });
}

/**
 * Decline a public offer
 */
export function useDeclinePublicOffer() {
  return useMutation({
    mutationFn: ({ token, data }: { token: string; data: DeclineOfferRequest }) =>
      publicOfferService.declineOffer(token, data),
  });
}
