import { apiClient } from '../api/client';
import {
  HrmsProject,
  ProjectCreateRequest,
  ProjectPage,
  ProjectStatus,
  ProjectType,
} from '../types/hrms-project';

interface ProjectListFilters {
  status?: ProjectStatus;
  type?: ProjectType;
  ownerId?: string;
  search?: string;
}

export const hrmsProjectService = {
  async listProjects(page = 0, size = 20, filters: ProjectListFilters = {}): Promise<ProjectPage> {
    const params: Record<string, string | number> = { page, size };
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    if (filters.ownerId) params.ownerId = filters.ownerId;
    if (filters.search) params.search = filters.search;
    const response = await apiClient.get<ProjectPage>('/projects', { params });
    return response.data;
  },

  async createProject(request: ProjectCreateRequest): Promise<HrmsProject> {
    const response = await apiClient.post<HrmsProject>('/projects', request);
    return response.data;
  },

  async getProject(id: string): Promise<HrmsProject> {
    const response = await apiClient.get<HrmsProject>(`/projects/${id}`);
    return response.data;
  },

  async activateProject(id: string): Promise<HrmsProject> {
    const response = await apiClient.post<HrmsProject>(`/projects/${id}/activate`);
    return response.data;
  },

  async closeProject(id: string, closeDate?: string): Promise<HrmsProject> {
    const response = await apiClient.post<HrmsProject>(`/projects/${id}/close`, closeDate ? { closeDate } : undefined);
    return response.data;
  },

  async exportProjects(filters: ProjectListFilters = {}): Promise<Blob> {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    if (filters.ownerId) params.ownerId = filters.ownerId;
    if (filters.search) params.search = filters.search;
    const response = await apiClient.get<Blob>('/projects/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
