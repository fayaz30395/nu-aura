import { apiClient } from '../api/client';
import {
  ExitProcess,
  CreateExitProcessRequest,
  UpdateExitProcessRequest,
  ExitProcessesResponse,
  ExitStatus,
  ExitDashboard,
} from '../types/exit';

const BASE_URL = '/api/v1/exit';

export const exitService = {
  // Get all exit processes with pagination
  getAllExitProcesses: async (page = 0, size = 20): Promise<ExitProcessesResponse> => {
    const response = await apiClient.get<ExitProcessesResponse>(`${BASE_URL}/processes`, {
      params: { page, size },
    });
    return response.data;
  },

  // Get single exit process
  getExitProcess: async (id: string): Promise<ExitProcess> => {
    const response = await apiClient.get<ExitProcess>(`${BASE_URL}/processes/${id}`);
    return response.data;
  },

  // Get exit process by employee
  getExitProcessByEmployee: async (employeeId: string): Promise<ExitProcess> => {
    const response = await apiClient.get<ExitProcess>(`${BASE_URL}/processes/employee/${employeeId}`);
    return response.data;
  },

  // Get exit processes by status
  getExitProcessesByStatus: async (status: ExitStatus): Promise<ExitProcess[]> => {
    const response = await apiClient.get<ExitProcess[]>(`${BASE_URL}/processes/status/${status}`);
    return response.data;
  },

  // Create exit process
  createExitProcess: async (data: CreateExitProcessRequest): Promise<ExitProcess> => {
    const response = await apiClient.post<ExitProcess>(`${BASE_URL}/processes`, data);
    return response.data;
  },

  // Update exit process
  updateExitProcess: async (id: string, data: UpdateExitProcessRequest): Promise<ExitProcess> => {
    const response = await apiClient.put<ExitProcess>(`${BASE_URL}/processes/${id}`, data);
    return response.data;
  },

  // Update exit status
  updateExitStatus: async (id: string, status: ExitStatus): Promise<ExitProcess> => {
    const response = await apiClient.patch<ExitProcess>(`${BASE_URL}/processes/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  // Delete exit process
  deleteExitProcess: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/processes/${id}`);
  },

  // Get exit dashboard
  getDashboard: async (): Promise<ExitDashboard> => {
    const response = await apiClient.get<ExitDashboard>(`${BASE_URL}/dashboard`);
    return response.data;
  },
};
