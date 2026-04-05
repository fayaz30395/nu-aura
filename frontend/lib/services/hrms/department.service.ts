import {apiClient} from '../../api/client';
import {Department, DepartmentRequest, Page} from '../../types/hrms/employee';

export const departmentService = {
  // Get all departments with pagination
  getAllDepartments: async (page = 0, size = 20): Promise<Page<Department>> => {
    const response = await apiClient.get<Page<Department>>('/departments', {
      params: {page, size},
    });
    return response.data;
  },

  // Get active departments only
  getActiveDepartments: async (): Promise<Department[]> => {
    const response = await apiClient.get<Department[]>('/departments/active');
    return response.data;
  },

  // Get department hierarchy (tree structure)
  getDepartmentHierarchy: async (): Promise<Department[]> => {
    const response = await apiClient.get<Department[]>('/departments/hierarchy');
    return response.data;
  },

  // Get single department by ID
  getDepartment: async (id: string): Promise<Department> => {
    const response = await apiClient.get<Department>(`/departments/${id}`);
    return response.data;
  },

  // Search departments
  searchDepartments: async (query: string, page = 0, size = 20): Promise<Page<Department>> => {
    const response = await apiClient.get<Page<Department>>('/departments/search', {
      params: {query, page, size},
    });
    return response.data;
  },

  // Create new department
  createDepartment: async (data: DepartmentRequest): Promise<Department> => {
    const response = await apiClient.post<Department>('/departments', data);
    return response.data;
  },

  // Update department
  updateDepartment: async (id: string, data: DepartmentRequest): Promise<Department> => {
    const response = await apiClient.put<Department>(`/departments/${id}`, data);
    return response.data;
  },

  // Activate department
  activateDepartment: async (id: string): Promise<Department> => {
    const response = await apiClient.patch<Department>(`/departments/${id}/activate`);
    return response.data;
  },

  // Deactivate department
  deactivateDepartment: async (id: string): Promise<Department> => {
    const response = await apiClient.patch<Department>(`/departments/${id}/deactivate`);
    return response.data;
  },

  // Delete department
  deleteDepartment: async (id: string): Promise<void> => {
    await apiClient.delete(`/departments/${id}`);
  },
};
