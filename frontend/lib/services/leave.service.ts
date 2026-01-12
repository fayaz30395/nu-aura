import { apiClient } from '../api/client';
import {
  LeaveType,
  LeaveTypeRequest,
  LeaveRequest,
  LeaveRequestRequest,
  LeaveBalance,
  LeaveRequestStatus,
  Page,
} from '../types/leave';

class LeaveService {
  // Leave Type Management
  async createLeaveType(data: LeaveTypeRequest): Promise<LeaveType> {
    const response = await apiClient.post<LeaveType>('/leave-types', data);
    return response.data;
  }

  async updateLeaveType(id: string, data: LeaveTypeRequest): Promise<LeaveType> {
    const response = await apiClient.put<LeaveType>(`/leave-types/${id}`, data);
    return response.data;
  }

  async getLeaveTypeById(id: string): Promise<LeaveType> {
    const response = await apiClient.get<LeaveType>(`/leave-types/${id}`);
    return response.data;
  }

  async getAllLeaveTypes(page: number = 0, size: number = 20): Promise<Page<LeaveType>> {
    const response = await apiClient.get<Page<LeaveType>>('/leave-types', {
      params: { page, size },
    });
    return response.data;
  }

  async getActiveLeaveTypes(): Promise<LeaveType[]> {
    const response = await apiClient.get<LeaveType[]>('/leave-types/active');
    return response.data;
  }

  async activateLeaveType(id: string): Promise<LeaveType> {
    const response = await apiClient.patch<LeaveType>(`/leave-types/${id}/activate`);
    return response.data;
  }

  async deactivateLeaveType(id: string): Promise<LeaveType> {
    const response = await apiClient.patch<LeaveType>(`/leave-types/${id}/deactivate`);
    return response.data;
  }

  async deleteLeaveType(id: string): Promise<void> {
    await apiClient.delete(`/leave-types/${id}`);
  }

  // Leave Request Management
  async createLeaveRequest(data: LeaveRequestRequest): Promise<LeaveRequest> {
    const response = await apiClient.post<LeaveRequest>('/leave-requests', data);
    return response.data;
  }

  async getLeaveRequestById(id: string): Promise<LeaveRequest> {
    const response = await apiClient.get<LeaveRequest>(`/leave-requests/${id}`);
    return response.data;
  }

  async getAllLeaveRequests(
    page: number = 0,
    size: number = 20
  ): Promise<Page<LeaveRequest>> {
    const response = await apiClient.get<Page<LeaveRequest>>('/leave-requests', {
      params: { page, size },
    });
    return response.data;
  }

  async getEmployeeLeaveRequests(
    employeeId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<LeaveRequest>> {
    const response = await apiClient.get<Page<LeaveRequest>>(
      `/leave-requests/employee/${employeeId}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  // Alias for getEmployeeLeaveRequests
  async getLeaveRequestsByEmployee(
    employeeId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<LeaveRequest>> {
    return this.getEmployeeLeaveRequests(employeeId, page, size);
  }

  async getLeaveRequestsByStatus(
    status: LeaveRequestStatus,
    page: number = 0,
    size: number = 20
  ): Promise<Page<LeaveRequest>> {
    const response = await apiClient.get<Page<LeaveRequest>>(
      `/leave-requests/status/${status}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async approveLeaveRequest(
    id: string,
    approverId: string,
    comments?: string
  ): Promise<LeaveRequest> {
    const response = await apiClient.post<LeaveRequest>(
      `/leave-requests/${id}/approve`,
      null,
      {
        params: { approverId, comments },
      }
    );
    return response.data;
  }

  async rejectLeaveRequest(
    id: string,
    approverId: string,
    reason: string
  ): Promise<LeaveRequest> {
    const response = await apiClient.post<LeaveRequest>(
      `/leave-requests/${id}/reject`,
      null,
      {
        params: { approverId, reason },
      }
    );
    return response.data;
  }

  async cancelLeaveRequest(id: string, reason: string): Promise<LeaveRequest> {
    const response = await apiClient.post<LeaveRequest>(
      `/leave-requests/${id}/cancel`,
      null,
      {
        params: { reason },
      }
    );
    return response.data;
  }

  async updateLeaveRequest(id: string, data: LeaveRequestRequest): Promise<LeaveRequest> {
    const response = await apiClient.put<LeaveRequest>(`/leave-requests/${id}`, data);
    return response.data;
  }

  // Leave Balance Management
  async getEmployeeBalances(employeeId: string): Promise<LeaveBalance[]> {
    const response = await apiClient.get<LeaveBalance[]>(
      `/leave-balances/employee/${employeeId}`
    );
    return response.data;
  }

  async getEmployeeBalancesForYear(
    employeeId: string,
    year: number
  ): Promise<LeaveBalance[]> {
    const response = await apiClient.get<LeaveBalance[]>(
      `/leave-balances/employee/${employeeId}/year/${year}`
    );
    return response.data;
  }
}

export const leaveService = new LeaveService();
