'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  keepPreviousData,
} from '@tanstack/react-query';
import { wallService } from '@/lib/services/core/wall.service';
import {
  PostType,
  ReactionType,
  WallPostResponse,
  CreatePostRequest,
  PageResponse,
} from '@/lib/services/core/wall.service';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const wallKeys = {
  all: ['wall'] as const,
  // Posts
  posts: () => [...wallKeys.all, 'posts'] as const,
  postList: (type?: PostType, page?: number, size?: number) =>
    [...wallKeys.posts(), { type, page, size }] as const,
  postDetail: (id: string) => [...wallKeys.posts(), 'detail', id] as const,
  // Comments
  comments: () => [...wallKeys.all, 'comments'] as const,
  commentList: (postId: string, page?: number, size?: number) =>
    [...wallKeys.comments(), postId, { page, size }] as const,
  // Praise
  praise: () => [...wallKeys.all, 'praise'] as const,
  praiseForEmployee: (empId: string) =>
    [...wallKeys.praise(), empId] as const,
};

// ─── Wall Post Queries ──────────────────────────────────────────────────────

export function useWallPosts(
  type?: PostType,
  page: number = 0,
  size: number = 10,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: wallKeys.postList(type, page, size),
    queryFn: () =>
      type ? wallService.getPostsByType(type, page, size) : wallService.getPosts(page, size),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });
}

export function useInfiniteWallPosts(type?: PostType, size: number = 10) {
  return useInfiniteQuery({
    queryKey: wallKeys.postList(type, undefined, size),
    queryFn: ({ pageParam = 0 }) =>
      type
        ? wallService.getPostsByType(type, pageParam, size)
        : wallService.getPosts(pageParam, size),
    initialPageParam: 0,
    getNextPageParam: (lastPage: PageResponse<WallPostResponse>) => {
      if (lastPage.last) {
        return undefined;
      }
      return lastPage.number + 1;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useWallPost(postId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: wallKeys.postDetail(postId),
    queryFn: () => wallService.getPost(postId),
    enabled: enabled && !!postId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ─── Wall Comment Queries ───────────────────────────────────────────────────

export function useWallComments(
  postId: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: wallKeys.commentList(postId, page, size),
    queryFn: () => wallService.getComments(postId, page, size),
    enabled: enabled && !!postId,
    staleTime: 1 * 60 * 1000, // 1 minute, comments update frequently
    gcTime: 5 * 60 * 1000,
  });
}

// ─── Praise Query ───────────────────────────────────────────────────────────

export function usePraiseForEmployee(
  employeeId: string,
  page: number = 0,
  size: number = 10,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: wallKeys.praiseForEmployee(employeeId),
    queryFn: () => wallService.getPraiseForEmployee(employeeId, page, size),
    enabled: enabled && !!employeeId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ─── Wall Post Mutations ────────────────────────────────────────────────────

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostRequest) => wallService.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => wallService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
    },
  });
}

export function usePinPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, pinned }: { postId: string; pinned: boolean }) =>
      wallService.pinPost(postId, pinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
    },
  });
}

// ─── Reaction Mutations ─────────────────────────────────────────────────────

export function useAddWallReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, reactionType }: { postId: string; reactionType: ReactionType }) =>
      wallService.addReaction(postId, reactionType),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: wallKeys.postDetail(postId) });
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
    },
  });
}

export function useRemoveWallReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => wallService.removeReaction(postId),
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: wallKeys.postDetail(postId) });
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
    },
  });
}

// ─── Comment Mutations ──────────────────────────────────────────────────────

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content, parentCommentId }: {
      postId: string;
      content: string;
      parentCommentId?: string;
    }) => wallService.addComment(postId, { content, parentCommentId }),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: wallKeys.commentList(postId) });
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
    },
  });
}

export function useDeleteWallComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }: { commentId: string; postId: string }) =>
      wallService.deleteComment(commentId),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: wallKeys.commentList(postId) });
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
    },
  });
}

// ─── Poll Vote Mutations ────────────────────────────────────────────────────

export function useVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, optionId }: { postId: string; optionId: string }) =>
      wallService.vote(postId, optionId),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: wallKeys.postDetail(postId) });
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
    },
  });
}

export function useRemoveVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => wallService.removeVote(postId),
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: wallKeys.postDetail(postId) });
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
    },
  });
}
