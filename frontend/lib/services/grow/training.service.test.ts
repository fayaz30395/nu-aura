/**
 * Unit Tests for Training Service
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {trainingService} from './training.service';
import {apiClient} from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()},
}));

const mock = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const BASE = '/training';

interface TrainingProgram {
  id: string;
  title: string;
  status: string;
}

interface TrainingEnrollment {
  id: string;
  programId: string;
  employeeId: string;
  status: string;
}

const makeProg = (): TrainingProgram => ({id: 'tp-1', title: 'Leadership 101', status: 'ACTIVE'});
const makeEnroll = (): TrainingEnrollment => ({id: 'te-1', programId: 'tp-1', employeeId: 'e-1', status: 'ENROLLED'});

describe('TrainingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProgram', () => {
    it('should create a training program', async () => {
      mock.post.mockResolvedValueOnce({data: makeProg()});
      const result = await trainingService.createProgram({title: 'Leadership 101'} as Parameters<typeof trainingService.createProgram>[0]);
      expect(result).toEqual(makeProg());
      expect(mock.post).toHaveBeenCalledWith(`${BASE}/programs`, expect.any(Object));
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Validation error'));
      await expect(trainingService.createProgram({title: ''} as Parameters<typeof trainingService.createProgram>[0])).rejects.toThrow();
    });
  });

  describe('updateProgram', () => {
    it('should update a training program', async () => {
      mock.put.mockResolvedValueOnce({data: {...makeProg(), title: 'Updated'}});
      const result = await trainingService.updateProgram('tp-1', {title: 'Updated'} as Parameters<typeof trainingService.updateProgram>[1]);
      expect(result.title).toBe('Updated');
      expect(mock.put).toHaveBeenCalledWith(`${BASE}/programs/tp-1`, expect.any(Object));
    });

    it('should throw on 404', async () => {
      mock.put.mockRejectedValueOnce(new Error('Not Found'));
      await expect(trainingService.updateProgram('bad', {} as Parameters<typeof trainingService.updateProgram>[1])).rejects.toThrow();
    });
  });

  describe('getProgramById', () => {
    it('should return a program by ID', async () => {
      mock.get.mockResolvedValueOnce({data: makeProg()});
      const result = await trainingService.getProgramById('tp-1');
      expect(result).toEqual(makeProg());
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/programs/tp-1`);
    });

    it('should throw on 404', async () => {
      mock.get.mockRejectedValueOnce(new Error('Not Found'));
      await expect(trainingService.getProgramById('bad')).rejects.toThrow();
    });
  });

  describe('getAllPrograms', () => {
    it('should return paginated programs', async () => {
      const page = {content: [makeProg()], totalElements: 1, totalPages: 1, size: 20, number: 0};
      mock.get.mockResolvedValueOnce({data: page});
      await trainingService.getAllPrograms();
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/programs?page=0&size=20`);
    });

    it('should support custom pagination', async () => {
      mock.get.mockResolvedValueOnce({data: {content: [], totalElements: 0, totalPages: 0, size: 5, number: 1}});
      await trainingService.getAllPrograms(1, 5);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/programs?page=1&size=5`);
    });
  });

  describe('getProgramsByStatus', () => {
    it('should return programs by status', async () => {
      mock.get.mockResolvedValueOnce({data: [makeProg()]});
      const result = await trainingService.getProgramsByStatus('ACTIVE' as Parameters<typeof trainingService.getProgramsByStatus>[0]);
      expect(result).toHaveLength(1);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/programs/status/ACTIVE`);
    });

    it('should return empty array when no results', async () => {
      mock.get.mockResolvedValueOnce({data: []});
      const result = await trainingService.getProgramsByStatus('CANCELLED' as Parameters<typeof trainingService.getProgramsByStatus>[0]);
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteProgram', () => {
    it('should delete a program', async () => {
      mock.delete.mockResolvedValueOnce({data: undefined});
      await trainingService.deleteProgram('tp-1');
      expect(mock.delete).toHaveBeenCalledWith(`${BASE}/programs/tp-1`);
    });

    it('should throw on error', async () => {
      mock.delete.mockRejectedValueOnce(new Error('Not Found'));
      await expect(trainingService.deleteProgram('bad')).rejects.toThrow();
    });
  });

  describe('enrollEmployee', () => {
    it('should enroll an employee', async () => {
      mock.post.mockResolvedValueOnce({data: makeEnroll()});
      const result = await trainingService.enrollEmployee({
        programId: 'tp-1',
        employeeId: 'e-1'
      } as Parameters<typeof trainingService.enrollEmployee>[0]);
      expect(result).toEqual(makeEnroll());
      expect(mock.post).toHaveBeenCalledWith(`${BASE}/enrollments`, expect.any(Object));
    });

    it('should throw on conflict', async () => {
      mock.post.mockRejectedValueOnce(new Error('Already enrolled'));
      await expect(trainingService.enrollEmployee({
        programId: 'tp-1',
        employeeId: 'e-1'
      } as Parameters<typeof trainingService.enrollEmployee>[0])).rejects.toThrow();
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should update enrollment status', async () => {
      mock.patch.mockResolvedValueOnce({data: {...makeEnroll(), status: 'COMPLETED'}});
      const result = await trainingService.updateEnrollmentStatus('te-1', 'COMPLETED' as Parameters<typeof trainingService.updateEnrollmentStatus>[1]);
      expect(result.status).toBe('COMPLETED');
      expect(mock.patch).toHaveBeenCalledWith(`${BASE}/enrollments/te-1/status?status=COMPLETED`);
    });

    it('should throw on error', async () => {
      mock.patch.mockRejectedValueOnce(new Error('Not Found'));
      await expect(trainingService.updateEnrollmentStatus('bad', 'COMPLETED' as Parameters<typeof trainingService.updateEnrollmentStatus>[1])).rejects.toThrow();
    });
  });

  describe('getEnrollmentsByProgram', () => {
    it('should return enrollments for a program', async () => {
      mock.get.mockResolvedValueOnce({data: [makeEnroll()]});
      const result = await trainingService.getEnrollmentsByProgram('tp-1');
      expect(result).toHaveLength(1);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/enrollments/program/tp-1`);
    });

    it('should return empty array when no enrollments', async () => {
      mock.get.mockResolvedValueOnce({data: []});
      const result = await trainingService.getEnrollmentsByProgram('tp-1');
      expect(result).toHaveLength(0);
    });
  });

  describe('getEnrollmentsByEmployee', () => {
    it('should return enrollments for an employee', async () => {
      mock.get.mockResolvedValueOnce({data: [makeEnroll()]});
      const result = await trainingService.getEnrollmentsByEmployee('e-1');
      expect(result).toHaveLength(1);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/enrollments/employee/e-1`);
    });

    it('should throw on error', async () => {
      mock.get.mockRejectedValueOnce(new Error('Not Found'));
      await expect(trainingService.getEnrollmentsByEmployee('bad')).rejects.toThrow();
    });
  });
});
