'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fluenceService } from '@/lib/services/fluence.service';
import {
  WikiPage,
  WikiSpace,
  BlogPost,
  BlogCategory,
  DocumentTemplate,
  FluenceComment,
  FluenceSearchResponse,
  Page,
  CreateWikiPageRequest,
  UpdateWikiPageRequest,
  CreateWikiSpaceRequest,
  UpdateWikiSpaceRequest,
  CreateBlogPostRequest,
  UpdateBlogPostRequest,
  CreateBlogCategoryRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  InstantiateTemplateRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
} from '@/lib/types/fluence';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const fluenceKeys = {
  all: ['fluence'] as const,
  // Wiki pages
  wikiPages: () => [...fluenceKeys.all, 'wiki-pages'] as const,
  wikiPageList: (spaceId?: string, page?: number, size?: number) =>
    [...fluenceKeys.wikiPages(), { spaceId, page, size }] as const,
  wikiPageDetail: (id: string) =>
    [...fluenceKeys.wikiPages(), 'detail', id] as const,
  wikiPageBySlug: (spaceId: string, slug: string) =>
    [...fluenceKeys.wikiPages(), 'slug', spaceId, slug] as const,
  wikiPageRevisions: (pageId: string) =>
    [...fluenceKeys.wikiPages(), 'revisions', pageId] as const,
  // Wiki spaces
  wikiSpaces: () => [...fluenceKeys.all, 'wiki-spaces'] as const,
  wikiSpaceList: (page?: number, size?: number) =>
    [...fluenceKeys.wikiSpaces(), { page, size }] as const,
  wikiSpaceDetail: (id: string) =>
    [...fluenceKeys.wikiSpaces(), 'detail', id] as const,
  // Blog posts
  blogPosts: () => [...fluenceKeys.all, 'blog-posts'] as const,
  blogPostList: (categoryId?: string, page?: number, size?: number) =>
    [...fluenceKeys.blogPosts(), { categoryId, page, size }] as const,
  blogPostDetail: (id: string) =>
    [...fluenceKeys.blogPosts(), 'detail', id] as const,
  blogPostBySlug: (slug: string) =>
    [...fluenceKeys.blogPosts(), 'slug', slug] as const,
  // Blog categories
  blogCategories: () => [...fluenceKeys.all, 'blog-categories'] as const,
  blogCategoryDetail: (id: string) =>
    [...fluenceKeys.blogCategories(), 'detail', id] as const,
  // Templates
  templates: () => [...fluenceKeys.all, 'templates'] as const,
  templateList: (categoryId?: string, page?: number, size?: number) =>
    [...fluenceKeys.templates(), { categoryId, page, size }] as const,
  templateDetail: (id: string) =>
    [...fluenceKeys.templates(), 'detail', id] as const,
  // Comments
  comments: () => [...fluenceKeys.all, 'comments'] as const,
  commentList: (contentId: string, contentType: string) =>
    [...fluenceKeys.comments(), contentType, contentId] as const,
  // Search
  search: () => [...fluenceKeys.all, 'search'] as const,
  searchResults: (query: string, type?: string) =>
    [...fluenceKeys.search(), { query, type }] as const,
};

// ─── Wiki Page Queries ──────────────────────────────────────────────────────

export function useWikiPages(
  spaceId?: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.wikiPageList(spaceId, page, size),
    queryFn: () => fluenceService.listWikiPages(spaceId, page, size),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useWikiPage(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fluenceKeys.wikiPageDetail(id),
    queryFn: () => fluenceService.getWikiPage(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useWikiPageBySlug(
  spaceId: string,
  slug: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.wikiPageBySlug(spaceId, slug),
    queryFn: () => fluenceService.getWikiPageBySlug(spaceId, slug),
    enabled: enabled && !!spaceId && !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWikiPageRevisions(pageId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fluenceKeys.wikiPageRevisions(pageId),
    queryFn: () => fluenceService.getWikiPageRevisions(pageId),
    enabled: enabled && !!pageId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Wiki Space Queries ─────────────────────────────────────────────────────

export function useWikiSpaces(page: number = 0, size: number = 20, enabled: boolean = true) {
  return useQuery({
    queryKey: fluenceKeys.wikiSpaceList(page, size),
    queryFn: () => fluenceService.listWikiSpaces(page, size),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useWikiSpace(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fluenceKeys.wikiSpaceDetail(id),
    queryFn: () => fluenceService.getWikiSpace(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Blog Post Queries ──────────────────────────────────────────────────────

export function useBlogPosts(
  page: number = 0,
  size: number = 20,
  categoryId?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.blogPostList(categoryId, page, size),
    queryFn: () => fluenceService.listBlogPosts(page, size, categoryId),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useBlogPost(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fluenceKeys.blogPostDetail(id),
    queryFn: () => fluenceService.getBlogPost(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBlogPostBySlug(slug: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fluenceKeys.blogPostBySlug(slug),
    queryFn: () => fluenceService.getBlogPostBySlug(slug),
    enabled: enabled && !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Blog Category Queries ──────────────────────────────────────────────────

export function useBlogCategories(enabled: boolean = true) {
  return useQuery({
    queryKey: fluenceKeys.blogCategories(),
    queryFn: () => fluenceService.listBlogCategories(),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes, categories change less frequently
  });
}

export function useBlogCategory(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fluenceKeys.blogCategoryDetail(id),
    queryFn: () => fluenceService.getBlogCategory(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Template Queries ───────────────────────────────────────────────────────

export function useTemplates(
  page: number = 0,
  size: number = 20,
  categoryId?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.templateList(categoryId, page, size),
    queryFn: () => fluenceService.listTemplates(page, size, categoryId),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTemplate(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fluenceKeys.templateDetail(id),
    queryFn: () => fluenceService.getTemplate(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Comment Queries ────────────────────────────────────────────────────────

export function useComments(
  contentId: string,
  contentType: 'WIKI' | 'BLOG',
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.commentList(contentId, contentType),
    queryFn: () => fluenceService.listComments(contentId, contentType, page, size),
    enabled: enabled && !!contentId,
    staleTime: 1 * 60 * 1000, // 1 minute, comments update frequently
  });
}

// ─── Search Queries ─────────────────────────────────────────────────────────

export function useFluenceSearch(
  query: string,
  type?: 'WIKI' | 'BLOG' | 'TEMPLATE',
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.searchResults(query, type),
    queryFn: () => fluenceService.searchFluence(query, type, page, size),
    enabled: enabled && query.length > 0,
    staleTime: 30 * 1000, // 30 seconds for search
  });
}

// ─── Wiki Page Mutations ────────────────────────────────────────────────────

export function useCreateWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWikiPageRequest) => fluenceService.createWikiPage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPages() });
    },
  });
}

export function useUpdateWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWikiPageRequest }) =>
      fluenceService.updateWikiPage(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: fluenceKeys.wikiPageDetail(id) });
      const previousPage = queryClient.getQueryData<WikiPage>(
        fluenceKeys.wikiPageDetail(id)
      );

      if (previousPage) {
        queryClient.setQueryData(fluenceKeys.wikiPageDetail(id), {
          ...previousPage,
          ...data,
        });
      }

      return { previousPage };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousPage) {
        queryClient.setQueryData(fluenceKeys.wikiPageDetail(id), context.previousPage);
      }
    },
    onSettled: (_, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPageDetail(id) });
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPages() });
    },
  });
}

export function useDeleteWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fluenceService.deleteWikiPage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPages() });
    },
  });
}

// ─── Wiki Space Mutations ───────────────────────────────────────────────────

export function useCreateWikiSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWikiSpaceRequest) => fluenceService.createWikiSpace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiSpaces() });
    },
  });
}

export function useUpdateWikiSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWikiSpaceRequest }) =>
      fluenceService.updateWikiSpace(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiSpaces() });
    },
  });
}

export function useDeleteWikiSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fluenceService.deleteWikiSpace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiSpaces() });
    },
  });
}

// ─── Blog Post Mutations ────────────────────────────────────────────────────

export function useCreateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBlogPostRequest) => fluenceService.createBlogPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.blogPosts() });
    },
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlogPostRequest }) =>
      fluenceService.updateBlogPost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.blogPosts() });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fluenceService.deleteBlogPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.blogPosts() });
    },
  });
}

export function useLikeBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fluenceService.likeBlogPost(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.blogPostDetail(id) });
    },
  });
}

// ─── Blog Category Mutations ────────────────────────────────────────────────

export function useCreateBlogCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBlogCategoryRequest) =>
      fluenceService.createBlogCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.blogCategories() });
    },
  });
}

// ─── Template Mutations ─────────────────────────────────────────────────────

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => fluenceService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.templates() });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateRequest }) =>
      fluenceService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.templates() });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fluenceService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.templates() });
    },
  });
}

export function useInstantiateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InstantiateTemplateRequest) =>
      fluenceService.instantiateTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPages() });
    },
  });
}

// ─── Comment Mutations ──────────────────────────────────────────────────────

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contentId,
      contentType,
      data,
    }: {
      contentId: string;
      contentType: 'WIKI' | 'BLOG';
      data: CreateCommentRequest;
    }) => fluenceService.createComment(contentId, contentType, data),
    onSuccess: (_data, { contentId, contentType }) => {
      queryClient.invalidateQueries({
        queryKey: fluenceKeys.commentList(contentId, contentType),
      });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contentId,
      contentType,
      commentId,
      data,
    }: {
      contentId: string;
      contentType: 'WIKI' | 'BLOG';
      commentId: string;
      data: UpdateCommentRequest;
    }) => fluenceService.updateComment(contentId, contentType, commentId, data),
    onSuccess: (_data, { contentId, contentType }) => {
      queryClient.invalidateQueries({
        queryKey: fluenceKeys.commentList(contentId, contentType),
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contentId,
      contentType,
      commentId,
    }: {
      contentId: string;
      contentType: 'WIKI' | 'BLOG';
      commentId: string;
    }) => fluenceService.deleteComment(contentId, contentType, commentId),
    onSuccess: (_data, { contentId, contentType }) => {
      queryClient.invalidateQueries({
        queryKey: fluenceKeys.commentList(contentId, contentType),
      });
    },
  });
}
