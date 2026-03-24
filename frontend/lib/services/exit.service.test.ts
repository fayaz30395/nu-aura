/**
 * Unit Tests for Exit Service
 * Run with: npx vitest run lib/services/exit.service.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { exitService } from './exit.service';
import { apiClient } from '@/lib/api/client';

// Minimal inline mock types
interface MockExitProcess {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  exitType: string;
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays?: number;
  noticePeriodServed?: number;
  buyoutAmount?: number;
  reasonForLeaving?: string;
  newCompany?: string;
  newDesignation?: string;
  status: string;
  rehireEligible?: boolean;
  exitInterviewScheduled?: boolean;
  exitInterviewDate?: string;
  exitInterviewFeedback?: string;
  finalSettlementAmount?: number;
  settlementDate?: string;
  managerId?: string;
  managerName?: string;
  hrSpocId?: string;
  hrSpocName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface MockCreateExitProcessRequest {
  employeeId: string;
  exitType: string;
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays?: number;
  noticePeriodServed?: number;
  buyoutAmount?: number;
  reasonForLeaving?: string;
  newCompany?: string;
  newDesignation?: string;
  status?: string;
  rehireEligible?: boolean;
  exitInterviewScheduled?: boolean;
  exitInterviewDate?: string;
  managerId?: string;
  hrSpocId?: string;
  notes?: string;
}

interface MockUpdateExitProcessRequest {
  exitType?: string;
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays?: number;
  noticePeriodServed?: number;
  buyoutAmount?: number;
  reasonForLeaving?: string;
  newCompany?: string;
  newDesignation?: string;
  status?: string;
  rehireEligible?: boolean;
  exitInterviewScheduled?: boolean;
  exitInterviewDate?: string;
  exitInterviewFeedback?: string;
  finalSettlementAmount?: number;
  settlementDate?: string;
  managerId?: string;
  hrSpocId?: string;
  notes?: string;
}

interface MockExitProcessesResponse {
  content: MockExitProcess[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

interface MockExitDashboard {
  totalExits: number;
  initiated: number;
  inProgress: number;
  clearancePending: number;
  completed: number;
  monthlyTrend?: { month: string; count: number }[];
  exitTypeBreakdown?: { type: string; count: number }[];
}

const mockedApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('ExitService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllExitProcesses', () => {
    it('should fetch exit processes with default pagination', async () => {
      const mockResponse: MockExitProcessesResponse = {
        content: [
          {
            id: 'exit-1',
            tenantId: 'tenant-1',
            employeeId: 'emp-1',
            employeeName: 'John Doe',
            exitType: 'RESIGNATION',
            status: 'INITIATED',
            createdAt: '2024-03-18T10:00:00',
            updatedAt: '2024-03-18T10:00:00',
          },
        ],
        totalElements: 5,
        totalPages: 1,
        size: 20,
        number: 0,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await exitService.getAllExitProcesses();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exit/processes', {
        params: { page: 0, size: 20 },
      });
      expect(result.content).toHaveLength(1);
      expect(result.totalElements).toBe(5);
    });

    it('should fetch exit processes with custom pagination', async () => {
      const mockResponse: MockExitProcessesResponse = {
        content: [],
        totalElements: 50,
        totalPages: 3,
        size: 15,
        number: 2,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await exitService.getAllExitProcesses(2, 15);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exit/processes', {
        params: { page: 2, size: 15 },
      });
      expect(result.number).toBe(2);
      expect(result.size).toBe(15);
    });

    it('should handle error when fetching exit processes', async () => {
      const error = new Error('Failed to fetch exit processes');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(exitService.getAllExitProcesses()).rejects.toThrow('Failed to fetch exit processes');
    });
  });

  describe('getExitProcess', () => {
    it('should fetch single exit process by id', async () => {
      const mockProcess: MockExitProcess = {
        id: 'exit-1',
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        exitType: 'RESIGNATION',
        resignationDate: '2024-03-15',
        lastWorkingDate: '2024-04-15',
        noticePeriodDays: 30,
        status: 'INITIATED',
        managerId: 'emp-100',
        managerName: 'Manager Name',
        createdAt: '2024-03-18T10:00:00',
        updatedAt: '2024-03-18T10:00:00',
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockProcess });

      const result = await exitService.getExitProcess('exit-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exit/processes/exit-1');
      expect(result.id).toBe('exit-1');
      expect(result.employeeName).toBe('John Doe');
    });

    it('should handle 404 when exit process not found', async () => {
      const error = { response: { status: 404, data: { message: 'Exit process not found' } } };
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(exitService.getExitProcess('non-existent')).rejects.toEqual(error);
    });
  });

  describe('getExitProcessByEmployee', () => {
    it('should fetch exit process by employee id', async () => {
      const mockProcess: MockExitProcess = {
        id: 'exit-1',
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        employeeName: 'Jane Smith',
        exitType: 'TERMINATION',
        status: 'IN_PROGRESS',
        createdAt: '2024-03-18T10:00:00',
        updatedAt: '2024-03-18T10:00:00',
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockProcess });

      const result = await exitService.getExitProcessByEmployee('emp-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exit/processes/employee/emp-1');
      expect(result.employeeId).toBe('emp-1');
      expect(result.exitType).toBe('TERMINATION');
    });

    it('should handle error when employee exit process not found', async () => {
      const error = { response: { status: 404, data: { message: 'No exit process for employee' } } };
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(exitService.getExitProcessByEmployee('emp-999')).rejects.toEqual(error);
    });
  });

  describe('getExitProcessesByStatus', () => {
    it('should fetch exit processes by status', async () => {
      const mockProcesses: MockExitProcess[] = [
        {
          id: 'exit-1',
          tenantId: 'tenant-1',
          employeeId: 'emp-1',
          status: 'INITIATED',
          exitType: 'RESIGNATION',
          createdAt: '2024-03-18T10:00:00',
          updatedAt: '2024-03-18T10:00:00',
        },
        {
          id: 'exit-2',
          tenantId: 'tenant-1',
          employeeId: 'emp-2',
          status: 'INITIATED',
          exitType: 'RETIREMENT',
          createdAt: '2024-03-17T10:00:00',
          updatedAt: '2024-03-17T10:00:00',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockProcesses });

      const result = await exitService.getExitProcessesByStatus('INITIATED');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exit/processes/status/INITIATED');
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.status === 'INITIATED')).toBe(true);
    });

    it('should handle empty exit processes list for status', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });

      const result = await exitService.getExitProcessesByStatus('COMPLETED');

      expect(result).toEqual([]);
    });

    it('should handle error when fetching by status', async () => {
      const error = new Error('Invalid status');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(exitService.getExitProcessesByStatus('INVALID_STATUS')).rejects.toThrow('Invalid status');
    });
  });

  describe('createExitProcess', () => {
    it('should create new exit process', async () => {
      const createData: MockCreateExitProcessRequest = {
        employeeId: 'emp-1',
        exitType: 'RESIGNATION',
        resignationDate: '2024-03-15',
        lastWorkingDate: '2024-04-15',
        noticePeriodDays: 30,
        reasonForLeaving: 'Career growth',
        newCompany: 'TechCorp',
        managerId: 'emp-100',
      };

      const mockProcess: MockExitProcess = {
        id: 'exit-new-1',
        tenantId: 'tenant-1',
        ...createData,
        status: 'INITIATED',
        createdAt: '2024-03-18T10:00:00',
        updatedAt: '2024-03-18T10:00:00',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockProcess });

      const result = await exitService.createExitProcess(createData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/exit/processes', createData);
      expect(result.id).toBe('exit-new-1');
      expect(result.status).toBe('INITIATED');
    });

    it('should handle validation error when creating exit process', async () => {
      const error = { response: { status: 400, data: { message: 'Employee already has active exit' } } };
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(exitService.createExitProcess({} as MockCreateExitProcessRequest)).rejects.toEqual(error);
    });
  });

  describe('updateExitProcess', () => {
    it('should update exit process with partial data', async () => {
      const updateData: MockUpdateExitProcessRequest = {
        noticePeriodServed: 15,
        exitInterviewScheduled: true,
        exitInterviewDate: '2024-04-10',
      };

      const mockUpdated: MockExitProcess = {
        id: 'exit-1',
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        exitType: 'RESIGNATION',
        status: 'IN_PROGRESS',
        ...updateData,
        createdAt: '2024-03-18T10:00:00',
        updatedAt: '2024-03-18T15:00:00',
      };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockUpdated });

      const result = await exitService.updateExitProcess('exit-1', updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/exit/processes/exit-1', updateData);
      expect(result.noticePeriodServed).toBe(15);
      expect(result.exitInterviewScheduled).toBe(true);
    });

    it('should handle error when updating exit process', async () => {
      const error = { response: { status: 404, data: { message: 'Exit process not found' } } };
      mockedApiClient.put.mockRejectedValueOnce(error);

      await expect(exitService.updateExitProcess('non-existent', {})).rejects.toEqual(error);
    });
  });

  describe('updateExitStatus', () => {
    it('should update exit process status', async () => {
      const mockUpdated: MockExitProcess = {
        id: 'exit-1',
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        exitType: 'RESIGNATION',
        status: 'COMPLETED',
        finalSettlementAmount: 150000,
        settlementDate: '2024-04-20',
        createdAt: '2024-03-18T10:00:00',
        updatedAt: '2024-04-20T15:00:00',
      };

      mockedApiClient.patch.mockResolvedValueOnce({ data: mockUpdated });

      const result = await exitService.updateExitStatus('exit-1', 'COMPLETED');

      expect(mockedApiClient.patch).toHaveBeenCalledWith('/exit/processes/exit-1/status', null, {
        params: { status: 'COMPLETED' },
      });
      expect(result.status).toBe('COMPLETED');
    });

    it('should handle error when updating status', async () => {
      const error = { response: { status: 400, data: { message: 'Invalid status transition' } } };
      mockedApiClient.patch.mockRejectedValueOnce(error);

      await expect(exitService.updateExitStatus('exit-1', 'INVALID_STATUS')).rejects.toEqual(error);
    });
  });

  describe('deleteExitProcess', () => {
    it('should delete exit process by id', async () => {
      mockedApiClient.delete.mockResolvedValueOnce({});

      await exitService.deleteExitProcess('exit-1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/exit/processes/exit-1');
    });

    it('should handle error when deleting exit process', async () => {
      const error = { response: { status: 404, data: { message: 'Exit process not found' } } };
      mockedApiClient.delete.mockRejectedValueOnce(error);

      await expect(exitService.deleteExitProcess('non-existent')).rejects.toEqual(error);
    });

    it('should handle authorization error when deleting', async () => {
      const error = { response: { status: 403, data: { message: 'Not authorized to delete' } } };
      mockedApiClient.delete.mockRejectedValueOnce(error);

      await expect(exitService.deleteExitProcess('exit-1')).rejects.toEqual(error);
    });
  });

  describe('getDashboard', () => {
    it('should fetch exit dashboard', async () => {
      const mockDashboard: MockExitDashboard = {
        totalExits: 25,
        initiated: 8,
        inProgress: 10,
        clearancePending: 5,
        completed: 2,
        monthlyTrend: [
          { month: 'Jan', count: 3 },
          { month: 'Feb', count: 5 },
          { month: 'Mar', count: 8 },
        ],
        exitTypeBreakdown: [
          { type: 'RESIGNATION', count: 15 },
          { type: 'TERMINATION', count: 7 },
          { type: 'RETIREMENT', count: 3 },
        ],
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockDashboard });

      const result = await exitService.getDashboard();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exit/dashboard');
      expect(result.totalExits).toBe(25);
      expect(result.initiated).toBe(8);
      expect(result.monthlyTrend).toHaveLength(3);
    });

    it('should handle error when fetching dashboard', async () => {
      const error = new Error('Dashboard loading failed');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(exitService.getDashboard()).rejects.toThrow('Dashboard loading failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      const error = { response: { status: 401, data: { message: 'Unauthorized' } } };
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(exitService.getExitProcess('exit-1')).rejects.toEqual(error);
    });

    it('should handle 500 server error', async () => {
      const error = { response: { status: 500, data: { message: 'Internal Server Error' } } };
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(exitService.getAllExitProcesses()).rejects.toEqual(error);
    });

    it('should handle network timeout', async () => {
      const error = { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' };
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(exitService.getDashboard()).rejects.toEqual(error);
    });
  });
});
