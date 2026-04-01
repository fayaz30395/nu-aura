'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { linkedinService } from '@/lib/services/platform/linkedin.service';
import {
  CreateLinkedInPostRequest,
  UpdateLinkedInPostRequest,
} from '@/lib/types/platform/linkedin';

// Query keys for cache management
export const linkedinKeys = {
  all: ['linkedin'] as const,
  posts: () => [...linkedinKeys.all, 'posts'] as const,
  active: (page: number, size: number) =>
    [...linkedinKeys.posts(), 'active', { page, size }] as const,
  all_posts: (page: number, size: number) =>
    [...linkedinKeys.posts(), 'all', { page, size }] as const,
  detail: (id: string) => [...linkedinKeys.posts(), 'detail', id] as const,
};

// ========== Queries ==========

/**
 * Get active LinkedIn posts (published, not archived).
 * Used by company feed to display curated posts.
 */
export function useActiveLinkedInPosts(page: number = 0, size: number = 10, enabled: boolean = true) {
  return useQuery({
    queryKey: linkedinKeys.active(page, size),
    queryFn: () => linkedinService.getActiveLinkedInPosts(page, size),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Get all LinkedIn posts (including archived).
 * Used by admin panel to manage all posts.
 */
export function useAllLinkedInPosts(page: number = 0, size: number = 10, enabled: boolean = true) {
  return useQuery({
    queryKey: linkedinKeys.all_posts(page, size),
    queryFn: () => linkedinService.getAllLinkedInPosts(page, size),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    retryDelay: 2000,
  });
}

// ========== Mutations ==========

/**
 * Create a new LinkedIn post.
 */
export function useCreateLinkedInPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLinkedInPostRequest) => linkedinService.createLinkedInPost(data),
    onSuccess: () => {
      // Invalidate all posts queries
      queryClient.invalidateQueries({ queryKey: linkedinKeys.posts() });
    },
  });
}

/**
 * Update an existing LinkedIn post.
 */
export function useUpdateLinkedInPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLinkedInPostRequest }) =>
      linkedinService.updateLinkedInPost(id, data),
    onSuccess: (_, variables) => {
      // Invalidate all posts and specific post
      queryClient.invalidateQueries({ queryKey: linkedinKeys.posts() });
      queryClient.invalidateQueries({ queryKey: linkedinKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete a LinkedIn post.
 */
export function useDeleteLinkedInPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => linkedinService.deleteLinkedInPost(id),
    onSuccess: () => {
      // Invalidate all posts queries
      queryClient.invalidateQueries({ queryKey: linkedinKeys.posts() });
    },
  });
}
