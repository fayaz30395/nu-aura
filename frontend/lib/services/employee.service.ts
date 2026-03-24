import { apiClient } from '../api/client';
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  Page,
  EmployeeImportPreview,
  EmployeeImportResult,
  TalentProfile,
} from '../types/employee';

class EmployeeService {
  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    const response = await apiClient.post<Employee>('/employees', data);
    return response.data;
  }

  async getEmployee(id: string): Promise<Employee> {
    const response = await apiClient.get<Employee>(`/employees/${id}`);
    return response.data;
  }

  /** Fetch the authenticated user's own employee profile (no ID needed). */
  async getMyProfile(): Promise<Employee> {
    const response = await apiClient.get<Employee>('/employees/me');
    return response.data;
  }

  async getAllEmployees(
    page: number = 0,
    size: number = 20,
    sortBy: string = 'createdAt',
    sortDirection: 'ASC' | 'DESC' = 'DESC',
    search?: string,
    status?: string
  ): Promise<Page<Employee>> {
    // When a search query is present, use the dedicated search endpoint
    if (search && search.trim()) {
      const response = await apiClient.get<Page<Employee>>('/employees/search', {
        params: { query: search.trim(), page, size, status: status || undefined },
      });
      return response.data;
    }
    const response = await apiClient.get<Page<Employee>>('/employees', {
      params: { page, size, sortBy, sortDirection, status: status || undefined },
    });
    return response.data;
  }

  async searchEmployees(
    query: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<Employee>> {
    const response = await apiClient.get<Page<Employee>>('/employees/search', {
      params: { query, page, size },
    });
    return response.data;
  }

  async getEmployeeHierarchy(id: string): Promise<Employee> {
    const response = await apiClient.get<Employee>(`/employees/${id}/hierarchy`);
    return response.data;
  }

  async getSubordinates(id: string): Promise<Employee[]> {
    const response = await apiClient.get<Employee[]>(`/employees/${id}/subordinates`);
    return response.data;
  }

  async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
    const response = await apiClient.put<Employee>(`/employees/${id}`, data);
    return response.data;
  }

  async updateMyProfile(data: UpdateEmployeeRequest): Promise<Employee> {
    const response = await apiClient.put<Employee>('/employees/me', data);
    return response.data;
  }

  async deleteEmployee(id: string): Promise<void> {
    await apiClient.delete(`/employees/${id}`);
  }

  // Import methods
  async downloadCsvTemplate(): Promise<Blob> {
    const response = await apiClient.get<Blob>('/employees/import/template/csv', {
      responseType: 'blob',
    });
    return response.data;
  }

  async downloadExcelTemplate(): Promise<Blob> {
    const response = await apiClient.get<Blob>('/employees/import/template/xlsx', {
      responseType: 'blob',
    });
    return response.data;
  }

  async previewImport(file: File): Promise<EmployeeImportPreview> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<EmployeeImportPreview>(
      '/employees/import/preview',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async executeImport(file: File, skipInvalid: boolean = true): Promise<EmployeeImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<EmployeeImportResult>(
      `/employees/import/execute?skipInvalid=${skipInvalid}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * BUG-013 FIX: Fetch only employees with managerial levels (LEAD and above).
   * Used exclusively for manager-picker dropdowns — avoids fetching the entire
   * employee list when only a small managerial subset is needed.
   */
  async getManagers(): Promise<Employee[]> {
    const response = await apiClient.get<Employee[]>('/employees/managers');
    return response.data;
  }

  /**
   * Fetch employees who have the given manager assigned as a dotted-line manager.
   */
  async getDottedLineReports(managerId: string): Promise<Employee[]> {
    const response = await apiClient.get<Employee[]>(`/employees/${managerId}/dotted-reports`);
    return response.data;
  }

  async getTalentProfile(id: string): Promise<TalentProfile> {
    const response = await apiClient.get<TalentProfile>(`/employees/${id}/talent-profile`);
    return response.data;
  }
}

export const employeeService = new EmployeeService();
