import {apiClient} from '@/lib/api/client';
// LinkedIn service - uses /api/v1/linkedin-posts endpoints for stub implementation
import type {
  LinkedInPost,
  CreateLinkedInPostRequest,
  UpdateLinkedInPostRequest,
} from '@/lib/types/platform/linkedin';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const BASE_URL = '/linkedin-posts';

class LinkedInService {
  /**
   * Get active LinkedIn posts (only published, not archived).
   * Used by the company feed to display curated posts.
   * Returns empty list if backend endpoint is unavailable.
   */
  async getActiveLinkedInPosts(
    page: number = 0,
    size: number = 10
  ): Promise<PagedResponse<LinkedInPost>> {
    const empty: PagedResponse<LinkedInPost> = {content: [], totalElements: 0, totalPages: 0, size, number: page};
    try {
      const response = await apiClient.getPermissive<PagedResponse<LinkedInPost>>(
        `${BASE_URL}/active`,
        {params: {page, size}}
      );
      return response.status === 403 ? empty : response.data;
    } catch {
      return empty;
    }
  }

  /**
   * Get all LinkedIn posts (including archived).
   * Used by admin panel to manage all posts.
   * Returns empty list if backend endpoint is unavailable.
   */
  async getAllLinkedInPosts(
    page: number = 0,
    size: number = 10
  ): Promise<PagedResponse<LinkedInPost>> {
    try {
      const response = await apiClient.get<PagedResponse<LinkedInPost>>(
        BASE_URL,
        {
          params: {page, size},
        }
      );
      return response.data;
    } catch (error) {
      console.error('[LinkedInService] getAllLinkedInPosts failed:', error);
      throw error;
    }
  }

  /**
   * Create a new manually curated LinkedIn post.
   */
  async createLinkedInPost(
    data: CreateLinkedInPostRequest
  ): Promise<LinkedInPost> {
    try {
      const response = await apiClient.post<LinkedInPost>(BASE_URL, data);
      return response.data;
    } catch (error) {
      console.error('[LinkedInService] createLinkedInPost failed:', error);
      throw error;
    }
  }

  /**
   * Update an existing LinkedIn post.
   */
  async updateLinkedInPost(
    id: string,
    data: UpdateLinkedInPostRequest
  ): Promise<LinkedInPost> {
    try {
      const response = await apiClient.put<LinkedInPost>(
        `${BASE_URL}/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('[LinkedInService] updateLinkedInPost failed:', error);
      throw error;
    }
  }

  /**
   * Delete a LinkedIn post.
   */
  async deleteLinkedInPost(id: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE_URL}/${id}`);
    } catch (error) {
      console.error('[LinkedInService] deleteLinkedInPost failed:', error);
      throw error;
    }
  }
}

export const linkedinService = new LinkedInService();
