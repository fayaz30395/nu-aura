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

import { departmentService } from './department.service';
import { apiClient } from '@/lib/api/client';
import type { Department, DepartmentRequest, Page } from '@/lib/types/hrms/employee';

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('departmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllDepartments', () => {
    it('should fetch all departments with default pagination', async () => {
      const mockDepartments: Page<Department> = {
        content: [
          {
            id: '1',
            code: 'ENG',
            name: 'Engineering',
            isActive: true,
            createdAt: '2026-03-18T00:00:00Z',
            updatedAt: '2026-03-18T00:00:00Z',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockDepartments });

      const result = await departmentService.getAllDepartments();

      expect(mockApiClient.get).toHaveBeenCalledWith('/departments', {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockDepartments);
    });

    it('should fetch departments with custom pagination', async () => {
      const mockDepartments: Page<Department> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 1,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockDepartments });

      const result = await departmentService.getAllDepartments(1, 10);

      expect(mockApiClient.get).toHaveBeenCalledWith('/departments', {
        params: { page: 1, size: 10 },
      });
      expect(result).toEqual(mockDepartments);
    });

    it('should handle getAllDepartments error', async () => {
      const error = new Error('Network error');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(departmentService.getAllDepartments()).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('getActiveDepartments', () => {
    it('should fetch active departments only', async () => {
      const mockDepartments: Department[] = [
        {
          id: '1',
          code: 'ENG',
          name: 'Engineering',
          isActive: true,
          createdAt: '2026-03-18T00:00:00Z',
          updatedAt: '2026-03-18T00:00:00Z',
        },
        {
          id: '2',
          code: 'HR',
          name: 'Human Resources',
          isActive: true,
          createdAt: '2026-03-18T00:00:00Z',
          updatedAt: '2026-03-18T00:00:00Z',
        },
      ];

      mockApiClient.get.mockResolvedValueOnce({ data: mockDepartments });

      const result = await departmentService.getActiveDepartments();

      expect(mockApiClient.get).toHaveBeenCalledWith('/departments/active');
      expect(result).toEqual(mockDepartments);
      expect(result.every((d) => d.isActive === true)).toBe(true);
    });

    it('should handle getActiveDepartments error', async () => {
      const error = new Error('API error');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(departmentService.getActiveDepartments()).rejects.toThrow(
        'API error'
      );
    });
  });

  describe('getDepartmentHierarchy', () => {
    it('should fetch department hierarchy tree structure', async () => {
      const mockHierarchy: Department[] = [
        {
          id: '1',
          code: 'ROOT',
          name: 'Root Department',
          isActive: true,
          createdAt: '2026-03-18T00:00:00Z',
          updatedAt: '2026-03-18T00:00:00Z',
          subDepartments: [
            {
              id: '2',
              code: 'ENG',
              name: 'Engineering',
              parentDepartmentId: '1',
              isActive: true,
              createdAt: '2026-03-18T00:00:00Z',
              updatedAt: '2026-03-18T00:00:00Z',
            },
          ],
        },
      ];

      mockApiClient.get.mockResolvedValueOnce({ data: mockHierarchy });

      const result = await departmentService.getDepartmentHierarchy();

      expect(mockApiClient.get).toHaveBeenCalledWith('/departments/hierarchy');
      expect(result).toEqual(mockHierarchy);
      expect(result[0].subDepartments).toBeDefined();
    });

    it('should handle getDepartmentHierarchy error', async () => {
      const error = new Error('Hierarchy fetch failed');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(
        departmentService.getDepartmentHierarchy()
      ).rejects.toThrow('Hierarchy fetch failed');
    });
  });

  describe('getDepartment', () => {
    it('should fetch single department by ID', async () => {
      const mockDepartment: Department = {
        id: '1',
        code: 'ENG',
        name: 'Engineering',
        description: 'Engineering Department',
        isActive: true,
        managerId: 'mgr1',
        managerName: 'John Doe',
        employeeCount: 25,
        createdAt: '2026-03-18T00:00:00Z',
        updatedAt: '2026-03-18T00:00:00Z',
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockDepartment });

      const result = await departmentService.getDepartment('1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/departments/1');
      expect(result).toEqual(mockDepartment);
      expect(result.id).toBe('1');
    });

    it('should handle getDepartment error', async () => {
      const error = new Error('Department not found');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(departmentService.getDepartment('invalid')).rejects.toThrow(
        'Department not found'
      );
    });
  });

  describe('searchDepartments', () => {
    it('should search departments with query', async () => {
      const mockResults: Page<Department> = {
        content: [
          {
            id: '1',
            code: 'ENG',
            name: 'Engineering',
            isActive: true,
            createdAt: '2026-03-18T00:00:00Z',
            updatedAt: '2026-03-18T00:00:00Z',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockResults });

      const result = await departmentService.searchDepartments('eng');

      expect(mockApiClient.get).toHaveBeenCalledWith('/departments/search', {
        params: { query: 'eng', page: 0, size: 20 },
      });
      expect(result).toEqual(mockResults);
    });

    it('should handle searchDepartments error', async () => {
      const error = new Error('Search failed');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(
        departmentService.searchDepartments('query')
      ).rejects.toThrow('Search failed');
    });
  });

  describe('createDepartment', () => {
    it('should create new department', async () => {
      const createRequest: DepartmentRequest = {
        code: 'NEWDEPT',
        name: 'New Department',
        description: 'A new department',
        isActive: true,
      };

      const mockDepartment: Department = {
        id: 'new-id',
        ...createRequest,
        createdAt: '2026-03-18T00:00:00Z',
        updatedAt: '2026-03-18T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockDepartment });

      const result = await departmentService.createDepartment(createRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/departments',
        createRequest
      );
      expect(result).toEqual(mockDepartment);
      expect(result.id).toBe('new-id');
    });

    it('should handle createDepartment error', async () => {
      const createRequest: DepartmentRequest = {
        code: 'INVALID',
        name: 'Invalid',
      };

      const error = new Error('Invalid department data');
      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(
        departmentService.createDepartment(createRequest)
      ).rejects.toThrow('Invalid department data');
    });
  });

  describe('updateDepartment', () => {
    it('should update existing department', async () => {
      const updateRequest: DepartmentRequest = {
        code: 'ENG',
        name: 'Engineering Updated',
        description: 'Updated description',
      };

      const mockDepartment: Department = {
        id: '1',
        ...updateRequest,
        isActive: true,
        createdAt: '2026-03-18T00:00:00Z',
        updatedAt: '2026-03-18T00:00:00Z',
      };

      mockApiClient.put.mockResolvedValueOnce({ data: mockDepartment });

      const result = await departmentService.updateDepartment('1', updateRequest);

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/departments/1',
        updateRequest
      );
      expect(result).toEqual(mockDepartment);
    });

    it('should handle updateDepartment error', async () => {
      const updateRequest: DepartmentRequest = {
        code: 'ENG',
        name: 'Engineering',
      };

      const error = new Error('Update failed');
      mockApiClient.put.mockRejectedValueOnce(error);

      await expect(
        departmentService.updateDepartment('1', updateRequest)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('activateDepartment', () => {
    it('should activate department', async () => {
      const mockDepartment: Department = {
        id: '1',
        code: 'ENG',
        name: 'Engineering',
        isActive: true,
        createdAt: '2026-03-18T00:00:00Z',
        updatedAt: '2026-03-18T00:00:00Z',
      };

      mockApiClient.patch.mockResolvedValueOnce({ data: mockDepartment });

      const result = await departmentService.activateDepartment('1');

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/departments/1/activate'
      );
      expect(result.isActive).toBe(true);
    });

    it('should handle activateDepartment error', async () => {
      const error = new Error('Activation failed');
      mockApiClient.patch.mockRejectedValueOnce(error);

      await expect(departmentService.activateDepartment('1')).rejects.toThrow(
        'Activation failed'
      );
    });
  });

  describe('deactivateDepartment', () => {
    it('should deactivate department', async () => {
      const mockDepartment: Department = {
        id: '1',
        code: 'ENG',
        name: 'Engineering',
        isActive: false,
        createdAt: '2026-03-18T00:00:00Z',
        updatedAt: '2026-03-18T00:00:00Z',
      };

      mockApiClient.patch.mockResolvedValueOnce({ data: mockDepartment });

      const result = await departmentService.deactivateDepartment('1');

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/departments/1/deactivate'
      );
      expect(result.isActive).toBe(false);
    });

    it('should handle deactivateDepartment error', async () => {
      const error = new Error('Deactivation failed');
      mockApiClient.patch.mockRejectedValueOnce(error);

      await expect(
        departmentService.deactivateDepartment('1')
      ).rejects.toThrow('Deactivation failed');
    });
  });

  describe('deleteDepartment', () => {
    it('should delete department', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});

      await departmentService.deleteDepartment('1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/departments/1');
    });

    it('should handle deleteDepartment error', async () => {
      const error = new Error('Delete failed');
      mockApiClient.delete.mockRejectedValueOnce(error);

      await expect(departmentService.deleteDepartment('1')).rejects.toThrow(
        'Delete failed'
      );
    });
  });
});
