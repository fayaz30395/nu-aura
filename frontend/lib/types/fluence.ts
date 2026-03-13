// NU-Fluence Knowledge Management & Collaboration Types

// ─── Enums ──────────────────────────────────────────────────────────────────

export type WikiPageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type WikiVisibility = 'PUBLIC' | 'ORGANIZATION' | 'TEAM' | 'PRIVATE' | 'RESTRICTED';

export type BlogPostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type BlogVisibility = 'PUBLIC' | 'ORGANIZATION' | 'TEAM' | 'PRIVATE';

export type CommentContentType = 'WIKI' | 'BLOG';

export type FluenceSearchResultType = 'wiki' | 'blog' | 'template';

// ─── Wiki Types ─────────────────────────────────────────────────────────────

export interface WikiPage {
  id: string;
  title: string;
  slug: string;
  content: Record<string, unknown>; // JSON content (e.g., TipTap editor output)
  spaceId: string;
  parentId?: string; // For hierarchical pages
  authorId: string;
  authorName?: string;
  status: WikiPageStatus;
  visibility: WikiVisibility;
  version: number;
  viewCount?: number;
  likeCount?: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface WikiSpace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  ownerId: string;
  ownerName?: string;
  visibility: WikiVisibility;
  pageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWikiPageRequest {
  title: string;
  content: Record<string, unknown>;
  spaceId: string;
  parentId?: string;
  visibility: WikiVisibility;
  status?: WikiPageStatus;
}

export interface UpdateWikiPageRequest {
  title?: string;
  content?: Record<string, unknown>;
  visibility?: WikiVisibility;
  status?: WikiPageStatus;
  parentId?: string;
}

export interface CreateWikiSpaceRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility: WikiVisibility;
}

export interface UpdateWikiSpaceRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: WikiVisibility;
}

// ─── Blog Types ─────────────────────────────────────────────────────────────

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: Record<string, unknown>; // JSON content (e.g., TipTap editor output)
  excerpt: string;
  coverImageUrl?: string;
  authorId: string;
  authorName?: string;
  categoryId?: string;
  categoryName?: string;
  status: BlogPostStatus;
  visibility: BlogVisibility;
  tags: string[];
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  postCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogPostRequest {
  title: string;
  content: Record<string, unknown>;
  excerpt: string;
  categoryId?: string;
  tags: string[];
  visibility: BlogVisibility;
  coverImageUrl?: string;
  status?: BlogPostStatus;
}

export interface UpdateBlogPostRequest {
  title?: string;
  content?: Record<string, unknown>;
  excerpt?: string;
  categoryId?: string;
  tags?: string[];
  visibility?: BlogVisibility;
  coverImageUrl?: string;
  status?: BlogPostStatus;
}

export interface CreateBlogCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}

// ─── Template Types ─────────────────────────────────────────────────────────

export interface DocumentTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string;
  content: Record<string, unknown>; // JSON template content
  categoryId?: string;
  categoryName?: string;
  authorId: string;
  authorName?: string;
  usageCount: number;
  icon?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  content: Record<string, unknown>;
  categoryId?: string;
  tags?: string[];
  icon?: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  content?: Record<string, unknown>;
  categoryId?: string;
  tags?: string[];
  icon?: string;
}

export interface InstantiateTemplateRequest {
  templateId: string;
  documentTitle: string;
  spaceId?: string; // If creating as a wiki page
}

// ─── Comment Types ──────────────────────────────────────────────────────────

export interface FluenceComment {
  id: string;
  contentId: string; // Wiki page ID or blog post ID
  contentType: CommentContentType;
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string;
  body: string;
  parentId?: string; // For threaded comments
  createdAt: string;
  updatedAt: string;
  likeCount?: number;
  replies?: FluenceComment[];
}

export interface CreateCommentRequest {
  body: string;
  parentId?: string; // For replies
}

export interface UpdateCommentRequest {
  body: string;
}

// ─── Search Types ───────────────────────────────────────────────────────────

export interface FluenceSearchResult {
  id: string;
  type: FluenceSearchResultType;
  title: string;
  excerpt?: string;
  highlightedContent?: string; // Snippet with search term highlighted
  author?: string;
  updatedAt: string;
  url?: string; // Route to navigate to
}

export interface FluenceSearchResponse {
  results: FluenceSearchResult[];
  totalCount: number;
  query: string;
  executionTimeMs: number;
}

// ─── Pagination Types ───────────────────────────────────────────────────────

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ─── Activity & Metadata Types ──────────────────────────────────────────────

export interface WikiPageRevision {
  id: string;
  pageId: string;
  version: number;
  title: string;
  content: Record<string, unknown>;
  authorId: string;
  authorName?: string;
  changeDescription?: string;
  createdAt: string;
}

export interface ContentActivity {
  id: string;
  contentId: string;
  contentType: CommentContentType;
  activityType: 'CREATED' | 'UPDATED' | 'DELETED' | 'COMMENTED' | 'LIKED';
  actorId: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
