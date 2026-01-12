import { apiClient } from '../api/client';
import {
  TravelRequest,
  TravelRequestRequest,
  TravelExpense,
  TravelExpenseRequest,
  TravelStatus,
  Page,
  TravelRequestFilters,
} from '../types/travel';

class TravelService {
  // Travel Request Management
  async createTravelRequest(data: TravelRequestRequest): Promise<TravelRequest> {
    const response = await apiClient.post<TravelRequest>('/travel-requests', data);
    return response.data;
  }

  async updateTravelRequest(id: string, data: TravelRequestRequest): Promise<TravelRequest> {
    const response = await apiClient.put<TravelRequest>(`/travel-requests/${id}`, data);
    return response.data;
  }

  async getTravelRequestById(id: string): Promise<TravelRequest> {
    const response = await apiClient.get<TravelRequest>(`/travel-requests/${id}`);
    return response.data;
  }

  async getAllTravelRequests(
    page: number = 0,
    size: number = 20,
    filters?: TravelRequestFilters
  ): Promise<Page<TravelRequest>> {
    const params: any = { page, size };

    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.travelType) params.travelType = filters.travelType;
      if (filters.employeeId) params.employeeId = filters.employeeId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.search) params.search = filters.search;
    }

    const response = await apiClient.get<Page<TravelRequest>>('/travel-requests', {
      params,
    });
    return response.data;
  }

  async getEmployeeTravelRequests(
    employeeId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<TravelRequest>> {
    const response = await apiClient.get<Page<TravelRequest>>(
      `/travel-requests/employee/${employeeId}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async getTravelRequestsByStatus(
    status: TravelStatus,
    page: number = 0,
    size: number = 20
  ): Promise<Page<TravelRequest>> {
    const response = await apiClient.get<Page<TravelRequest>>(
      `/travel-requests/status/${status}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async submitTravelRequest(id: string): Promise<TravelRequest> {
    const response = await apiClient.post<TravelRequest>(
      `/travel-requests/${id}/submit`
    );
    return response.data;
  }

  async approveTravelRequest(
    id: string,
    approverId: string,
    comments?: string
  ): Promise<TravelRequest> {
    const response = await apiClient.post<TravelRequest>(
      `/travel-requests/${id}/approve`,
      null,
      {
        params: { approverId, comments },
      }
    );
    return response.data;
  }

  async rejectTravelRequest(
    id: string,
    approverId: string,
    reason: string
  ): Promise<TravelRequest> {
    const response = await apiClient.post<TravelRequest>(
      `/travel-requests/${id}/reject`,
      null,
      {
        params: { approverId, reason },
      }
    );
    return response.data;
  }

  async cancelTravelRequest(id: string, reason: string): Promise<TravelRequest> {
    const response = await apiClient.post<TravelRequest>(
      `/travel-requests/${id}/cancel`,
      null,
      {
        params: { reason },
      }
    );
    return response.data;
  }

  async completeTravelRequest(id: string): Promise<TravelRequest> {
    const response = await apiClient.post<TravelRequest>(
      `/travel-requests/${id}/complete`
    );
    return response.data;
  }

  async deleteTravelRequest(id: string): Promise<void> {
    await apiClient.delete(`/travel-requests/${id}`);
  }

  // Travel Expense Management
  async createTravelExpense(data: TravelExpenseRequest): Promise<TravelExpense> {
    const response = await apiClient.post<TravelExpense>('/travel-expenses', data);
    return response.data;
  }

  async updateTravelExpense(id: string, data: TravelExpenseRequest): Promise<TravelExpense> {
    const response = await apiClient.put<TravelExpense>(`/travel-expenses/${id}`, data);
    return response.data;
  }

  async getTravelExpenseById(id: string): Promise<TravelExpense> {
    const response = await apiClient.get<TravelExpense>(`/travel-expenses/${id}`);
    return response.data;
  }

  async getTravelExpensesByRequest(
    travelRequestId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<TravelExpense>> {
    const response = await apiClient.get<Page<TravelExpense>>(
      `/travel-expenses/request/${travelRequestId}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async getEmployeeTravelExpenses(
    employeeId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<TravelExpense>> {
    const response = await apiClient.get<Page<TravelExpense>>(
      `/travel-expenses/employee/${employeeId}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async approveTravelExpense(
    id: string,
    approverId: string,
    approvedAmount?: number,
    comments?: string
  ): Promise<TravelExpense> {
    const response = await apiClient.post<TravelExpense>(
      `/travel-expenses/${id}/approve`,
      null,
      {
        params: { approverId, approvedAmount, comments },
      }
    );
    return response.data;
  }

  async rejectTravelExpense(
    id: string,
    approverId: string,
    reason: string
  ): Promise<TravelExpense> {
    const response = await apiClient.post<TravelExpense>(
      `/travel-expenses/${id}/reject`,
      null,
      {
        params: { approverId, reason },
      }
    );
    return response.data;
  }

  async deleteTravelExpense(id: string): Promise<void> {
    await apiClient.delete(`/travel-expenses/${id}`);
  }

  // Helper Methods
  async getTravelSummary(employeeId: string, year?: number): Promise<any> {
    const params: any = {};
    if (year) params.year = year;

    const response = await apiClient.get(
      `/travel-requests/employee/${employeeId}/summary`,
      { params }
    );
    return response.data;
  }

  async getExpenseSummary(travelRequestId: string): Promise<any> {
    const response = await apiClient.get(
      `/travel-expenses/request/${travelRequestId}/summary`
    );
    return response.data;
  }
}

export const travelService = new TravelService();
