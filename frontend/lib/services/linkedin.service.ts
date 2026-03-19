import { apiClient } from '@/lib/api/client';
import type {
  LinkedInPost,
  CreateLinkedInPostRequest,
  UpdateLinkedInPostRequest,
} from '@/lib/types/linkedin';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// STUB: Backend endpoint not implemented — do not call.
// No LinkedInPostController exists in the backend. These methods will return 404.
// When the backend endpoint is implemented, remove this comment.
const BASE_URL = '/api/v1/linkedin-posts';

class LinkedInService {
  /**
   * Get active LinkedIn posts (only published, not archived).
   * Used by the company feed to display curated posts.
   */
  async getActiveLinkedInPosts(
    page: number = 0,
    size: number = 10
  ): Promise<PagedResponse<LinkedInPost>> {
    const response = await apiClient.get<PagedResponse<LinkedInPost>>(
      `${BASE_URL}/active`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  /**
   * Get all LinkedIn posts (including archived).
   * Used by admin panel to manage all posts.
   */
  async getAllLinkedInPosts(
    page: number = 0,
    size: number = 10
  ): Promise<PagedResponse<LinkedInPost>> {
    const response = await apiClient.get<PagedResponse<LinkedInPost>>(
      BASE_URL,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  /**
   * Create a new manually curated LinkedIn post.
   */
  async createLinkedInPost(
    data: CreateLinkedInPostRequest
  ): Promise<LinkedInPost> {
    const response = await apiClient.post<LinkedInPost>(BASE_URL, data);
    return response.data;
  }

  /**
   * Update an existing LinkedIn post.
   */
  async updateLinkedInPost(
    id: string,
    data: UpdateLinkedInPostRequest
  ): Promise<LinkedInPost> {
    const response = await apiClient.put<LinkedInPost>(
      `${BASE_URL}/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a LinkedIn post.
   */
  async deleteLinkedInPost(id: string): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${id}`);
  }
}

export const linkedinService = new LinkedInService();
