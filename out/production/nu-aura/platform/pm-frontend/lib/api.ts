import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to HRMS login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = process.env.NEXT_PUBLIC_HRMS_URL || 'http://localhost:3000';
      }
    }
    return Promise.reject(error);
  }
);

// Project API
export const projectApi = {
  list: (params?: { status?: string; search?: string; page?: number; size?: number }) =>
    api.get('/projects', { params }),
  getById: (id: string) => api.get(`/projects/${id}`),
  getByCode: (code: string) => api.get(`/projects/code/${code}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  start: (id: string) => api.post(`/projects/${id}/start`),
  complete: (id: string) => api.post(`/projects/${id}/complete`),
  archive: (id: string) => api.post(`/projects/${id}/archive`),
  getStatistics: () => api.get('/projects/statistics'),
};

// Task API
export const taskApi = {
  listByProject: (projectId: string, params?: any) =>
    api.get(`/tasks/project/${projectId}`, { params }),
  listByAssignee: (assigneeId: string, params?: any) =>
    api.get(`/tasks/assignee/${assigneeId}`, { params }),
  listByMilestone: (milestoneId: string) =>
    api.get(`/tasks/milestone/${milestoneId}`),
  getById: (id: string) => api.get(`/tasks/${id}`),
  getByCode: (code: string) => api.get(`/tasks/code/${code}`),
  getSubtasks: (id: string) => api.get(`/tasks/${id}/subtasks`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/tasks/${id}/status`, { status }),
  assign: (id: string, assigneeId: string, assigneeName: string) =>
    api.patch(`/tasks/${id}/assign`, { assigneeId, assigneeName }),
  logTime: (id: string, hours: number) =>
    api.post(`/tasks/${id}/log-time`, { hours }),
};

// Milestone API
export const milestoneApi = {
  listByProject: (projectId: string) =>
    api.get(`/milestones/project/${projectId}`),
  getById: (id: string) => api.get(`/milestones/${id}`),
  create: (data: any) => api.post('/milestones', data),
  update: (id: string, data: any) => api.put(`/milestones/${id}`, data),
  delete: (id: string) => api.delete(`/milestones/${id}`),
  start: (id: string) => api.post(`/milestones/${id}/start`),
  complete: (id: string) => api.post(`/milestones/${id}/complete`),
};

// Member API
export const memberApi = {
  listByProject: (projectId: string) =>
    api.get(`/members/project/${projectId}`),
  getById: (id: string) => api.get(`/members/${id}`),
  add: (data: any) => api.post('/members', data),
  update: (id: string, data: any) => api.put(`/members/${id}`, data),
  remove: (id: string) => api.delete(`/members/${id}`),
  changeRole: (id: string, role: string) =>
    api.patch(`/members/${id}/role`, null, { params: { role } }),
  getProjectsByUser: (userId: string) =>
    api.get(`/members/user/${userId}/projects`),
};

// Comment API
export const commentApi = {
  listByTask: (taskId: string, params?: any) =>
    api.get(`/comments/task/${taskId}`, { params }),
  listByProject: (projectId: string, params?: any) =>
    api.get(`/comments/project/${projectId}`, { params }),
  getById: (id: string) => api.get(`/comments/${id}`),
  create: (data: any, userId: string, userName: string) =>
    api.post('/comments', data, {
      headers: { 'X-User-Id': userId, 'X-User-Name': userName },
    }),
  update: (id: string, content: string, userId: string) =>
    api.put(`/comments/${id}`, { content }, {
      headers: { 'X-User-Id': userId },
    }),
  delete: (id: string, userId: string) =>
    api.delete(`/comments/${id}`, {
      headers: { 'X-User-Id': userId },
    }),
};
