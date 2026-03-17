/**
 * Unit Tests for Recognition Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

import { recognitionService } from './recognition.service';
import { apiClient } from '@/lib/api/client';

const mock = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const BASE = '/api/v1/recognition';

interface Recognition { id: string; giverId: string; receiverId: string; message: string; }
interface EmployeePoints { employeeId: string; points: number; level: string; }
type ReactionType = 'LIKE' | 'LOVE' | 'CELEBRATE' | 'SUPPORT';

const makeRecognition = (): Recognition => ({ id: 'r-1', giverId: 'e-1', receiverId: 'e-2', message: 'Great job!' });
const makePoints = (): EmployeePoints => ({ employeeId: 'e-1', points: 150, level: 'SILVER' });
const makePage = (items: Recognition[]) => ({ content: items, totalElements: items.length, totalPages: 1, size: 20, number: 0 });

describe('RecognitionService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('giveRecognition', () => {
    it('should create recognition', async () => {
      const rec = makeRecognition();
      mock.post.mockResolvedValueOnce({ data: rec });
      const result = await recognitionService.giveRecognition({ giverId: 'e-1', receiverId: 'e-2', message: 'Great job!' } as Parameters<typeof recognitionService.giveRecognition>[0]);
      expect(result).toEqual(rec);
      expect(mock.post).toHaveBeenCalledWith(BASE, expect.any(Object));
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Validation error'));
      await expect(recognitionService.giveRecognition({} as Parameters<typeof recognitionService.giveRecognition>[0])).rejects.toThrow();
    });
  });

  describe('getRecognitionById', () => {
    it('should fetch recognition by ID', async () => {
      const rec = makeRecognition();
      mock.get.mockResolvedValueOnce({ data: rec });
      const result = await recognitionService.getRecognitionById('r-1');
      expect(result).toEqual(rec);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/r-1`);
    });

    it('should throw on 404', async () => {
      mock.get.mockRejectedValueOnce(new Error('Not Found'));
      await expect(recognitionService.getRecognitionById('bad')).rejects.toThrow('Not Found');
    });
  });

  describe('getPublicFeed', () => {
    it('should return feed with default pagination', async () => {
      const page = makePage([makeRecognition()]);
      mock.get.mockResolvedValueOnce({ data: page });
      const result = await recognitionService.getPublicFeed();
      expect(result).toEqual(page);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/feed?page=0&size=20`);
    });

    it('should support custom pagination', async () => {
      mock.get.mockResolvedValueOnce({ data: makePage([]) });
      await recognitionService.getPublicFeed(2, 5);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/feed?page=2&size=5`);
    });
  });

  describe('getMyReceivedRecognitions', () => {
    it('should return received recognitions', async () => {
      const page = makePage([makeRecognition()]);
      mock.get.mockResolvedValueOnce({ data: page });
      const result = await recognitionService.getMyReceivedRecognitions();
      expect(result).toEqual(page);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/received?page=0&size=20`);
    });

    it('should throw on error', async () => {
      mock.get.mockRejectedValueOnce(new Error('Network error'));
      await expect(recognitionService.getMyReceivedRecognitions()).rejects.toThrow();
    });
  });

  describe('getMyGivenRecognitions', () => {
    it('should return given recognitions', async () => {
      mock.get.mockResolvedValueOnce({ data: makePage([]) });
      await recognitionService.getMyGivenRecognitions();
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/given?page=0&size=20`);
    });

    it('should throw on error', async () => {
      mock.get.mockRejectedValueOnce(new Error('Server error'));
      await expect(recognitionService.getMyGivenRecognitions()).rejects.toThrow();
    });
  });

  describe('addReaction', () => {
    it('should add reaction', async () => {
      mock.post.mockResolvedValueOnce({ data: undefined });
      await recognitionService.addReaction('r-1', 'LIKE' as ReactionType);
      expect(mock.post).toHaveBeenCalledWith(`${BASE}/r-1/react?reactionType=LIKE`);
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Conflict'));
      await expect(recognitionService.addReaction('r-1', 'LOVE' as ReactionType)).rejects.toThrow();
    });
  });

  describe('removeReaction', () => {
    it('should remove reaction', async () => {
      mock.delete.mockResolvedValueOnce({ data: undefined });
      await recognitionService.removeReaction('r-1', 'LIKE' as ReactionType);
      expect(mock.delete).toHaveBeenCalledWith(`${BASE}/r-1/react?reactionType=LIKE`);
    });

    it('should throw on error', async () => {
      mock.delete.mockRejectedValueOnce(new Error('Not Found'));
      await expect(recognitionService.removeReaction('r-1', 'LIKE' as ReactionType)).rejects.toThrow();
    });
  });

  describe('getActiveBadges', () => {
    it('should return active badges', async () => {
      const badges = [{ id: 'b-1', name: 'Star', imageUrl: 'url' }];
      mock.get.mockResolvedValueOnce({ data: badges });
      const result = await recognitionService.getActiveBadges();
      expect(result).toEqual(badges);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/badges`);
    });

    it('should throw on error', async () => {
      mock.get.mockRejectedValueOnce(new Error('Server error'));
      await expect(recognitionService.getActiveBadges()).rejects.toThrow();
    });
  });

  describe('getMyPoints', () => {
    it('should return my points', async () => {
      const pts = makePoints();
      mock.get.mockResolvedValueOnce({ data: pts });
      const result = await recognitionService.getMyPoints();
      expect(result).toEqual(pts);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/points`);
    });

    it('should throw on error', async () => {
      mock.get.mockRejectedValueOnce(new Error('Server error'));
      await expect(recognitionService.getMyPoints()).rejects.toThrow();
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard with default limit', async () => {
      mock.get.mockResolvedValueOnce({ data: [makePoints()] });
      await recognitionService.getLeaderboard();
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/leaderboard?limit=10`);
    });

    it('should support custom limit', async () => {
      mock.get.mockResolvedValueOnce({ data: [] });
      await recognitionService.getLeaderboard(5);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/leaderboard?limit=5`);
    });
  });

  describe('getDashboard', () => {
    it('should return engagement dashboard', async () => {
      const dash = { totalGiven: 50, totalReceived: 40, topRecognizers: [] };
      mock.get.mockResolvedValueOnce({ data: dash });
      const result = await recognitionService.getDashboard();
      expect(result).toEqual(dash);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/dashboard`);
    });

    it('should throw on error', async () => {
      mock.get.mockRejectedValueOnce(new Error('Server error'));
      await expect(recognitionService.getDashboard()).rejects.toThrow();
    });
  });

  describe('getUpcomingMilestones', () => {
    it('should return milestones with default days', async () => {
      mock.get.mockResolvedValueOnce({ data: [] });
      await recognitionService.getUpcomingMilestones();
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/milestones/upcoming?days=7`);
    });

    it('should support custom days', async () => {
      mock.get.mockResolvedValueOnce({ data: [] });
      await recognitionService.getUpcomingMilestones(30);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/milestones/upcoming?days=30`);
    });
  });
});
