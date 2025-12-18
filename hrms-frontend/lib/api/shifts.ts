import { apiClient } from './client';
import {
  Shift,
  CreateShiftRequest,
  UpdateShiftRequest,
  ShiftAssignment,
  CreateShiftAssignmentRequest,
  PagedResponse,
} from '../types/shifts';

export const shiftsApi = {
  // Shift CRUD operations
  getAllShifts: async (params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: 'ASC' | 'DESC';
  }): Promise<PagedResponse<Shift>> => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get<PagedResponse<Shift>>(`/api/v1/shifts?${queryParams.toString()}`);
    return response.data;
  },

  getActiveShifts: async (): Promise<Shift[]> => {
    const response = await apiClient.get<Shift[]>('/api/v1/shifts/active');
    return response.data;
  },

  getShiftById: async (shiftId: string): Promise<Shift> => {
    const response = await apiClient.get<Shift>(`/api/v1/shifts/${shiftId}`);
    return response.data;
  },

  createShift: async (request: CreateShiftRequest): Promise<Shift> => {
    const response = await apiClient.post<Shift>('/api/v1/shifts', request);
    return response.data;
  },

  updateShift: async (shiftId: string, request: UpdateShiftRequest): Promise<Shift> => {
    const response = await apiClient.put<Shift>(`/api/v1/shifts/${shiftId}`, request);
    return response.data;
  },

  deleteShift: async (shiftId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/shifts/${shiftId}`);
  },

  // Shift Assignment operations
  assignShift: async (request: CreateShiftAssignmentRequest): Promise<ShiftAssignment> => {
    const response = await apiClient.post<ShiftAssignment>('/api/v1/shifts/assignments', request);
    return response.data;
  },

  getEmployeeAssignments: async (
    employeeId: string,
    params?: { page?: number; size?: number }
  ): Promise<PagedResponse<ShiftAssignment>> => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());

    const response = await apiClient.get<PagedResponse<ShiftAssignment>>(
      `/api/v1/shifts/assignments/employee/${employeeId}?${queryParams.toString()}`
    );
    return response.data;
  },

  getAssignmentsForDate: async (date: string): Promise<ShiftAssignment[]> => {
    const response = await apiClient.get<ShiftAssignment[]>(`/api/v1/shifts/assignments/date/${date}`);
    return response.data;
  },

  cancelAssignment: async (assignmentId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/shifts/assignments/${assignmentId}`);
  },
};
