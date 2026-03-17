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

import { leaveService } from './leave.service';
import { apiClient } from '@/lib/api/client';

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

// Minimal inline interfaces for testing
interface MockLeaveType {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

interface MockLeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface MockLeaveBalance {
  leaveTypeId: string;
  totalDays: number;
  usedDays: number;
  availableDays: number;
}

interface MockPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
}

describe('LeaveService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // createLeaveType tests
  describe('createLeaveType', () => {
    it('should create a leave type', async () => {
      const requestData = {
        name: 'Sick Leave',
        description: 'Sick leave policy',
      };
      const mockLeaveType: MockLeaveType = {
        id: 'lt-1',
        name: 'Sick Leave',
        description: 'Sick leave policy',
        active: true,
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockLeaveType });

      const result = await leaveService.createLeaveType(requestData as any);

      expect(mockApiClient.post).toHaveBeenCalledWith('/leave-types', requestData);
      expect(result).toEqual(mockLeaveType);
    });

    it('should handle errors when creating a leave type', async () => {
      const requestData = { name: 'Sick Leave', description: 'Sick leave policy' };
      const error = new Error('Creation failed');

      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(leaveService.createLeaveType(requestData as any)).rejects.toThrow(
        'Creation failed'
      );
    });
  });

  // updateLeaveType tests
  describe('updateLeaveType', () => {
    it('should update a leave type', async () => {
      const leaveTypeId = 'lt-1';
      const updateData = { name: 'Sick Leave Updated' };
      const mockLeaveType: MockLeaveType = {
        id: leaveTypeId,
        name: 'Sick Leave Updated',
        description: 'Sick leave policy',
        active: true,
      };

      mockApiClient.put.mockResolvedValueOnce({ data: mockLeaveType });

      const result = await leaveService.updateLeaveType(leaveTypeId, updateData as any);

      expect(mockApiClient.put).toHaveBeenCalledWith(`/leave-types/${leaveTypeId}`, updateData);
      expect(result).toEqual(mockLeaveType);
    });

    it('should handle errors when updating a leave type', async () => {
      const leaveTypeId = 'lt-1';
      const updateData = { name: 'Sick Leave Updated' };
      const error = new Error('Update failed');

      mockApiClient.put.mockRejectedValueOnce(error);

      await expect(leaveService.updateLeaveType(leaveTypeId, updateData as any)).rejects.toThrow(
        'Update failed'
      );
    });
  });

  // getLeaveTypeById tests
  describe('getLeaveTypeById', () => {
    it('should fetch a leave type by ID', async () => {
      const leaveTypeId = 'lt-1';
      const mockLeaveType: MockLeaveType = {
        id: leaveTypeId,
        name: 'Sick Leave',
        description: 'Sick leave policy',
        active: true,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockLeaveType });

      const result = await leaveService.getLeaveTypeById(leaveTypeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/leave-types/${leaveTypeId}`);
      expect(result).toEqual(mockLeaveType);
    });

    it('should handle errors when fetching a leave type', async () => {
      const leaveTypeId = 'lt-1';
      const error = new Error('Leave type not found');

      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(leaveService.getLeaveTypeById(leaveTypeId)).rejects.toThrow(
        'Leave type not found'
      );
    });
  });

  // getAllLeaveTypes tests
  describe('getAllLeaveTypes', () => {
    it('should fetch all leave types with default pagination', async () => {
      const mockPage: MockPage<MockLeaveType> = {
        content: [
          {
            id: 'lt-1',
            name: 'Sick Leave',
            description: 'Sick leave policy',
            active: true,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await leaveService.getAllLeaveTypes();

      expect(mockApiClient.get).toHaveBeenCalledWith('/leave-types', {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockPage);
    });

    it('should fetch leave types with custom pagination', async () => {
      const mockPage: MockPage<MockLeaveType> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 1,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await leaveService.getAllLeaveTypes(1, 50);

      expect(mockApiClient.get).toHaveBeenCalledWith('/leave-types', {
        params: { page: 1, size: 50 },
      });
      expect(result).toEqual(mockPage);
    });
  });

  // getActiveLeaveTypes tests
  describe('getActiveLeaveTypes', () => {
    it('should fetch active leave types', async () => {
      const mockLeaveTypes: MockLeaveType[] = [
        {
          id: 'lt-1',
          name: 'Sick Leave',
          description: 'Sick leave policy',
          active: true,
        },
        {
          id: 'lt-2',
          name: 'Vacation',
          description: 'Vacation policy',
          active: true,
        },
      ];

      mockApiClient.get.mockResolvedValueOnce({ data: mockLeaveTypes });

      const result = await leaveService.getActiveLeaveTypes();

      expect(mockApiClient.get).toHaveBeenCalledWith('/leave-types/active');
      expect(result).toEqual(mockLeaveTypes);
    });

    it('should handle errors when fetching active leave types', async () => {
      const error = new Error('Active leave types not found');

      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(leaveService.getActiveLeaveTypes()).rejects.toThrow(
        'Active leave types not found'
      );
    });
  });

  // activateLeaveType tests
  describe('activateLeaveType', () => {
    it('should activate a leave type', async () => {
      const leaveTypeId = 'lt-1';
      const mockLeaveType: MockLeaveType = {
        id: leaveTypeId,
        name: 'Sick Leave',
        description: 'Sick leave policy',
        active: true,
      };

      mockApiClient.patch.mockResolvedValueOnce({ data: mockLeaveType });

      const result = await leaveService.activateLeaveType(leaveTypeId);

      expect(mockApiClient.patch).toHaveBeenCalledWith(`/leave-types/${leaveTypeId}/activate`);
      expect(result).toEqual(mockLeaveType);
    });

    it('should handle errors when activating a leave type', async () => {
      const leaveTypeId = 'lt-1';
      const error = new Error('Activation failed');

      mockApiClient.patch.mockRejectedValueOnce(error);

      await expect(leaveService.activateLeaveType(leaveTypeId)).rejects.toThrow(
        'Activation failed'
      );
    });
  });

  // deactivateLeaveType tests
  describe('deactivateLeaveType', () => {
    it('should deactivate a leave type', async () => {
      const leaveTypeId = 'lt-1';
      const mockLeaveType: MockLeaveType = {
        id: leaveTypeId,
        name: 'Sick Leave',
        description: 'Sick leave policy',
        active: false,
      };

      mockApiClient.patch.mockResolvedValueOnce({ data: mockLeaveType });

      const result = await leaveService.deactivateLeaveType(leaveTypeId);

      expect(mockApiClient.patch).toHaveBeenCalledWith(`/leave-types/${leaveTypeId}/deactivate`);
      expect(result).toEqual(mockLeaveType);
    });

    it('should handle errors when deactivating a leave type', async () => {
      const leaveTypeId = 'lt-1';
      const error = new Error('Deactivation failed');

      mockApiClient.patch.mockRejectedValueOnce(error);

      await expect(leaveService.deactivateLeaveType(leaveTypeId)).rejects.toThrow(
        'Deactivation failed'
      );
    });
  });

  // deleteLeaveType tests
  describe('deleteLeaveType', () => {
    it('should delete a leave type', async () => {
      const leaveTypeId = 'lt-1';

      mockApiClient.delete.mockResolvedValueOnce({});

      await leaveService.deleteLeaveType(leaveTypeId);

      expect(mockApiClient.delete).toHaveBeenCalledWith(`/leave-types/${leaveTypeId}`);
    });

    it('should handle errors when deleting a leave type', async () => {
      const leaveTypeId = 'lt-1';
      const error = new Error('Delete failed');

      mockApiClient.delete.mockRejectedValueOnce(error);

      await expect(leaveService.deleteLeaveType(leaveTypeId)).rejects.toThrow('Delete failed');
    });
  });

  // createLeaveRequest tests
  describe('createLeaveRequest', () => {
    it('should create a leave request', async () => {
      const requestData = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
      };
      const mockLeaveRequest: MockLeaveRequest = {
        id: 'lr-1',
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        status: 'PENDING',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockLeaveRequest });

      const result = await leaveService.createLeaveRequest(requestData as any);

      expect(mockApiClient.post).toHaveBeenCalledWith('/leave-requests', requestData);
      expect(result).toEqual(mockLeaveRequest);
    });

    it('should handle errors when creating a leave request', async () => {
      const requestData = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
      };
      const error = new Error('Creation failed');

      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(leaveService.createLeaveRequest(requestData as any)).rejects.toThrow(
        'Creation failed'
      );
    });
  });

  // getLeaveRequestById tests
  describe('getLeaveRequestById', () => {
    it('should fetch a leave request by ID', async () => {
      const leaveRequestId = 'lr-1';
      const mockLeaveRequest: MockLeaveRequest = {
        id: leaveRequestId,
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        status: 'PENDING',
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockLeaveRequest });

      const result = await leaveService.getLeaveRequestById(leaveRequestId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/leave-requests/${leaveRequestId}`);
      expect(result).toEqual(mockLeaveRequest);
    });

    it('should handle errors when fetching a leave request', async () => {
      const leaveRequestId = 'lr-1';
      const error = new Error('Leave request not found');

      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(leaveService.getLeaveRequestById(leaveRequestId)).rejects.toThrow(
        'Leave request not found'
      );
    });
  });

  // getAllLeaveRequests tests
  describe('getAllLeaveRequests', () => {
    it('should fetch all leave requests with default pagination', async () => {
      const mockPage: MockPage<MockLeaveRequest> = {
        content: [
          {
            id: 'lr-1',
            employeeId: 'emp-1',
            leaveTypeId: 'lt-1',
            startDate: '2026-04-01',
            endDate: '2026-04-05',
            status: 'PENDING',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await leaveService.getAllLeaveRequests();

      expect(mockApiClient.get).toHaveBeenCalledWith('/leave-requests', {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockPage);
    });

    it('should fetch leave requests with custom pagination', async () => {
      const mockPage: MockPage<MockLeaveRequest> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 2,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await leaveService.getAllLeaveRequests(2, 50);

      expect(mockApiClient.get).toHaveBeenCalledWith('/leave-requests', {
        params: { page: 2, size: 50 },
      });
      expect(result).toEqual(mockPage);
    });
  });

  // getEmployeeLeaveRequests tests
  describe('getEmployeeLeaveRequests', () => {
    it('should fetch leave requests for an employee', async () => {
      const employeeId = 'emp-1';
      const mockPage: MockPage<MockLeaveRequest> = {
        content: [
          {
            id: 'lr-1',
            employeeId,
            leaveTypeId: 'lt-1',
            startDate: '2026-04-01',
            endDate: '2026-04-05',
            status: 'PENDING',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await leaveService.getEmployeeLeaveRequests(employeeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/leave-requests/employee/${employeeId}`, {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockPage);
    });

    it('should fetch with custom pagination', async () => {
      const employeeId = 'emp-1';
      const mockPage: MockPage<MockLeaveRequest> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 1,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await leaveService.getEmployeeLeaveRequests(employeeId, 1, 30);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/leave-requests/employee/${employeeId}`, {
        params: { page: 1, size: 30 },
      });
      expect(result).toEqual(mockPage);
    });
  });

  // getLeaveRequestsByEmployee tests
  describe('getLeaveRequestsByEmployee', () => {
    it('should fetch leave requests using alias method', async () => {
      const employeeId = 'emp-1';
      const mockPage: MockPage<MockLeaveRequest> = {
        content: [
          {
            id: 'lr-1',
            employeeId,
            leaveTypeId: 'lt-1',
            startDate: '2026-04-01',
            endDate: '2026-04-05',
            status: 'PENDING',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await leaveService.getLeaveRequestsByEmployee(employeeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/leave-requests/employee/${employeeId}`, {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockPage);
    });

    it('should call getEmployeeLeaveRequests internally', async () => {
      const employeeId = 'emp-1';
      const mockPage: MockPage<MockLeaveRequest> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 0,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      await leaveService.getLeaveRequestsByEmployee(employeeId, 1, 40);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/leave-requests/employee/${employeeId}`, {
        params: { page: 1, size: 40 },
      });
    });
  });

  // getLeaveRequestsByStatus tests
  describe('getLeaveRequestsByStatus', () => {
    it('should fetch leave requests by status', async () => {
      const status = 'PENDING';
      const mockPage: MockPage<MockLeaveRequest> = {
        content: [
          {
            id: 'lr-1',
            employeeId: 'emp-1',
            leaveTypeId: 'lt-1',
            startDate: '2026-04-01',
            endDate: '2026-04-05',
            status,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await leaveService.getLeaveRequestsByStatus(status as any);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/leave-requests/status/${status}`, {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockPage);
    });

    it('should fetch with custom pagination', async () => {
      const status = 'APPROVED';
      const mockPage: MockPage<MockLeaveRequest> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 1,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockPage });

      const result = await leaveService.getLeaveRequestsByStatus(status as any, 1, 25);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/leave-requests/status/${status}`, {
        params: { page: 1, size: 25 },
      });
      expect(result).toEqual(mockPage);
    });
  });

  // approveLeaveRequest tests
  describe('approveLeaveRequest', () => {
    it('should approve a leave request without comments', async () => {
      const leaveRequestId = 'lr-1';
      const approverId = 'approver-1';
      const mockLeaveRequest: MockLeaveRequest = {
        id: leaveRequestId,
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        status: 'APPROVED',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockLeaveRequest });

      const result = await leaveService.approveLeaveRequest(leaveRequestId, approverId);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/leave-requests/${leaveRequestId}/approve`,
        null,
        { params: { approverId, comments: undefined } }
      );
      expect(result).toEqual(mockLeaveRequest);
    });

    it('should approve a leave request with comments', async () => {
      const leaveRequestId = 'lr-1';
      const approverId = 'approver-1';
      const comments = 'Approved as per policy';
      const mockLeaveRequest: MockLeaveRequest = {
        id: leaveRequestId,
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        status: 'APPROVED',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockLeaveRequest });

      const result = await leaveService.approveLeaveRequest(leaveRequestId, approverId, comments);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/leave-requests/${leaveRequestId}/approve`,
        null,
        { params: { approverId, comments } }
      );
      expect(result).toEqual(mockLeaveRequest);
    });
  });

  // rejectLeaveRequest tests
  describe('rejectLeaveRequest', () => {
    it('should reject a leave request', async () => {
      const leaveRequestId = 'lr-1';
      const approverId = 'approver-1';
      const reason = 'Insufficient leave balance';
      const mockLeaveRequest: MockLeaveRequest = {
        id: leaveRequestId,
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        status: 'REJECTED',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockLeaveRequest });

      const result = await leaveService.rejectLeaveRequest(leaveRequestId, approverId, reason);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/leave-requests/${leaveRequestId}/reject`,
        null,
        { params: { approverId, reason } }
      );
      expect(result).toEqual(mockLeaveRequest);
    });

    it('should handle errors when rejecting a leave request', async () => {
      const leaveRequestId = 'lr-1';
      const approverId = 'approver-1';
      const reason = 'Insufficient leave balance';
      const error = new Error('Rejection failed');

      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(
        leaveService.rejectLeaveRequest(leaveRequestId, approverId, reason)
      ).rejects.toThrow('Rejection failed');
    });
  });

  // cancelLeaveRequest tests
  describe('cancelLeaveRequest', () => {
    it('should cancel a leave request', async () => {
      const leaveRequestId = 'lr-1';
      const reason = 'Personal reasons';
      const mockLeaveRequest: MockLeaveRequest = {
        id: leaveRequestId,
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        status: 'CANCELLED',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockLeaveRequest });

      const result = await leaveService.cancelLeaveRequest(leaveRequestId, reason);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/leave-requests/${leaveRequestId}/cancel`,
        null,
        { params: { reason } }
      );
      expect(result).toEqual(mockLeaveRequest);
    });

    it('should handle errors when canceling a leave request', async () => {
      const leaveRequestId = 'lr-1';
      const reason = 'Personal reasons';
      const error = new Error('Cancellation failed');

      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(leaveService.cancelLeaveRequest(leaveRequestId, reason)).rejects.toThrow(
        'Cancellation failed'
      );
    });
  });

  // updateLeaveRequest tests
  describe('updateLeaveRequest', () => {
    it('should update a leave request', async () => {
      const leaveRequestId = 'lr-1';
      const updateData = { startDate: '2026-04-02' };
      const mockLeaveRequest: MockLeaveRequest = {
        id: leaveRequestId,
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-04-02',
        endDate: '2026-04-05',
        status: 'PENDING',
      };

      mockApiClient.put.mockResolvedValueOnce({ data: mockLeaveRequest });

      const result = await leaveService.updateLeaveRequest(leaveRequestId, updateData as any);

      expect(mockApiClient.put).toHaveBeenCalledWith(`/leave-requests/${leaveRequestId}`, updateData);
      expect(result).toEqual(mockLeaveRequest);
    });

    it('should handle errors when updating a leave request', async () => {
      const leaveRequestId = 'lr-1';
      const updateData = { startDate: '2026-04-02' };
      const error = new Error('Update failed');

      mockApiClient.put.mockRejectedValueOnce(error);

      await expect(leaveService.updateLeaveRequest(leaveRequestId, updateData as any)).rejects.toThrow(
        'Update failed'
      );
    });
  });

  // getEmployeeBalances tests
  describe('getEmployeeBalances', () => {
    it('should fetch leave balances for an employee', async () => {
      const employeeId = 'emp-1';
      const mockBalances: MockLeaveBalance[] = [
        {
          leaveTypeId: 'lt-1',
          totalDays: 20,
          usedDays: 5,
          availableDays: 15,
        },
      ];

      mockApiClient.get.mockResolvedValueOnce({ data: mockBalances });

      const result = await leaveService.getEmployeeBalances(employeeId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/leave-balances/employee/${employeeId}`
      );
      expect(result).toEqual(mockBalances);
    });

    it('should handle errors when fetching balances', async () => {
      const employeeId = 'emp-1';
      const error = new Error('Balances not found');

      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(leaveService.getEmployeeBalances(employeeId)).rejects.toThrow(
        'Balances not found'
      );
    });
  });

  // getEmployeeBalancesForYear tests
  describe('getEmployeeBalancesForYear', () => {
    it('should fetch leave balances for an employee in a specific year', async () => {
      const employeeId = 'emp-1';
      const year = 2026;
      const mockBalances: MockLeaveBalance[] = [
        {
          leaveTypeId: 'lt-1',
          totalDays: 20,
          usedDays: 3,
          availableDays: 17,
        },
      ];

      mockApiClient.get.mockResolvedValueOnce({ data: mockBalances });

      const result = await leaveService.getEmployeeBalancesForYear(employeeId, year);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/leave-balances/employee/${employeeId}/year/${year}`
      );
      expect(result).toEqual(mockBalances);
    });

    it('should handle errors when fetching balances for year', async () => {
      const employeeId = 'emp-1';
      const year = 2026;
      const error = new Error('Balances for year not found');

      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(leaveService.getEmployeeBalancesForYear(employeeId, year)).rejects.toThrow(
        'Balances for year not found'
      );
    });
  });
});
