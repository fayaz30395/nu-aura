'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '@/lib/api/client';

export interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  views: number;
  helpful: number;
  unhelpful: number;
  updatedAt: string;
  author?: string;
}

export interface KnowledgeBaseFilters {
  category?: string;
  q?: string;
}

// Query keys for cache management
export const knowledgeBaseKeys = {
  all: ['knowledge-base'] as const,
  articles: () => [...knowledgeBaseKeys.all, 'articles'] as const,
  articlesList: (filters: KnowledgeBaseFilters) =>
    [...knowledgeBaseKeys.articles(), filters] as const,
};

/**
 * Fetch knowledge base articles with optional filters
 */
export function useKnowledgeBaseArticles(filters: KnowledgeBaseFilters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.q) params.append('q', filters.q);

  return useQuery({
    queryKey: knowledgeBaseKeys.articlesList(filters),
    queryFn: async () => {
      const response = await apiClient.get<{ articles: Article[] }>(
        `/helpdesk/knowledge-base?${params.toString()}`
      );
      return response.data.articles ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation to submit helpful/unhelpful feedback for an article
 */
export function useArticleFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({articleId, helpful}: { articleId: string; helpful: boolean }) => {
      const response = await apiClient.patch(
        `/helpdesk/knowledge-base/${articleId}/helpful`,
        {helpful}
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate articles list to refresh feedback counts
      queryClient.invalidateQueries({queryKey: knowledgeBaseKeys.articles()});
    },
  });
}

export interface CreateArticleRequest {
  title: string;
  category: string;
  content: string;
}

/**
 * Mutation to create a new knowledge base article
 */
export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateArticleRequest) => {
      const response = await apiClient.post<Article>(
        '/helpdesk/knowledge-base',
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: knowledgeBaseKeys.articles()});
    },
  });
}

/**
 * Mutation to create a helpdesk ticket from knowledge base
 */
export interface CreateTicketFromKBRequest {
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  relatedArticleId?: string;
}

export function useCreateTicketFromKB() {
  return useMutation({
    mutationFn: async (data: CreateTicketFromKBRequest) => {
      const response = await apiClient.post('/helpdesk/tickets', data);
      return response.data;
    },
  });
}
