/**
 * Unit Tests for Dashboard Service
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {dashboardService} from './dashboard.service';
import {apiClient} from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {get: vi.fn()},
}));

const mockedApiClient = apiClient as { get: ReturnType<typeof vi.fn> };

interface ExecutiveDashboardData {
  headcount: number;
  revenue: number;
}

interface EmployeeDashboardData {
  employeeId: string;
  leaveBalance: number;
}

interface ManagerDashboardResponse {
  teamSize: number;
  pendingApprovals: number;
}

describe('DashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getExecutiveDashboard', () => {
    it('should return executive dashboard data', async () => {
      const mockData: ExecutiveDashboardData = {headcount: 200, revenue: 5000000};
      mockedApiClient.get.mockResolvedValueOnce({data: mockData});
      const result = await dashboardService.getExecutiveDashboard();
      expect(result).toEqual(mockData);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboards/executive');
    });

    it('should throw on error', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Unauthorized'));
      await expect(dashboardService.getExecutiveDashboard()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getExecutiveDashboardByDateRange', () => {
    it('should pass date range parameters', async () => {
      const mockData: ExecutiveDashboardData = {headcount: 200, revenue: 5000000};
      mockedApiClient.get.mockResolvedValueOnce({data: mockData});
      await dashboardService.getExecutiveDashboardByDateRange('2024-01-01', '2024-03-31');
      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboards/executive', {
        params: {startDate: '2024-01-01', endDate: '2024-03-31'},
      });
    });

    it('should throw on error', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Network error'));
      await expect(
        dashboardService.getExecutiveDashboardByDateRange('2024-01-01', '2024-12-31')
      ).rejects.toThrow('Network error');
    });
  });

  describe('getEmployeeDashboard', () => {
    it('should return employee dashboard data', async () => {
      const mockData: EmployeeDashboardData = {employeeId: 'emp-1', leaveBalance: 12};
      mockedApiClient.get.mockResolvedValueOnce({data: mockData});
      const result = await dashboardService.getEmployeeDashboard();
      expect(result).toEqual(mockData);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboards/employee');
    });

    it('should throw on error', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Server error'));
      await expect(dashboardService.getEmployeeDashboard()).rejects.toThrow('Server error');
    });
  });

  describe('getEmployeeDashboardById', () => {
    it('should fetch dashboard for specific employee', async () => {
      const mockData: EmployeeDashboardData = {employeeId: 'emp-42', leaveBalance: 8};
      mockedApiClient.get.mockResolvedValueOnce({data: mockData});
      const result = await dashboardService.getEmployeeDashboardById('emp-42');
      expect(result).toEqual(mockData);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboards/employee/emp-42');
    });

    it('should throw on 404', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Not Found'));
      await expect(dashboardService.getEmployeeDashboardById('bad-id')).rejects.toThrow('Not Found');
    });
  });

  describe('getManagerDashboard', () => {
    it('should return manager dashboard data', async () => {
      const mockData: ManagerDashboardResponse = {teamSize: 10, pendingApprovals: 3};
      mockedApiClient.get.mockResolvedValueOnce({data: mockData});
      const result = await dashboardService.getManagerDashboard();
      expect(result).toEqual(mockData);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboards/manager');
    });

    it('should throw on error', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Forbidden'));
      await expect(dashboardService.getManagerDashboard()).rejects.toThrow('Forbidden');
    });
  });

  describe('getManagerDashboardById', () => {
    it('should fetch dashboard for specific manager', async () => {
      const mockData: ManagerDashboardResponse = {teamSize: 5, pendingApprovals: 1};
      mockedApiClient.get.mockResolvedValueOnce({data: mockData});
      const result = await dashboardService.getManagerDashboardById('mgr-1');
      expect(result).toEqual(mockData);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/dashboards/manager/mgr-1');
    });

    it('should throw on error', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Not Found'));
      await expect(dashboardService.getManagerDashboardById('bad-id')).rejects.toThrow('Not Found');
    });
  });
});
