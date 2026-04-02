'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import { fluenceService } from '@/lib/services/platform/fluence.service';
import {
  WikiPage,
  EditLockResponse,
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
  FavoriteContentType,
  WatchStatus,
} from '@/lib/types/platform/fluence';

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
  // Favorites
  favorites: () => [...fluenceKeys.all, 'favorites'] as const,
  // View tracking
  viewers: (contentId: string, contentType: string) =>
    [...fluenceKeys.all, 'viewers', contentType, contentId] as const,
  // My content
  myWikiPages: (page?: number, size?: number, status?: string) =>
    [...fluenceKeys.all, 'my-wiki-pages', { page, size, status }] as const,
  myBlogPosts: (page?: number, size?: number, status?: string) =>
    [...fluenceKeys.all, 'my-blog-posts', { page, size, status }] as const,
  // Activity feed
  activities: () => [...fluenceKeys.all, 'activities'] as const,
  activityFeed: (page?: number, size?: number, contentType?: string) =>
    [...fluenceKeys.activities(), { page, size, contentType }] as const,
  myActivity: (page?: number, size?: number) =>
    [...fluenceKeys.activities(), 'me', { page, size }] as const,
  // Attachments
  attachments: () => [...fluenceKeys.all, 'attachments'] as const,
  attachmentList: (contentType: string, contentId: string) =>
    [...fluenceKeys.attachments(), contentType, contentId] as const,
  recentAttachments: () => [...fluenceKeys.attachments(), 'recent'] as const,
  // Edit locks
  editLock: (contentType: string, contentId: string) =>
    [...fluenceKeys.all, 'edit-lock', contentType, contentId] as const,
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

export function useFluenceTemplates(
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

export function useFluenceTemplate(id: string, enabled: boolean = true) {
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
      queryClient.invalidateQueries({ queryKey: fluenceKeys.blogPosts() });
    },
  });
}

export function useUnlikeBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fluenceService.unlikeBlogPost(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.blogPostDetail(id) });
      queryClient.invalidateQueries({ queryKey: fluenceKeys.blogPosts() });
    },
  });
}

export function useLikeWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fluenceService.likeWikiPage(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPageDetail(id) });
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPages() });
    },
  });
}

export function useUnlikeWikiPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fluenceService.unlikeWikiPage(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPageDetail(id) });
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPages() });
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

export function useCreateFluenceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => fluenceService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.templates() });
    },
  });
}

export function useUpdateFluenceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateRequest }) =>
      fluenceService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.templates() });
    },
  });
}

export function useDeleteFluenceTemplate() {
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

// ─── View Tracking ─────────────────────────────────────────────────────────

export function useRecordView() {
  return useMutation({
    mutationFn: ({
      contentId,
      contentType,
    }: {
      contentId: string;
      contentType: 'WIKI' | 'BLOG';
    }) => fluenceService.recordView(contentId, contentType),
  });
}

export function useContentViewers(
  contentId: string,
  contentType: 'WIKI' | 'BLOG',
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.viewers(contentId, contentType),
    queryFn: () => fluenceService.getViewers(contentId, contentType),
    enabled: enabled && !!contentId,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Favorites ─────────────────────────────────────────────────────────────

export function useFluenceFavorites(enabled: boolean = true) {
  return useQuery({
    queryKey: fluenceKeys.favorites(),
    queryFn: () => fluenceService.listFavorites(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contentId,
      contentType,
    }: {
      contentId: string;
      contentType: FavoriteContentType;
    }) => fluenceService.addFavorite(contentId, contentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.favorites() });
      // Also refresh the detail pages so isFavoritedByCurrentUser updates
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPages() });
      queryClient.invalidateQueries({ queryKey: fluenceKeys.blogPosts() });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contentId,
      contentType,
    }: {
      contentId: string;
      contentType: FavoriteContentType;
    }) => fluenceService.removeFavoriteByContent(contentId, contentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.favorites() });
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPages() });
      queryClient.invalidateQueries({ queryKey: fluenceKeys.blogPosts() });
    },
  });
}

// ─── My Content ────────────────────────────────────────────────────────────

export function useMyWikiPages(
  page: number = 0,
  size: number = 20,
  status?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.myWikiPages(page, size, status),
    queryFn: () => fluenceService.listMyWikiPages(page, size, status),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyBlogPosts(
  page: number = 0,
  size: number = 20,
  status?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.myBlogPosts(page, size, status),
    queryFn: () => fluenceService.listMyBlogPosts(page, size, status),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Post Editor Mutations ─────────────────────────────────────────────────

export function useUpdateWikiPageEditors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, editorIds }: { pageId: string; editorIds: string[] }) =>
      fluenceService.updateWikiPageEditors(pageId, editorIds),
    onSuccess: (_data, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPageDetail(pageId) });
    },
  });
}

export function useUpdateBlogPostEditors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, editorIds }: { postId: string; editorIds: string[] }) =>
      fluenceService.updateBlogPostEditors(postId, editorIds),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.blogPostDetail(postId) });
    },
  });
}

// ─── Attachment Queries & Mutations ────────────────────────────────────────

export function useAttachments(
  contentType: string,
  contentId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.attachmentList(contentType, contentId),
    queryFn: () => fluenceService.getAttachments(contentType, contentId),
    enabled: enabled && !!contentType && !!contentId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecentAttachments(enabled: boolean = true) {
  return useQuery({
    queryKey: fluenceKeys.recentAttachments(),
    queryFn: () => fluenceService.getRecentAttachments(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contentType,
      contentId,
      file,
    }: {
      contentType: string;
      contentId: string;
      file: File;
    }) => fluenceService.uploadAttachment(contentType, contentId, file),
    onSuccess: (_data, { contentType, contentId }) => {
      queryClient.invalidateQueries({
        queryKey: fluenceKeys.attachmentList(contentType, contentId),
      });
      queryClient.invalidateQueries({
        queryKey: fluenceKeys.recentAttachments(),
      });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fluenceService.deleteAttachment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.attachments() });
    },
  });
}

// ─── Activity Feed ──────────────────────────────────────────────────────────

export function useActivityFeed(
  page: number = 0,
  size: number = 20,
  contentType?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.activityFeed(page, size, contentType),
    queryFn: () => fluenceService.getActivityFeed(page, size, contentType),
    enabled,
    staleTime: 1 * 60 * 1000,
  });
}

export function useMyActivity(
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: fluenceKeys.myActivity(page, size),
    queryFn: () => fluenceService.getMyActivity(page, size),
    enabled,
    staleTime: 1 * 60 * 1000,
  });
}

// ─── Restore Wiki Page Revision ────────────────────────────────────────────

export function useRestoreWikiPageRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, revisionId }: { pageId: string; revisionId: string }) =>
      fluenceService.restoreWikiPageRevision(pageId, revisionId),
    onSuccess: (_data, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPageDetail(pageId) });
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPageRevisions(pageId) });
      queryClient.invalidateQueries({ queryKey: fluenceKeys.wikiPages() });
    },
  });
}

// ─── Edit Lock Hook ────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Hook to manage edit locks for Fluence content.
 * Acquires a lock on mount, sends heartbeats every 2 minutes, and releases on unmount.
 */
export function useEditLock(contentType: string, contentId: string, enabled: boolean = true) {
  const [lockInfo, setLockInfo] = useState<EditLockResponse | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contentTypeRef = useRef(contentType);
  const contentIdRef = useRef(contentId);

  contentTypeRef.current = contentType;
  contentIdRef.current = contentId;

  const acquireLock = useCallback(async () => {
    if (!enabled || !contentId) return;
    try {
      const response = await fluenceService.acquireEditLock(contentType, contentId);
      setLockInfo(response);
    } catch (_error) {
      // Lock service unavailable — allow editing without lock
      setLockInfo(null);
    }
  }, [contentType, contentId, enabled]);

  const forceAcquireLock = useCallback(async () => {
    if (!contentId) return;
    try {
      const response = await fluenceService.acquireEditLock(contentType, contentId);
      setLockInfo(response);
    } catch {
      setLockInfo(null);
    }
  }, [contentType, contentId]);

  useEffect(() => {
    if (!enabled || !contentId) return;

    // Acquire lock on mount
    acquireLock();

    // Start heartbeat interval
    heartbeatRef.current = setInterval(async () => {
      try {
        await fluenceService.refreshEditLock(contentTypeRef.current, contentIdRef.current);
      } catch {
        // Heartbeat failed — lock may have expired
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Cleanup: release lock and stop heartbeat
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // Fire-and-forget release
      fluenceService.releaseEditLock(contentTypeRef.current, contentIdRef.current).catch(() => {
        // Best effort release
      });
    };
  }, [contentId, enabled, acquireLock]);

  const isLockedByOther = lockInfo?.locked === true && lockInfo?.isOwnLock === false;
  const lockedByName = isLockedByOther ? lockInfo?.lockedByUserName ?? 'Another user' : null;

  return {
    lockInfo,
    isLockedByOther,
    lockedByName,
    forceAcquireLock,
  };
}

// ─── Watch / Subscribe Hooks ────────────────────────────────────────────────

export const watchKeys = {
  wikiWatch: (pageId: string) => [...fluenceKeys.all, 'watch', 'wiki', pageId] as const,
};

export function useWatchStatus(pageId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: watchKeys.wikiWatch(pageId),
    queryFn: () => fluenceService.getWatchStatusWikiPage(pageId),
    enabled: enabled && !!pageId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useToggleWatchWikiPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => fluenceService.toggleWatchWikiPage(pageId),
    onSuccess: (_data, pageId) => {
      queryClient.invalidateQueries({ queryKey: watchKeys.wikiWatch(pageId) });
    },
  });
}
