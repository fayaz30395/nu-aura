import { apiClient } from '../api/client';
import {
  Project,
  ProjectEmployee,
  CreateProjectRequest,
  UpdateProjectRequest,
  AssignEmployeeRequest,
  ProjectsResponse
} from '../types/project';

export const projectService = {
  // Get all projects with pagination
  getAllProjects: async (page = 0, size = 20, status?: string, priority?: string): Promise<ProjectsResponse> => {
    const params: any = { page, size };
    if (status) params.status = status;
    if (priority) params.priority = priority;
    const response = await apiClient.get<ProjectsResponse>('/projects', { params });
    return response.data;
  },

  // Search projects
  searchProjects: async (query: string, page = 0, size = 20): Promise<ProjectsResponse> => {
    const response = await apiClient.get<ProjectsResponse>('/projects/search', {
      params: { query, page, size },
    });
    return response.data;
  },

  // Get single project
  getProject: async (id: string): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  // Create project
  createProject: async (data: CreateProjectRequest): Promise<Project> => {
    const response = await apiClient.post<Project>('/projects', data);
    return response.data;
  },

  // Update project
  updateProject: async (id: string, data: UpdateProjectRequest): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  // Delete project
  deleteProject: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  // Assign employee to project
  assignEmployee: async (projectId: string, data: AssignEmployeeRequest): Promise<ProjectEmployee> => {
    const response = await apiClient.post<ProjectEmployee>(`/projects/${projectId}/assign`, data);
    return response.data;
  },

  // Remove employee from project
  removeEmployee: async (projectId: string, employeeId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/employees/${employeeId}`);
  },

  // Get project team members
  getTeamMembers: async (projectId: string): Promise<ProjectEmployee[]> => {
    const response = await apiClient.get<ProjectEmployee[]>(`/projects/${projectId}/team`);
    return response.data;
  },

  // Get employee's projects
  getEmployeeProjects: async (employeeId: string): Promise<ProjectEmployee[]> => {
    const response = await apiClient.get<ProjectEmployee[]>(`/projects/employee/${employeeId}`);
    return response.data;
  },
};
