import {apiClient} from '../../api/client';
import {logger} from '@/lib/utils/logger';
import {
  HrmsProject,
  ProjectCreateRequest,
  ProjectPage,
  ProjectStatus,
  ProjectType,
  ProjectUpdateRequest,
} from '../../types/hrms/hrms-project';

interface ProjectListFilters {
  status?: ProjectStatus;
  priority?: string;
  type?: ProjectType;
  ownerId?: string;
  search?: string;
}

export const hrmsProjectService = {
  async listProjects(page = 0, size = 20, filters: ProjectListFilters = {}): Promise<ProjectPage> {
    try {
      const params: Record<string, string | number> = {page, size};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.type) params.type = filters.type;
      if (filters.ownerId) params.ownerId = filters.ownerId;
      if (filters.search) params.search = filters.search;
      const response = await apiClient.get<ProjectPage>('/projects', {params});
      return response.data;
    } catch (error) {
      logger.error('Failed to list projects:', error);
      throw error;
    }
  },

  async createProject(request: ProjectCreateRequest): Promise<HrmsProject> {
    try {
      const response = await apiClient.post<HrmsProject>('/projects', request);
      return response.data;
    } catch (error) {
      logger.error('Failed to create project:', error);
      throw error;
    }
  },

  async updateProject(id: string, request: ProjectUpdateRequest): Promise<HrmsProject> {
    try {
      const response = await apiClient.put<HrmsProject>(`/projects/${id}`, request);
      return response.data;
    } catch (error) {
      logger.error('Failed to update project:', error);
      throw error;
    }
  },

  async getProject(id: string): Promise<HrmsProject> {
    try {
      const response = await apiClient.get<HrmsProject>(`/projects/${id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get project:', error);
      throw error;
    }
  },

  async activateProject(id: string): Promise<HrmsProject> {
    try {
      const response = await apiClient.post<HrmsProject>(`/projects/${id}/activate`);
      return response.data;
    } catch (error) {
      logger.error('Failed to activate project:', error);
      throw error;
    }
  },

  async closeProject(id: string, closeDate?: string): Promise<HrmsProject> {
    try {
      const response = await apiClient.post<HrmsProject>(`/projects/${id}/close`, closeDate ? {closeDate} : undefined);
      return response.data;
    } catch (error) {
      logger.error('Failed to close project:', error);
      throw error;
    }
  },

  async exportProjects(filters: ProjectListFilters = {}): Promise<Blob> {
    try {
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.type) params.type = filters.type;
      if (filters.ownerId) params.ownerId = filters.ownerId;
      if (filters.search) params.search = filters.search;
      const response = await apiClient.get<Blob>('/projects/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to export projects:', error);
      throw error;
    }
  },
};
