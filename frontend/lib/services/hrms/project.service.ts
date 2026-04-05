import {apiClient} from '../../api/client';
import {wrapServiceCall} from '../../utils/service-error';
import {
  AssignEmployeeRequest,
  CreateProjectRequest,
  Project,
  ProjectEmployee,
  ProjectsResponse,
  UpdateProjectRequest
} from '../../types/hrms/project';

const SERVICE_NAME = 'ProjectService';

export const projectService = {
  /**
   * Get all projects with pagination and optional filters
   */
  getAllProjects: (page = 0, size = 20, status?: string, priority?: string): Promise<ProjectsResponse> =>
    wrapServiceCall(`${SERVICE_NAME}.getAllProjects`, async () => {
      const params: Record<string, unknown> = {page, size};
      if (status) params.status = status;
      if (priority) params.priority = priority;
      const response = await apiClient.get<ProjectsResponse>('/projects', {params});
      return response.data;
    }),

  /**
   * Search projects by query string
   */
  searchProjects: (query: string, page = 0, size = 20): Promise<ProjectsResponse> =>
    wrapServiceCall(`${SERVICE_NAME}.searchProjects`, async () => {
      const response = await apiClient.get<ProjectsResponse>('/projects/search', {
        params: {query, page, size},
      });
      return response.data;
    }),

  /**
   * Get a single project by ID
   */
  getProject: (id: string): Promise<Project> =>
    wrapServiceCall(`${SERVICE_NAME}.getProject`, async () => {
      const response = await apiClient.get<Project>(`/projects/${id}`);
      return response.data;
    }, {context: {projectId: id}}),

  /**
   * Create a new project
   */
  createProject: (data: CreateProjectRequest): Promise<Project> =>
    wrapServiceCall(`${SERVICE_NAME}.createProject`, async () => {
      const response = await apiClient.post<Project>('/projects', data);
      return response.data;
    }),

  /**
   * Update an existing project
   */
  updateProject: (id: string, data: UpdateProjectRequest): Promise<Project> =>
    wrapServiceCall(`${SERVICE_NAME}.updateProject`, async () => {
      const response = await apiClient.put<Project>(`/projects/${id}`, data);
      return response.data;
    }, {context: {projectId: id}}),

  /**
   * Delete a project
   */
  deleteProject: (id: string): Promise<void> =>
    wrapServiceCall(`${SERVICE_NAME}.deleteProject`, async () => {
      await apiClient.delete(`/projects/${id}`);
    }, {context: {projectId: id}}),

  /**
   * Assign an employee to a project
   */
  assignEmployee: (projectId: string, data: AssignEmployeeRequest): Promise<ProjectEmployee> =>
    wrapServiceCall(`${SERVICE_NAME}.assignEmployee`, async () => {
      const response = await apiClient.post<ProjectEmployee>(`/projects/${projectId}/assign`, data);
      return response.data;
    }, {context: {projectId, employeeId: data.employeeId}}),

  /**
   * Remove an employee from a project
   */
  removeEmployee: (projectId: string, employeeId: string): Promise<void> =>
    wrapServiceCall(`${SERVICE_NAME}.removeEmployee`, async () => {
      await apiClient.delete(`/projects/${projectId}/employees/${employeeId}`);
    }, {context: {projectId, employeeId}}),

  /**
   * Get all team members for a project
   */
  getTeamMembers: (projectId: string): Promise<ProjectEmployee[]> =>
    wrapServiceCall(`${SERVICE_NAME}.getTeamMembers`, async () => {
      const response = await apiClient.get<ProjectEmployee[]>(`/projects/${projectId}/team`);
      return response.data;
    }, {context: {projectId}}),

  /**
   * Get all projects an employee is assigned to
   */
  getEmployeeProjects: (employeeId: string): Promise<ProjectEmployee[]> =>
    wrapServiceCall(`${SERVICE_NAME}.getEmployeeProjects`, async () => {
      const response = await apiClient.get<ProjectEmployee[]>(`/projects/employee/${employeeId}`);
      return response.data;
    }, {context: {employeeId}}),

  /**
   * Get employee's allocations across all projects (with allocation percentages)
   */
  getEmployeeAllocations: (employeeId: string): Promise<ProjectEmployee[]> =>
    wrapServiceCall(`${SERVICE_NAME}.getEmployeeAllocations`, async () => {
      const response = await apiClient.get<ProjectEmployee[]>(`/projects/employee/${employeeId}/allocations`);
      return response.data;
    }, {context: {employeeId}}),
};
