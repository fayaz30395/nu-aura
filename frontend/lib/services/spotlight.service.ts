import { apiClient } from '@/lib/api/client';
import {
  Spotlight,
  CreateSpotlightRequest,
  UpdateSpotlightRequest,
} from '@/lib/types/spotlight';

/**
 * Paged response wrapper for spotlight queries
 */
export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// STUB: Backend endpoint not implemented — do not call.
// No SpotlightController exists in the backend. These methods will return 404.
// When the backend endpoint is implemented, remove this comment and the path
// should be `/spotlights` (apiClient baseURL already includes /api/v1).
class SpotlightService {
  /**
   * Get only active spotlights, sorted by displayOrder
   */
  async getActiveSpotlights(): Promise<Spotlight[]> {
    const response = await apiClient.get<Spotlight[]>('/spotlights/active');
    return response.data;
  }

  /**
   * Get all spotlights with pagination
   */
  async getAllSpotlights(page: number = 0, size: number = 10): Promise<PagedResponse<Spotlight>> {
    const response = await apiClient.get<PagedResponse<Spotlight>>('/spotlights', {
      params: { page, size },
    });
    return response.data;
  }

  /**
   * Create a new spotlight slide
   */
  async createSpotlight(data: CreateSpotlightRequest): Promise<Spotlight> {
    const response = await apiClient.post<Spotlight>('/spotlights', data);
    return response.data;
  }

  /**
   * Update an existing spotlight slide
   */
  async updateSpotlight(id: string, data: UpdateSpotlightRequest): Promise<Spotlight> {
    const response = await apiClient.put<Spotlight>(`/spotlights/${id}`, data);
    return response.data;
  }

  /**
   * Delete a spotlight slide
   */
  async deleteSpotlight(id: string): Promise<void> {
    await apiClient.delete(`/spotlights/${id}`);
  }
}

export const spotlightService = new SpotlightService();
