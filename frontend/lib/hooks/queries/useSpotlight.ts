'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {spotlightService} from '@/lib/services/platform/spotlight.service';
import {CreateSpotlightRequest, UpdateSpotlightRequest,} from '@/lib/types/platform/spotlight';

export const spotlightKeys = {
  all: ['spotlight'] as const,
  active: () => [...spotlightKeys.all, 'active'] as const,
  list: (page: number, size: number) =>
    [...spotlightKeys.all, 'list', {page, size}] as const,
  detail: (id: string) => [...spotlightKeys.all, 'detail', id] as const,
};

// ========== Queries ==========

/**
 * Fetch only active spotlights, sorted by displayOrder
 */
export function useActiveSpotlights() {
  return useQuery({
    queryKey: spotlightKeys.active(),
    queryFn: () => spotlightService.getActiveSpotlights(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all spotlights with pagination
 */
export function useAllSpotlights(page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: spotlightKeys.list(page, size),
    queryFn: () => spotlightService.getAllSpotlights(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

// ========== Mutations ==========

/**
 * Create a new spotlight slide
 */
export function useCreateSpotlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSpotlightRequest) =>
      spotlightService.createSpotlight(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: spotlightKeys.all});
    },
  });
}

/**
 * Update an existing spotlight slide
 */
export function useUpdateSpotlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, data}: { id: string; data: UpdateSpotlightRequest }) =>
      spotlightService.updateSpotlight(id, data),
    onSuccess: (_, {id}) => {
      queryClient.invalidateQueries({queryKey: spotlightKeys.detail(id)});
      queryClient.invalidateQueries({queryKey: spotlightKeys.all});
    },
  });
}

/**
 * Delete a spotlight slide
 */
export function useDeleteSpotlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => spotlightService.deleteSpotlight(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: spotlightKeys.all});
    },
  });
}
