import { apiClient } from '../api/client';
import {
  WikiPage,
  WikiSpace,
  BlogPost,
  BlogCategory,
  DocumentTemplate,
  FluenceComment,
  FluenceSearchResponse,
  FluenceFavorite,
  FluenceAttachment,
  ContentViewRecord,
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
  WikiPageRevision,
  FavoriteContentType,
} from '../types/fluence';

class FluenceService {
  // ─── Wiki Pages ─────────────────────────────────────────────────────────────

  async listWikiPages(
    spaceId?: string,
    page: number = 0,
    size: number = 20,
    sortBy: string = 'updatedAt',
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<Page<WikiPage>> {
    const params: Record<string, unknown> = { page, size, sortBy, sortDirection };
    if (spaceId) {
      params.spaceId = spaceId;
    }
    const response = await apiClient.get<Page<WikiPage>>('/fluence/wiki/pages', { params });
    return response.data;
  }

  async getWikiPage(id: string): Promise<WikiPage> {
    const response = await apiClient.get<WikiPage>(`/fluence/wiki/pages/${id}`);
    return response.data;
  }

  async getWikiPageBySlug(spaceId: string, slug: string): Promise<WikiPage> {
    const response = await apiClient.get<WikiPage>(
      `/fluence/wiki/spaces/${spaceId}/pages/${slug}`
    );
    return response.data;
  }

  async createWikiPage(data: CreateWikiPageRequest): Promise<WikiPage> {
    const response = await apiClient.post<WikiPage>('/fluence/wiki/pages', data);
    return response.data;
  }

  async updateWikiPage(id: string, data: UpdateWikiPageRequest): Promise<WikiPage> {
    const response = await apiClient.put<WikiPage>(`/fluence/wiki/pages/${id}`, data);
    return response.data;
  }

  async deleteWikiPage(id: string): Promise<void> {
    await apiClient.delete(`/fluence/wiki/pages/${id}`);
  }

  async getWikiPageRevisions(pageId: string): Promise<WikiPageRevision[]> {
    const response = await apiClient.get<WikiPageRevision[]>(
      `/fluence/wiki/pages/${pageId}/revisions`
    );
    return response.data;
  }

  async restoreWikiPageRevision(pageId: string, revisionId: string): Promise<WikiPage> {
    const response = await apiClient.post<WikiPage>(
      `/fluence/wiki/pages/${pageId}/revisions/${revisionId}/restore`,
      {}
    );
    return response.data;
  }

  // ─── Wiki Spaces ────────────────────────────────────────────────────────────

  async listWikiSpaces(
    page: number = 0,
    size: number = 20,
    sortBy: string = 'updatedAt',
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<Page<WikiSpace>> {
    const response = await apiClient.get<Page<WikiSpace>>('/fluence/wiki/spaces', {
      params: { page, size, sortBy, sortDirection },
    });
    return response.data;
  }

  async getWikiSpace(id: string): Promise<WikiSpace> {
    const response = await apiClient.get<WikiSpace>(`/fluence/wiki/spaces/${id}`);
    return response.data;
  }

  async createWikiSpace(data: CreateWikiSpaceRequest): Promise<WikiSpace> {
    const response = await apiClient.post<WikiSpace>('/fluence/wiki/spaces', data);
    return response.data;
  }

  async updateWikiSpace(id: string, data: UpdateWikiSpaceRequest): Promise<WikiSpace> {
    const response = await apiClient.put<WikiSpace>(`/fluence/wiki/spaces/${id}`, data);
    return response.data;
  }

  async deleteWikiSpace(id: string): Promise<void> {
    await apiClient.delete(`/fluence/wiki/spaces/${id}`);
  }

  // ─── Blog Posts ─────────────────────────────────────────────────────────────

  async listBlogPosts(
    page: number = 0,
    size: number = 20,
    categoryId?: string,
    sortBy: string = 'publishedAt',
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<Page<BlogPost>> {
    const params: Record<string, unknown> = { page, size, sortBy, sortDirection };
    if (categoryId) {
      params.categoryId = categoryId;
    }
    const response = await apiClient.get<Page<BlogPost>>('/fluence/blog/posts', { params });
    return response.data;
  }

  async getBlogPost(id: string): Promise<BlogPost> {
    const response = await apiClient.get<BlogPost>(`/fluence/blog/posts/${id}`);
    return response.data;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost> {
    const response = await apiClient.get<BlogPost>(`/fluence/blog/posts/slug/${slug}`);
    return response.data;
  }

  async createBlogPost(data: CreateBlogPostRequest): Promise<BlogPost> {
    const response = await apiClient.post<BlogPost>('/fluence/blog/posts', data);
    return response.data;
  }

  async updateBlogPost(id: string, data: UpdateBlogPostRequest): Promise<BlogPost> {
    const response = await apiClient.put<BlogPost>(`/fluence/blog/posts/${id}`, data);
    return response.data;
  }

  async deleteBlogPost(id: string): Promise<void> {
    await apiClient.delete(`/fluence/blog/posts/${id}`);
  }

  async likeBlogPost(id: string): Promise<BlogPost> {
    const response = await apiClient.post<BlogPost>(`/fluence/blog/posts/${id}/like`, {});
    return response.data;
  }

  async unlikeBlogPost(id: string): Promise<BlogPost> {
    const response = await apiClient.post<BlogPost>(`/fluence/blog/posts/${id}/unlike`, {});
    return response.data;
  }

  // ─── Wiki Page Like ──────────────────────────────────────────────────────────

  async likeWikiPage(id: string): Promise<WikiPage> {
    const response = await apiClient.post<WikiPage>(`/fluence/wiki/pages/${id}/like`, {});
    return response.data;
  }

  async unlikeWikiPage(id: string): Promise<WikiPage> {
    const response = await apiClient.post<WikiPage>(`/fluence/wiki/pages/${id}/unlike`, {});
    return response.data;
  }

  // ─── Blog Categories ────────────────────────────────────────────────────────

  async listBlogCategories(): Promise<BlogCategory[]> {
    const response = await apiClient.get<BlogCategory[]>('/fluence/blog/categories');
    return response.data;
  }

  async getBlogCategory(id: string): Promise<BlogCategory> {
    const response = await apiClient.get<BlogCategory>(`/fluence/blog/categories/${id}`);
    return response.data;
  }

  async createBlogCategory(data: CreateBlogCategoryRequest): Promise<BlogCategory> {
    const response = await apiClient.post<BlogCategory>('/fluence/blog/categories', data);
    return response.data;
  }

  async updateBlogCategory(
    id: string,
    data: CreateBlogCategoryRequest
  ): Promise<BlogCategory> {
    const response = await apiClient.put<BlogCategory>(
      `/fluence/blog/categories/${id}`,
      data
    );
    return response.data;
  }

  async deleteBlogCategory(id: string): Promise<void> {
    await apiClient.delete(`/fluence/blog/categories/${id}`);
  }

  // ─── Templates ───────────────────────────────────────────────────────────────

  async listTemplates(
    page: number = 0,
    size: number = 20,
    categoryId?: string,
    sortBy: string = 'usageCount',
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<Page<DocumentTemplate>> {
    const params: Record<string, unknown> = { page, size, sortBy, sortDirection };
    if (categoryId) {
      params.categoryId = categoryId;
    }
    const response = await apiClient.get<Page<DocumentTemplate>>('/fluence/templates', {
      params,
    });
    return response.data;
  }

  async getTemplate(id: string): Promise<DocumentTemplate> {
    const response = await apiClient.get<DocumentTemplate>(`/fluence/templates/${id}`);
    return response.data;
  }

  async createTemplate(data: CreateTemplateRequest): Promise<DocumentTemplate> {
    const response = await apiClient.post<DocumentTemplate>('/fluence/templates', data);
    return response.data;
  }

  async updateTemplate(
    id: string,
    data: UpdateTemplateRequest
  ): Promise<DocumentTemplate> {
    const response = await apiClient.put<DocumentTemplate>(`/fluence/templates/${id}`, data);
    return response.data;
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/fluence/templates/${id}`);
  }

  async instantiateTemplate(data: InstantiateTemplateRequest): Promise<WikiPage> {
    const response = await apiClient.post<WikiPage>(
      '/fluence/templates/instantiate',
      data
    );
    return response.data;
  }

  // ─── Comments ────────────────────────────────────────────────────────────────

  async listComments(
    contentId: string,
    contentType: 'WIKI' | 'BLOG',
    page: number = 0,
    size: number = 20
  ): Promise<Page<FluenceComment>> {
    const response = await apiClient.get<Page<FluenceComment>>(
      `/fluence/comments/${contentType}/${contentId}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async createComment(
    contentId: string,
    contentType: 'WIKI' | 'BLOG',
    data: CreateCommentRequest
  ): Promise<FluenceComment> {
    const response = await apiClient.post<FluenceComment>(
      `/fluence/comments/${contentType}/${contentId}`,
      data
    );
    return response.data;
  }

  async updateComment(
    contentId: string,
    contentType: 'WIKI' | 'BLOG',
    commentId: string,
    data: UpdateCommentRequest
  ): Promise<FluenceComment> {
    const response = await apiClient.put<FluenceComment>(
      `/fluence/comments/${contentType}/${contentId}/${commentId}`,
      data
    );
    return response.data;
  }

  async deleteComment(
    contentId: string,
    contentType: 'WIKI' | 'BLOG',
    commentId: string
  ): Promise<void> {
    await apiClient.delete(
      `/fluence/comments/${contentType}/${contentId}/${commentId}`
    );
  }

  // ─── Search ─────────────────────────────────────────────────────────────────

  async searchFluence(
    query: string,
    type?: 'WIKI' | 'BLOG' | 'TEMPLATE',
    page: number = 0,
    size: number = 20
  ): Promise<FluenceSearchResponse> {
    const params: Record<string, unknown> = { query, page, size };
    if (type) {
      params.type = type;
    }
    const response = await apiClient.get<FluenceSearchResponse>('/fluence/search', {
      params,
    });
    return response.data;
  }

  // ─── View Tracking ────────────────────────────────────────────────────────

  async recordView(
    contentId: string,
    contentType: 'WIKI' | 'BLOG'
  ): Promise<void> {
    await apiClient.post(`/fluence/views/${contentType}/${contentId}`, {});
  }

  async getViewers(
    contentId: string,
    contentType: 'WIKI' | 'BLOG'
  ): Promise<ContentViewRecord[]> {
    const response = await apiClient.get<ContentViewRecord[]>(
      `/fluence/views/${contentType}/${contentId}`
    );
    return response.data;
  }

  // ─── Favorites ────────────────────────────────────────────────────────────

  async listFavorites(): Promise<FluenceFavorite[]> {
    const response = await apiClient.get<FluenceFavorite[]>('/fluence/favorites');
    return response.data;
  }

  async addFavorite(
    contentId: string,
    contentType: FavoriteContentType
  ): Promise<FluenceFavorite> {
    const response = await apiClient.post<FluenceFavorite>('/fluence/favorites', {
      contentId,
      contentType,
    });
    return response.data;
  }

  async removeFavorite(favoriteId: string): Promise<void> {
    await apiClient.delete(`/fluence/favorites/${favoriteId}`);
  }

  async removeFavoriteByContent(
    contentId: string,
    contentType: FavoriteContentType
  ): Promise<void> {
    await apiClient.delete(`/fluence/favorites/content/${contentType}/${contentId}`);
  }

  // ─── My Content ───────────────────────────────────────────────────────────

  async listMyWikiPages(
    page: number = 0,
    size: number = 20,
    status?: string
  ): Promise<Page<WikiPage>> {
    const params: Record<string, unknown> = { page, size };
    if (status) params.status = status;
    const response = await apiClient.get<Page<WikiPage>>(
      '/fluence/wiki/pages/my',
      { params }
    );
    return response.data;
  }

  async listMyBlogPosts(
    page: number = 0,
    size: number = 20,
    status?: string
  ): Promise<Page<BlogPost>> {
    const params: Record<string, unknown> = { page, size };
    if (status) params.status = status;
    const response = await apiClient.get<Page<BlogPost>>(
      '/fluence/blog/posts/my',
      { params }
    );
    return response.data;
  }

  // ─── Post Editors ─────────────────────────────────────────────────────────

  async updateWikiPageEditors(
    pageId: string,
    editorIds: string[]
  ): Promise<WikiPage> {
    const response = await apiClient.put<WikiPage>(
      `/fluence/wiki/pages/${pageId}/editors`,
      { editorIds }
    );
    return response.data;
  }

  async updateBlogPostEditors(
    postId: string,
    editorIds: string[]
  ): Promise<BlogPost> {
    const response = await apiClient.put<BlogPost>(
      `/fluence/blog/posts/${postId}/editors`,
      { editorIds }
    );
    return response.data;
  }
  // ─── Attachments ──────────────────────────────────────────────────────────

  async uploadAttachment(
    contentType: string,
    contentId: string,
    file: File
  ): Promise<FluenceAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<FluenceAttachment>(
      `/fluence/attachments/${contentType}/${contentId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  }

  async getAttachments(
    contentType: string,
    contentId: string
  ): Promise<FluenceAttachment[]> {
    const response = await apiClient.get<FluenceAttachment[]>(
      `/fluence/attachments/${contentType}/${contentId}`
    );
    return response.data;
  }

  async deleteAttachment(id: string): Promise<void> {
    await apiClient.delete(`/fluence/attachments/${id}`);
  }

  async getRecentAttachments(): Promise<FluenceAttachment[]> {
    const response = await apiClient.get<FluenceAttachment[]>(
      '/fluence/attachments/recent'
    );
    return response.data;
  }

  async getAttachmentDownloadUrl(id: string): Promise<string> {
    const response = await apiClient.get<{ downloadUrl: string }>(
      `/fluence/attachments/${id}/download`
    );
    return response.data.downloadUrl;
  }
}

export const fluenceService = new FluenceService();
