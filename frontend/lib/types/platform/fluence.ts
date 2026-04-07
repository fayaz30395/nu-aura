// NU-Fluence Knowledge Management & Collaboration Types

// ─── Enums ──────────────────────────────────────────────────────────────────

export type WikiPageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type WikiVisibility = 'PUBLIC' | 'ORGANIZATION' | 'DEPARTMENT' | 'PRIVATE' | 'RESTRICTED';

export type BlogPostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type BlogVisibility = 'PUBLIC' | 'ORGANIZATION' | 'DEPARTMENT' | 'PRIVATE' | 'RESTRICTED';

export type CommentContentType = 'WIKI' | 'BLOG';

export type FluenceSearchResultType = 'wiki' | 'blog' | 'template';

// ─── Wiki Types ─────────────────────────────────────────────────────────────

export interface WikiPage {
  id: string;
  title: string;
  slug: string;
  content: Record<string, unknown>; // JSON content (e.g., TipTap editor output)
  spaceId: string;
  spaceName?: string;
  parentId?: string; // For hierarchical pages
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string;
  status: WikiPageStatus;
  visibility: WikiVisibility;
  version: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  /** Department the page belongs to — when visibility is DEPARTMENT, only members of this dept see it */
  departmentId?: string;
  departmentName?: string;
  /** Additional departments granted read access (beyond the owning department) */
  sharedWithDepartmentIds?: string[];
  /** Individual employees granted explicit access regardless of department */
  sharedWithEmployeeIds?: string[];
  /** Users who have been granted edit permission on this page */
  editorIds?: string[];
  isLikedByCurrentUser?: boolean;
  isFavoritedByCurrentUser?: boolean;
  /** Whether the current user can edit this page */
  canEdit?: boolean;
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
  /** Department this page belongs to (for DEPARTMENT visibility) */
  departmentId?: string;
  /** Additional departments to share with */
  sharedWithDepartmentIds?: string[];
  /** Individual employees to share with */
  sharedWithEmployeeIds?: string[];
  /** User IDs who can edit this page */
  editorIds?: string[];
}

export interface UpdateWikiPageRequest {
  title?: string;
  content?: Record<string, unknown>;
  visibility?: WikiVisibility;
  status?: WikiPageStatus;
  parentId?: string;
  departmentId?: string;
  sharedWithDepartmentIds?: string[];
  sharedWithEmployeeIds?: string[];
  editorIds?: string[];
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
  authorAvatarUrl?: string;
  categoryId?: string;
  categoryName?: string;
  status: BlogPostStatus;
  visibility: BlogVisibility;
  tags: string[];
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  /** Department the post belongs to — when visibility is DEPARTMENT, only members see it */
  departmentId?: string;
  departmentName?: string;
  /** Additional departments granted read access */
  sharedWithDepartmentIds?: string[];
  /** Individual employees granted explicit access regardless of department */
  sharedWithEmployeeIds?: string[];
  /** Users who have been granted edit permission on this post */
  editorIds?: string[];
  isLikedByCurrentUser?: boolean;
  isFavoritedByCurrentUser?: boolean;
  /** Whether the current user can edit this post */
  canEdit?: boolean;
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
  /** Department this post belongs to (for DEPARTMENT visibility) */
  departmentId?: string;
  /** Additional departments to share with */
  sharedWithDepartmentIds?: string[];
  /** Individual employees to share with */
  sharedWithEmployeeIds?: string[];
  /** User IDs who can edit this post */
  editorIds?: string[];
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
  departmentId?: string;
  sharedWithDepartmentIds?: string[];
  sharedWithEmployeeIds?: string[];
  editorIds?: string[];
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

export interface FluenceActivity {
  id: string;
  actorId: string;
  actorName: string;
  action: 'CREATED' | 'UPDATED' | 'PUBLISHED' | 'COMMENTED' | 'LIKED';
  contentType: 'WIKI' | 'BLOG' | 'TEMPLATE';
  contentId: string;
  contentTitle: string;
  contentExcerpt: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Favorites Types ───────────────────────────────────────────────────────

export type FavoriteContentType = 'WIKI_PAGE' | 'BLOG_POST' | 'WIKI_SPACE';

export interface FluenceFavorite {
  id: string;
  contentId: string;
  contentType: FavoriteContentType;
  /** Denormalized title for quick display */
  contentTitle: string;
  userId: string;
  createdAt: string;
}

// ─── View Tracking Types ───────────────────────────────────────────────────

export interface ContentViewRecord {
  id: string;
  contentId: string;
  contentType: CommentContentType;
  viewerId: string;
  viewerName?: string;
  viewedAt: string;
}

// ─── Attachment Types ──────────────────────────────────────────────────────

export interface FluenceAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  downloadUrl: string;
  createdAt: string;
  createdBy: string;
}

// ─── Edit Lock Types ───────────────────────────────────────────────────────

export interface EditLockResponse {
  locked: boolean;
  lockedByUserId: string | null;
  lockedByUserName: string | null;
  lockedAt: string | null;
  isOwnLock: boolean;
}

// ─── My Content Filters ────────────────────────────────────────────────────

export interface MyContentFilters {
  type?: 'WIKI' | 'BLOG';
  status?: WikiPageStatus | BlogPostStatus;
  page?: number;
  size?: number;
}

// ─── Watch/Subscription Types ────────────────────────────────────────────────

export interface WatchStatus {
  watching: boolean;
}

export interface SavedSearch {
  id: string;
  query: string;
  contentType?: 'WIKI' | 'BLOG' | 'TEMPLATE';
  visibility?: string;
  createdAt: string;
}

// ─── Wiki Page Tree Types ─────────────────────────────────────────────────

export interface WikiPageTreeNode {
  id: string;
  title: string;
  slug: string;
  status: string;
  isPinned: boolean;
  viewCount: number;
  parentPageId?: string;
  children: WikiPageTreeNode[];
}

export interface WikiPageBreadcrumb {
  id: string;
  title: string;
  slug: string;
}

// ─── Space Member Types ───────────────────────────────────────────────────────

export type SpaceMemberRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface SpaceMember {
  id: string;
  spaceId: string;
  userId: string;
  userName?: string;
  role: SpaceMemberRole;
  addedBy?: string;
  addedAt?: string;
}

export interface AddSpaceMemberRequest {
  userId: string;
  role: SpaceMemberRole;
}

export interface UpdateSpaceMemberRoleRequest {
  role: SpaceMemberRole;
}

// ─── Inline Comment Types ────────────────────────────────────────────────

export type InlineCommentStatus = 'OPEN' | 'RESOLVED' | 'DELETED';

export interface WikiInlineComment {
  id: string;
  pageId: string;
  parentCommentId?: string;
  anchorSelector?: string;
  anchorText?: string;
  anchorOffset?: number;
  content: string;
  status: InlineCommentStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  replies?: WikiInlineComment[];
}

export interface CreateInlineCommentRequest {
  anchorSelector?: string;
  anchorText?: string;
  anchorOffset?: number;
  content: string;
}

export interface ReplyToInlineCommentRequest {
  content: string;
}
