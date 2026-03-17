import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { spotlightService } from './spotlight.service';
import { apiClient } from '@/lib/api/client';

const mockedApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

// Mock types
interface Spotlight {
  id: string;
  title: string;
  imageUrl: string;
  isActive: boolean;
  displayOrder: number;
}

interface CreateSpotlightRequest {
  title: string;
  imageUrl: string;
  isActive?: boolean;
  displayOrder?: number;
}

type UpdateSpotlightRequest = Partial<CreateSpotlightRequest>;

interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

describe('spotlightService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveSpotlights', () => {
    it('should fetch active spotlights', async () => {
      const mockData: Spotlight[] = [
        {
          id: 'spotlight-1',
          title: 'Featured Product',
          imageUrl: 'https://example.com/image1.jpg',
          isActive: true,
          displayOrder: 1,
        },
        {
          id: 'spotlight-2',
          title: 'New Promotion',
          imageUrl: 'https://example.com/image2.jpg',
          isActive: true,
          displayOrder: 2,
        },
      ];

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await spotlightService.getActiveSpotlights();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/spotlights/active');
      expect(result).toEqual(mockData);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no active spotlights', async () => {
      const mockData: Spotlight[] = [];

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await spotlightService.getActiveSpotlights();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      mockedApiClient.get.mockRejectedValue(error);

      await expect(spotlightService.getActiveSpotlights()).rejects.toThrow('Network error');
    });
  });

  describe('getAllSpotlights', () => {
    it('should fetch all spotlights with default pagination', async () => {
      const mockData: PagedResponse<Spotlight> = {
        content: [
          {
            id: 'spotlight-1',
            title: 'First Spotlight',
            imageUrl: 'https://example.com/image1.jpg',
            isActive: true,
            displayOrder: 1,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await spotlightService.getAllSpotlights();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/spotlights', {
        params: { page: 0, size: 10 },
      });
      expect(result).toEqual(mockData);
      expect(result.content).toHaveLength(1);
    });

    it('should fetch spotlights with custom pagination', async () => {
      const mockData: PagedResponse<Spotlight> = {
        content: [
          {
            id: 'spotlight-5',
            title: 'Paginated Spotlight',
            imageUrl: 'https://example.com/image5.jpg',
            isActive: false,
            displayOrder: 5,
          },
        ],
        totalElements: 50,
        totalPages: 5,
        size: 10,
        number: 1,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await spotlightService.getAllSpotlights(1, 10);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/spotlights', {
        params: { page: 1, size: 10 },
      });
      expect(result.content).toHaveLength(1);
      expect(result.totalElements).toBe(50);
    });

    it('should fetch with large page size', async () => {
      const mockData: PagedResponse<Spotlight> = {
        content: Array.from({ length: 50 }, (_, i) => ({
          id: `spotlight-${i}`,
          title: `Spotlight ${i}`,
          imageUrl: `https://example.com/image${i}.jpg`,
          isActive: i % 2 === 0,
          displayOrder: i,
        })),
        totalElements: 50,
        totalPages: 1,
        size: 50,
        number: 0,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await spotlightService.getAllSpotlights(0, 50);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/spotlights', {
        params: { page: 0, size: 50 },
      });
      expect(result.content).toHaveLength(50);
    });

    it('should handle empty result set', async () => {
      const mockData: PagedResponse<Spotlight> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await spotlightService.getAllSpotlights();

      expect(result.content).toHaveLength(0);
      expect(result.totalElements).toBe(0);
    });
  });

  describe('createSpotlight', () => {
    it('should create a spotlight with minimal data', async () => {
      const createData: CreateSpotlightRequest = {
        title: 'New Spotlight',
        imageUrl: 'https://example.com/new.jpg',
      };

      const mockResponse: Spotlight = {
        id: 'spotlight-new-1',
        title: 'New Spotlight',
        imageUrl: 'https://example.com/new.jpg',
        isActive: false,
        displayOrder: 0,
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await spotlightService.createSpotlight(createData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/spotlights', createData);
      expect(result).toEqual(mockResponse);
      expect(result.id).toBe('spotlight-new-1');
    });

    it('should create a spotlight with all optional fields', async () => {
      const createData: CreateSpotlightRequest = {
        title: 'Complete Spotlight',
        imageUrl: 'https://example.com/complete.jpg',
        isActive: true,
        displayOrder: 5,
      };

      const mockResponse: Spotlight = {
        id: 'spotlight-complete-1',
        title: 'Complete Spotlight',
        imageUrl: 'https://example.com/complete.jpg',
        isActive: true,
        displayOrder: 5,
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await spotlightService.createSpotlight(createData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/spotlights', createData);
      expect(result.isActive).toBe(true);
      expect(result.displayOrder).toBe(5);
    });

    it('should handle creation errors', async () => {
      const createData: CreateSpotlightRequest = {
        title: 'Failed Spotlight',
        imageUrl: 'https://example.com/failed.jpg',
      };

      const error = new Error('Creation failed');
      mockedApiClient.post.mockRejectedValue(error);

      await expect(spotlightService.createSpotlight(createData)).rejects.toThrow('Creation failed');
    });
  });

  describe('updateSpotlight', () => {
    it('should update spotlight with partial data', async () => {
      const spotlightId = 'spotlight-1';
      const updateData: UpdateSpotlightRequest = {
        title: 'Updated Title',
      };

      const mockResponse: Spotlight = {
        id: spotlightId,
        title: 'Updated Title',
        imageUrl: 'https://example.com/image1.jpg',
        isActive: true,
        displayOrder: 1,
      };

      mockedApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await spotlightService.updateSpotlight(spotlightId, updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith(
        `/api/spotlights/${spotlightId}`,
        updateData
      );
      expect(result.title).toBe('Updated Title');
    });

    it('should update spotlight active status', async () => {
      const spotlightId = 'spotlight-2';
      const updateData: UpdateSpotlightRequest = {
        isActive: false,
      };

      const mockResponse: Spotlight = {
        id: spotlightId,
        title: 'Deactivated Spotlight',
        imageUrl: 'https://example.com/image2.jpg',
        isActive: false,
        displayOrder: 2,
      };

      mockedApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await spotlightService.updateSpotlight(spotlightId, updateData);

      expect(result.isActive).toBe(false);
    });

    it('should update spotlight display order', async () => {
      const spotlightId = 'spotlight-3';
      const updateData: UpdateSpotlightRequest = {
        displayOrder: 10,
      };

      const mockResponse: Spotlight = {
        id: spotlightId,
        title: 'Reordered Spotlight',
        imageUrl: 'https://example.com/image3.jpg',
        isActive: true,
        displayOrder: 10,
      };

      mockedApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await spotlightService.updateSpotlight(spotlightId, updateData);

      expect(result.displayOrder).toBe(10);
    });

    it('should update spotlight with all fields', async () => {
      const spotlightId = 'spotlight-4';
      const updateData: UpdateSpotlightRequest = {
        title: 'Fully Updated',
        imageUrl: 'https://example.com/new-image.jpg',
        isActive: true,
        displayOrder: 3,
      };

      const mockResponse: Spotlight = {
        id: spotlightId,
        title: 'Fully Updated',
        imageUrl: 'https://example.com/new-image.jpg',
        isActive: true,
        displayOrder: 3,
      };

      mockedApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await spotlightService.updateSpotlight(spotlightId, updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith(
        `/api/spotlights/${spotlightId}`,
        updateData
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockedApiClient.put.mockRejectedValue(error);

      await expect(
        spotlightService.updateSpotlight('spotlight-1', { title: 'New Title' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteSpotlight', () => {
    it('should delete a spotlight', async () => {
      const spotlightId = 'spotlight-1';

      mockedApiClient.delete.mockResolvedValue({});

      await spotlightService.deleteSpotlight(spotlightId);

      expect(mockedApiClient.delete).toHaveBeenCalledWith(`/api/spotlights/${spotlightId}`);
    });

    it('should handle delete errors', async () => {
      const spotlightId = 'spotlight-1';
      const error = new Error('Delete failed');

      mockedApiClient.delete.mockRejectedValue(error);

      await expect(spotlightService.deleteSpotlight(spotlightId)).rejects.toThrow('Delete failed');
    });

    it('should handle non-existent spotlight deletion', async () => {
      const spotlightId = 'non-existent';
      const error = new Error('Not found');

      mockedApiClient.delete.mockRejectedValue(error);

      await expect(spotlightService.deleteSpotlight(spotlightId)).rejects.toThrow('Not found');
    });
  });
});
