import { apiClient } from '../../api/client';
import { Page } from '../../types/hrms/employee';
import {
  EmploymentChangeRequest,
  CreateEmploymentChangeRequest,
  ApproveRejectChangeRequest,
} from '../../types/hrms/employment-change-request';

class EmploymentChangeRequestService {
  async createChangeRequest(data: CreateEmploymentChangeRequest): Promise<EmploymentChangeRequest> {
    const response = await apiClient.post<EmploymentChangeRequest>(
      '/employment-change-requests',
      data
    );
    return response.data;
  }

  async getAllChangeRequests(
    page: number = 0,
    size: number = 20,
    sortBy: string = 'createdAt',
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<Page<EmploymentChangeRequest>> {
    const response = await apiClient.get<Page<EmploymentChangeRequest>>(
      '/employment-change-requests',
      {
        params: { page, size, sortBy, sortDirection },
      }
    );
    return response.data;
  }

  async getPendingChangeRequests(
    page: number = 0,
    size: number = 20
  ): Promise<Page<EmploymentChangeRequest>> {
    const response = await apiClient.get<Page<EmploymentChangeRequest>>(
      '/employment-change-requests/pending',
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async getPendingCount(): Promise<number> {
    const response = await apiClient.get<number>('/employment-change-requests/pending/count');
    return response.data;
  }

  async getChangeRequestsByEmployee(
    employeeId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<EmploymentChangeRequest>> {
    const response = await apiClient.get<Page<EmploymentChangeRequest>>(
      `/employment-change-requests/employee/${employeeId}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async getChangeRequest(id: string): Promise<EmploymentChangeRequest> {
    const response = await apiClient.get<EmploymentChangeRequest>(
      `/employment-change-requests/${id}`
    );
    return response.data;
  }

  async approveChangeRequest(
    id: string,
    data?: ApproveRejectChangeRequest
  ): Promise<EmploymentChangeRequest> {
    const response = await apiClient.post<EmploymentChangeRequest>(
      `/employment-change-requests/${id}/approve`,
      data || {}
    );
    return response.data;
  }

  async rejectChangeRequest(
    id: string,
    data: ApproveRejectChangeRequest
  ): Promise<EmploymentChangeRequest> {
    const response = await apiClient.post<EmploymentChangeRequest>(
      `/employment-change-requests/${id}/reject`,
      data
    );
    return response.data;
  }

  async cancelChangeRequest(id: string): Promise<EmploymentChangeRequest> {
    const response = await apiClient.post<EmploymentChangeRequest>(
      `/employment-change-requests/${id}/cancel`
    );
    return response.data;
  }
}

export const employmentChangeRequestService = new EmploymentChangeRequestService();
