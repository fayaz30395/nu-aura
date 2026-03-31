/**
 * Unit Tests for OKR Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { okrService } from './okr.service';
import type { Objective, KeyResult, ObjectiveRequest, KeyResultRequest, CheckInRequest, OkrSummary } from './okr.service';
import { apiClient } from '@/lib/api/client';

const mock = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const makeObjective = (overrides: Partial<Objective> = {}): Objective => ({
  id: 'obj-1', tenantId: 't-1', ownerId: 'e-1', title: 'Increase Revenue',
  objectiveLevel: 'COMPANY', status: 'ACTIVE', startDate: '2024-01-01', endDate: '2024-12-31',
  progressPercentage: 30, weight: 1, isStretchGoal: false, createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const makeKR = (): KeyResult => ({
  id: 'kr-1', tenantId: 't-1', objectiveId: 'obj-1', ownerId: 'e-1',
  title: 'Revenue 10M', measurementType: 'CURRENCY', startValue: 0, currentValue: 3000000,
  targetValue: 10000000, status: 'IN_PROGRESS', progressPercentage: 30, weight: 1, createdAt: '2024-01-01T00:00:00Z',
});

const makeObjectiveRequest = (): ObjectiveRequest => ({
  title: 'Increase Revenue', startDate: '2024-01-01', endDate: '2024-12-31',
});

describe('OkrService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('createObjective', () => {
    it('should create an objective', async () => {
      const obj = makeObjective();
      mock.post.mockResolvedValueOnce({ data: obj });
      const result = await okrService.createObjective(makeObjectiveRequest());
      expect(result).toEqual(obj);
      expect(mock.post).toHaveBeenCalledWith('/okr/objectives', expect.any(Object));
    });

    it('should throw on validation error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Validation error'));
      await expect(okrService.createObjective(makeObjectiveRequest())).rejects.toThrow();
    });
  });

  describe('updateObjective', () => {
    it('should update an objective', async () => {
      const obj = makeObjective({ title: 'Updated' });
      mock.put.mockResolvedValueOnce({ data: obj });
      const result = await okrService.updateObjective('obj-1', makeObjectiveRequest());
      expect(result).toEqual(obj);
      expect(mock.put).toHaveBeenCalledWith('/okr/objectives/obj-1', expect.any(Object));
    });

    it('should throw on 404', async () => {
      mock.put.mockRejectedValueOnce(new Error('Not Found'));
      await expect(okrService.updateObjective('bad', makeObjectiveRequest())).rejects.toThrow();
    });
  });

  describe('getObjective', () => {
    it('should fetch an objective', async () => {
      const obj = makeObjective();
      mock.get.mockResolvedValueOnce({ data: obj });
      const result = await okrService.getObjective('obj-1');
      expect(result).toEqual(obj);
      expect(mock.get).toHaveBeenCalledWith('/okr/objectives/obj-1');
    });

    it('should throw on 404', async () => {
      mock.get.mockRejectedValueOnce(new Error('Not Found'));
      await expect(okrService.getObjective('bad')).rejects.toThrow();
    });
  });

  describe('getMyObjectives', () => {
    it('should return my objectives', async () => {
      mock.get.mockResolvedValueOnce({ data: [makeObjective()] });
      const result = await okrService.getMyObjectives();
      expect(result).toHaveLength(1);
      expect(mock.get).toHaveBeenCalledWith('/okr/objectives/my');
    });

    it('should return empty array when no objectives', async () => {
      mock.get.mockResolvedValueOnce({ data: [] });
      const result = await okrService.getMyObjectives();
      expect(result).toHaveLength(0);
    });
  });

  describe('getCompanyObjectives', () => {
    it('should return company objectives', async () => {
      mock.get.mockResolvedValueOnce({ data: [makeObjective({ objectiveLevel: 'COMPANY' })] });
      const result = await okrService.getCompanyObjectives();
      expect(result).toHaveLength(1);
      expect(mock.get).toHaveBeenCalledWith('/okr/company/objectives');
    });

    it('should throw on error', async () => {
      mock.get.mockRejectedValueOnce(new Error('Server error'));
      await expect(okrService.getCompanyObjectives()).rejects.toThrow();
    });
  });

  describe('approveObjective', () => {
    it('should approve an objective', async () => {
      const obj = makeObjective({ status: 'ACTIVE' });
      mock.post.mockResolvedValueOnce({ data: obj });
      const result = await okrService.approveObjective('obj-1');
      expect(result).toEqual(obj);
      expect(mock.post).toHaveBeenCalledWith('/okr/objectives/obj-1/approve');
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Forbidden'));
      await expect(okrService.approveObjective('obj-1')).rejects.toThrow();
    });
  });

  describe('updateObjectiveStatus', () => {
    it('should update objective status', async () => {
      const obj = makeObjective({ status: 'ON_TRACK' });
      mock.put.mockResolvedValueOnce({ data: obj });
      const result = await okrService.updateObjectiveStatus('obj-1', 'ON_TRACK');
      expect(result).toEqual(obj);
      expect(mock.put).toHaveBeenCalledWith('/okr/objectives/obj-1/status', null, { params: { status: 'ON_TRACK' } });
    });

    it('should throw on error', async () => {
      mock.put.mockRejectedValueOnce(new Error('Bad Request'));
      await expect(okrService.updateObjectiveStatus('obj-1', 'INVALID')).rejects.toThrow();
    });
  });

  describe('deleteObjective', () => {
    it('should delete an objective', async () => {
      mock.delete.mockResolvedValueOnce({ data: undefined });
      await okrService.deleteObjective('obj-1');
      expect(mock.delete).toHaveBeenCalledWith('/okr/objectives/obj-1');
    });

    it('should throw on error', async () => {
      mock.delete.mockRejectedValueOnce(new Error('Not Found'));
      await expect(okrService.deleteObjective('bad')).rejects.toThrow();
    });
  });

  describe('addKeyResult', () => {
    it('should add a key result to objective', async () => {
      const kr = makeKR();
      mock.post.mockResolvedValueOnce({ data: kr });
      const krReq: KeyResultRequest = { title: 'Revenue 10M', targetValue: 10000000 };
      const result = await okrService.addKeyResult('obj-1', krReq);
      expect(result).toEqual(kr);
      expect(mock.post).toHaveBeenCalledWith('/okr/objectives/obj-1/key-results', krReq);
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Validation error'));
      await expect(okrService.addKeyResult('obj-1', { title: '', targetValue: 0 })).rejects.toThrow();
    });
  });

  describe('updateKeyResultProgress', () => {
    it('should update key result progress', async () => {
      const kr = makeKR();
      mock.put.mockResolvedValueOnce({ data: kr });
      const result = await okrService.updateKeyResultProgress('kr-1', 5000000);
      expect(result).toEqual(kr);
      expect(mock.put).toHaveBeenCalledWith('/okr/key-results/kr-1/progress', null, { params: { value: 5000000 } });
    });

    it('should throw on error', async () => {
      mock.put.mockRejectedValueOnce(new Error('Not Found'));
      await expect(okrService.updateKeyResultProgress('bad', 100)).rejects.toThrow();
    });
  });

  describe('deleteKeyResult', () => {
    it('should delete a key result', async () => {
      mock.delete.mockResolvedValueOnce({ data: undefined });
      await okrService.deleteKeyResult('kr-1');
      expect(mock.delete).toHaveBeenCalledWith('/okr/key-results/kr-1');
    });

    it('should throw on error', async () => {
      mock.delete.mockRejectedValueOnce(new Error('Not Found'));
      await expect(okrService.deleteKeyResult('bad')).rejects.toThrow();
    });
  });

  describe('createCheckIn', () => {
    it('should create a check-in', async () => {
      mock.post.mockResolvedValueOnce({ data: undefined });
      const checkIn: CheckInRequest = { keyResultId: 'kr-1', newValue: 5000000, notes: 'On track' };
      await okrService.createCheckIn(checkIn);
      expect(mock.post).toHaveBeenCalledWith('/okr/check-ins', checkIn);
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Server error'));
      await expect(okrService.createCheckIn({ keyResultId: 'kr-1' })).rejects.toThrow();
    });
  });

  describe('getDashboardSummary', () => {
    it('should return OKR summary', async () => {
      const summary: OkrSummary = {
        totalObjectives: 10, activeObjectives: 7, completedObjectives: 2,
        draftObjectives: 1, averageProgress: 45, totalKeyResults: 30,
        completedKeyResults: 5, companyProgress: 40, companyObjectivesCount: 3,
      };
      mock.get.mockResolvedValueOnce({ data: summary });
      const result = await okrService.getDashboardSummary();
      expect(result).toEqual(summary);
      expect(mock.get).toHaveBeenCalledWith('/okr/dashboard/summary');
    });

    it('should throw on error', async () => {
      mock.get.mockRejectedValueOnce(new Error('Server error'));
      await expect(okrService.getDashboardSummary()).rejects.toThrow();
    });
  });
});
