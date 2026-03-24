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

import { employeeService } from './employee.service';
import { apiClient } from '@/lib/api/client';

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

// Minimal inline interfaces for testing
interface MockEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface MockPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
}

interface MockEmployeeImportPreview {
  valid: number;
  invalid: number;
  rows: unknown[];
}

interface MockEmployeeImportResult {
  totalImported: number;
  totalFailed: number;
  errors: string[];
}

interface MockTalentProfile {
  employeeId: string;
  skills: string[];
  certifications: string[];
}

describe('EmployeeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // createEmployee tests
  describe('createEmployee', () => {
    it('should create an employee and return the created employee', async () => {
      const requestData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      const mockEmployee: MockEmployee = {
        id: 'emp-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockEmployee });

      const result = await employeeService.createEmployee(requestData as any);

      expect(mockApiClient.post).toHaveBeenCalledWith('/employees', requestData);
      expect(result).toEqual(mockEmployee);
    });

    it('should handle errors when creating an employee', async () => {
      const requestData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      const error = new Error('Creation failed');

      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(employeeService.createEmployee(requestData as any)).rejects.toThrow(
        'Creation failed'
      );
      expect(mockApiClient.post).toHaveBeenCalledWith('/employees', requestData);
    });
  });

  // getEmployee tests
  describe('getEmployee', () => {
    it('should fetch an employee by ID', async () => {
      const employeeId = 'emp-1';
      const mockEmployee: MockEmployee = {
        id: employeeId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockEmployee });

      const result = await employeeService.getEmployee(employeeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/employees/${employeeId}`);
      expect(result).toEqual(mockEmployee);
    });

    it('should handle errors when fetching an employee', async () => {
      const employeeId = 'emp-1';
      const error = new Error('Employee not found');

      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(employeeService.getEmployee(employeeId)).rejects.toThrow(
        'Employee not found'
      );
      expect(mockApiClient.get).toHaveBeenCalledWith(`/employees/${employeeId}`);
    });
  });

  // getAllEmployees tests
  describe('getAllEmployees', () => {
    it('should fetch all employees with default pagination', async () => {
      const mockPage: MockPage<MockEmployee> = {
        content: [
          {
            id: 'emp-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await employeeService.getAllEmployees();

      expect(mockApiClient.get).toHaveBeenCalledWith('/employees', {
        params: { page: 0, size: 20, sortBy: 'createdAt', sortDirection: 'DESC' },
      });
      expect(result).toEqual(mockPage);
    });

    it('should fetch employees with custom pagination and sorting', async () => {
      const mockPage: MockPage<MockEmployee> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 1,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await employeeService.getAllEmployees(1, 50, 'lastName', 'ASC');

      expect(mockApiClient.get).toHaveBeenCalledWith('/employees', {
        params: { page: 1, size: 50, sortBy: 'lastName', sortDirection: 'ASC' },
      });
      expect(result).toEqual(mockPage);
    });
  });

  // searchEmployees tests
  describe('searchEmployees', () => {
    it('should search employees by query', async () => {
      const query = 'john';
      const mockPage: MockPage<MockEmployee> = {
        content: [
          {
            id: 'emp-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await employeeService.searchEmployees(query);

      expect(mockApiClient.get).toHaveBeenCalledWith('/employees/search', {
        params: { query, page: 0, size: 20 },
      });
      expect(result).toEqual(mockPage);
    });

    it('should search with custom pagination', async () => {
      const query = 'jane';
      const mockPage: MockPage<MockEmployee> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 2,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await employeeService.searchEmployees(query, 2, 30);

      expect(mockApiClient.get).toHaveBeenCalledWith('/employees/search', {
        params: { query, page: 2, size: 30 },
      });
      expect(result).toEqual(mockPage);
    });
  });

  // getEmployeeHierarchy tests
  describe('getEmployeeHierarchy', () => {
    it('should fetch employee hierarchy', async () => {
      const employeeId = 'emp-1';
      const mockEmployee: MockEmployee = {
        id: employeeId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockEmployee });

      const result = await employeeService.getEmployeeHierarchy(employeeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/employees/${employeeId}/hierarchy`);
      expect(result).toEqual(mockEmployee);
    });

    it('should handle errors when fetching hierarchy', async () => {
      const employeeId = 'emp-1';
      const error = new Error('Hierarchy not found');

      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(employeeService.getEmployeeHierarchy(employeeId)).rejects.toThrow(
        'Hierarchy not found'
      );
    });
  });

  // getSubordinates tests
  describe('getSubordinates', () => {
    it('should fetch subordinates of an employee', async () => {
      const employeeId = 'emp-1';
      const mockSubordinates: MockEmployee[] = [
        {
          id: 'emp-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      ];

      mockApiClient.get.mockResolvedValueOnce({ data: mockSubordinates });

      const result = await employeeService.getSubordinates(employeeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/employees/${employeeId}/subordinates`);
      expect(result).toEqual(mockSubordinates);
    });

    it('should return empty array when employee has no subordinates', async () => {
      const employeeId = 'emp-1';
      const mockSubordinates: MockEmployee[] = [];

      mockApiClient.get.mockResolvedValueOnce({ data: mockSubordinates });

      const result = await employeeService.getSubordinates(employeeId);

      expect(result).toEqual([]);
    });
  });

  // updateEmployee tests
  describe('updateEmployee', () => {
    it('should update an employee', async () => {
      const employeeId = 'emp-1';
      const updateData = { firstName: 'Jonathan' };
      const mockEmployee: MockEmployee = {
        id: employeeId,
        firstName: 'Jonathan',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      mockApiClient.put.mockResolvedValueOnce({ data: mockEmployee });

      const result = await employeeService.updateEmployee(employeeId, updateData as any);

      expect(mockApiClient.put).toHaveBeenCalledWith(`/employees/${employeeId}`, updateData);
      expect(result).toEqual(mockEmployee);
    });

    it('should handle errors when updating an employee', async () => {
      const employeeId = 'emp-1';
      const updateData = { firstName: 'Jonathan' };
      const error = new Error('Update failed');

      mockApiClient.put.mockRejectedValueOnce(error);

      await expect(employeeService.updateEmployee(employeeId, updateData as any)).rejects.toThrow(
        'Update failed'
      );
    });
  });

  // deleteEmployee tests
  describe('deleteEmployee', () => {
    it('should delete an employee', async () => {
      const employeeId = 'emp-1';

      mockApiClient.delete.mockResolvedValueOnce({});

      await employeeService.deleteEmployee(employeeId);

      expect(mockApiClient.delete).toHaveBeenCalledWith(`/employees/${employeeId}`);
    });

    it('should handle errors when deleting an employee', async () => {
      const employeeId = 'emp-1';
      const error = new Error('Delete failed');

      mockApiClient.delete.mockRejectedValueOnce(error);

      await expect(employeeService.deleteEmployee(employeeId)).rejects.toThrow('Delete failed');
    });
  });

  // downloadCsvTemplate tests
  describe('downloadCsvTemplate', () => {
    it('should download CSV template', async () => {
      const mockBlob = new Blob(['template,data'], { type: 'text/csv' });

      mockApiClient.get.mockResolvedValueOnce({ data: mockBlob });

      const result = await employeeService.downloadCsvTemplate();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/employees/import/template/csv',
        expect.objectContaining({ responseType: 'blob' })
      );
      expect(result).toEqual(mockBlob);
    });

    it('should handle errors when downloading CSV template', async () => {
      const error = new Error('Download failed');

      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(employeeService.downloadCsvTemplate()).rejects.toThrow('Download failed');
    });
  });

  // downloadExcelTemplate tests
  describe('downloadExcelTemplate', () => {
    it('should download Excel template', async () => {
      const mockBlob = new Blob(['template'], { type: 'application/vnd.ms-excel' });

      mockApiClient.get.mockResolvedValueOnce({ data: mockBlob });

      const result = await employeeService.downloadExcelTemplate();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/employees/import/template/xlsx',
        expect.objectContaining({ responseType: 'blob' })
      );
      expect(result).toEqual(mockBlob);
    });

    it('should handle errors when downloading Excel template', async () => {
      const error = new Error('Download failed');

      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(employeeService.downloadExcelTemplate()).rejects.toThrow('Download failed');
    });
  });

  // previewImport tests
  describe('previewImport', () => {
    it('should preview employee import', async () => {
      const mockFile = new File(['data'], 'employees.csv', { type: 'text/csv' });
      const mockPreview: MockEmployeeImportPreview = {
        valid: 10,
        invalid: 2,
        rows: [],
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockPreview });

      const result = await employeeService.previewImport(mockFile);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/employees/import/preview',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(result).toEqual(mockPreview);
    });

    it('should handle errors when previewing import', async () => {
      const mockFile = new File(['data'], 'employees.csv', { type: 'text/csv' });
      const error = new Error('Preview failed');

      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(employeeService.previewImport(mockFile)).rejects.toThrow('Preview failed');
    });
  });

  // executeImport tests
  describe('executeImport', () => {
    it('should execute employee import with default skipInvalid', async () => {
      const mockFile = new File(['data'], 'employees.csv', { type: 'text/csv' });
      const mockResult: MockEmployeeImportResult = {
        totalImported: 10,
        totalFailed: 0,
        errors: [],
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockResult });

      const result = await employeeService.executeImport(mockFile);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/employees/import/execute?skipInvalid=true',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('should execute employee import with skipInvalid=false', async () => {
      const mockFile = new File(['data'], 'employees.csv', { type: 'text/csv' });
      const mockResult: MockEmployeeImportResult = {
        totalImported: 0,
        totalFailed: 2,
        errors: ['Row 1: Missing email'],
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockResult });

      const result = await employeeService.executeImport(mockFile, false);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/employees/import/execute?skipInvalid=false',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(result).toEqual(mockResult);
    });
  });

  // getManagers tests
  describe('getManagers', () => {
    it('should fetch managers', async () => {
      const mockManagers: MockEmployee[] = [
        {
          id: 'mgr-1',
          firstName: 'Manager',
          lastName: 'One',
          email: 'manager1@example.com',
        },
      ];

      mockApiClient.get.mockResolvedValueOnce({ data: mockManagers });

      const result = await employeeService.getManagers();

      expect(mockApiClient.get).toHaveBeenCalledWith('/employees/managers');
      expect(result).toEqual(mockManagers);
    });

    it('should handle errors when fetching managers', async () => {
      const error = new Error('Managers not found');

      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(employeeService.getManagers()).rejects.toThrow('Managers not found');
    });
  });

  // getDottedLineReports tests
  describe('getDottedLineReports', () => {
    it('should fetch dotted line reports for a manager', async () => {
      const managerId = 'mgr-1';
      const mockReports: MockEmployee[] = [
        {
          id: 'emp-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      ];

      mockApiClient.get.mockResolvedValueOnce({ data: mockReports });

      const result = await employeeService.getDottedLineReports(managerId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/employees/${managerId}/dotted-reports`);
      expect(result).toEqual(mockReports);
    });

    it('should return empty array when no dotted line reports exist', async () => {
      const managerId = 'mgr-1';
      const mockReports: MockEmployee[] = [];

      mockApiClient.get.mockResolvedValueOnce({ data: mockReports });

      const result = await employeeService.getDottedLineReports(managerId);

      expect(result).toEqual([]);
    });
  });

  // getTalentProfile tests
  describe('getTalentProfile', () => {
    it('should fetch talent profile for an employee', async () => {
      const employeeId = 'emp-1';
      const mockTalentProfile: MockTalentProfile = {
        employeeId,
        skills: ['JavaScript', 'TypeScript'],
        certifications: ['AWS', 'Kubernetes'],
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockTalentProfile });

      const result = await employeeService.getTalentProfile(employeeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/employees/${employeeId}/talent-profile`
      );
      expect(result).toEqual(mockTalentProfile);
    });

    it('should handle errors when fetching talent profile', async () => {
      const employeeId = 'emp-1';
      const error = new Error('Talent profile not found');

      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(employeeService.getTalentProfile(employeeId)).rejects.toThrow(
        'Talent profile not found'
      );
    });
  });
});
