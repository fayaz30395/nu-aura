import { apiClient as api } from '../api/client';

// Types
export interface AuthorInfo {
  id: string;
  employeeId: string;
  fullName: string;
  designation?: string;
  department?: string;
  avatarUrl?: string;
}

export interface PollOptionResponse {
  id: string;
  text: string;
  voteCount: number;
  votePercentage: number;
}

export type PostType = 'POST' | 'POLL' | 'PRAISE';
export type PostVisibility = 'ORGANIZATION' | 'DEPARTMENT' | 'TEAM';
export type ReactionType = 'LIKE' | 'LOVE' | 'CELEBRATE' | 'INSIGHTFUL' | 'CURIOUS';

export interface WallPostResponse {
  id: string;
  type: PostType;
  content: string;
  author: AuthorInfo;
  praiseRecipient?: AuthorInfo;
  imageUrl?: string;
  pinned: boolean;
  visibility: PostVisibility;
  pollOptions?: PollOptionResponse[];
  likeCount: number;
  commentCount: number;
  reactionCounts: Record<string, number>;
  hasReacted: boolean;
  userReactionType?: string;
  hasVoted: boolean;
  userVotedOptionId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CommentResponse {
  id: string;
  postId: string;
  author: AuthorInfo;
  content: string;
  parentCommentId?: string;
  replies?: CommentResponse[];
  replyCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePostRequest {
  type: PostType;
  content: string;
  praiseRecipientId?: string;
  imageUrl?: string;
  visibility?: PostVisibility;
  pollOptions?: string[];
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string;
}

export interface ReactionRequest {
  reactionType: ReactionType;
}

export interface VoteRequest {
  optionId: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

class WallService {
  // ==================== POSTS ====================

  async createPost(request: CreatePostRequest): Promise<WallPostResponse> {
    const response = await api.post<WallPostResponse>('/wall/posts', request);
    return response.data;
  }

  async getPosts(page = 0, size = 10): Promise<PageResponse<WallPostResponse>> {
    const response = await api.get<PageResponse<WallPostResponse>>('/wall/posts', {
      params: { page, size },
    });
    return response.data;
  }

  async getPostsByType(type: PostType, page = 0, size = 10): Promise<PageResponse<WallPostResponse>> {
    const response = await api.get<PageResponse<WallPostResponse>>(`/wall/posts/type/${type}`, {
      params: { page, size },
    });
    return response.data;
  }

  async getPost(postId: string): Promise<WallPostResponse> {
    const response = await api.get<WallPostResponse>(`/wall/posts/${postId}`);
    return response.data;
  }

  async deletePost(postId: string): Promise<void> {
    await api.delete(`/wall/posts/${postId}`);
  }

  async pinPost(postId: string, pinned: boolean): Promise<WallPostResponse> {
    const response = await api.patch<WallPostResponse>(`/wall/posts/${postId}/pin`, null, {
      params: { pinned },
    });
    return response.data;
  }

  // ==================== REACTIONS ====================

  async addReaction(postId: string, reactionType: ReactionType): Promise<void> {
    await api.post(`/wall/posts/${postId}/reactions`, { reactionType });
  }

  async removeReaction(postId: string): Promise<void> {
    await api.delete(`/wall/posts/${postId}/reactions`);
  }

  // ==================== COMMENTS ====================

  async addComment(postId: string, request: CreateCommentRequest): Promise<CommentResponse> {
    const response = await api.post<CommentResponse>(`/wall/posts/${postId}/comments`, request);
    return response.data;
  }

  async getComments(postId: string, page = 0, size = 20): Promise<PageResponse<CommentResponse>> {
    const response = await api.get<PageResponse<CommentResponse>>(`/wall/posts/${postId}/comments`, {
      params: { page, size },
    });
    return response.data;
  }

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/wall/comments/${commentId}`);
  }

  // ==================== POLLS ====================

  async vote(postId: string, optionId: string): Promise<WallPostResponse> {
    const response = await api.post<WallPostResponse>(`/wall/posts/${postId}/vote`, { optionId });
    return response.data;
  }

  async removeVote(postId: string): Promise<void> {
    await api.delete(`/wall/posts/${postId}/vote`);
  }

  // ==================== PRAISE ====================

  async getPraiseForEmployee(employeeId: string, page = 0, size = 10): Promise<PageResponse<WallPostResponse>> {
    const response = await api.get<PageResponse<WallPostResponse>>(`/wall/praise/employee/${employeeId}`, {
      params: { page, size },
    });
    return response.data;
  }
}

export const wallService = new WallService();
export default wallService;
