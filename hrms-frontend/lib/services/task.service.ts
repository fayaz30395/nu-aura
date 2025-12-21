import { apiClient } from '@/lib/api/client';
import {
  Task,
  TaskListItem,
  TasksPageResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskStatusUpdateRequest,
  TaskAssignRequest,
  TaskLogTimeRequest,
  TaskFilterOptions,
  TaskStatus,
  TaskPriority,
} from '@/lib/types/task';

const BASE_URL = '/pm/tasks';

export const taskService = {
  // Create a new task
  async createTask(request: CreateTaskRequest): Promise<Task> {
    const response = await apiClient.post<Task>(BASE_URL, request);
    return response.data;
  },

  // Update an existing task
  async updateTask(id: string, request: UpdateTaskRequest): Promise<Task> {
    const response = await apiClient.put<Task>(`${BASE_URL}/${id}`, request);
    return response.data;
  },

  // Get task by ID
  async getTask(id: string): Promise<Task> {
    const response = await apiClient.get<Task>(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Get task by task code (e.g., PROJ-001)
  async getTaskByCode(taskCode: string): Promise<Task> {
    const response = await apiClient.get<Task>(`${BASE_URL}/code/${taskCode}`);
    return response.data;
  },

  // List tasks in a project with filters
  async getProjectTasks(
    projectId: string,
    options: TaskFilterOptions = {}
  ): Promise<TasksPageResponse> {
    const params = new URLSearchParams();

    if (options.status) params.append('status', options.status);
    if (options.priority) params.append('priority', options.priority);
    if (options.assigneeId) params.append('assigneeId', options.assigneeId);
    if (options.search) params.append('search', options.search);
    if (options.page !== undefined) params.append('page', options.page.toString());
    if (options.size !== undefined) params.append('size', options.size.toString());
    if (options.sort) params.append('sort', options.sort);

    const queryString = params.toString();
    const url = `${BASE_URL}/project/${projectId}${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<TasksPageResponse>(url);
    return response.data;
  },

  // List tasks assigned to a user
  async getAssigneeTasks(
    assigneeId: string,
    page: number = 0,
    size: number = 50
  ): Promise<TasksPageResponse> {
    const response = await apiClient.get<TasksPageResponse>(
      `${BASE_URL}/assignee/${assigneeId}?page=${page}&size=${size}`
    );
    return response.data;
  },

  // Get all tasks with pagination
  async getAllTasks(page: number = 0, size: number = 50): Promise<TasksPageResponse> {
    const response = await apiClient.get<TasksPageResponse>(`${BASE_URL}?page=${page}&size=${size}`);
    return response.data;
  },

  // Get subtasks of a parent task
  async getSubtasks(parentTaskId: string): Promise<Task[]> {
    const response = await apiClient.get<Task[]>(`${BASE_URL}/${parentTaskId}/subtasks`);
    return response.data;
  },

  // Get tasks in a milestone
  async getMilestoneTasks(milestoneId: string): Promise<TaskListItem[]> {
    const response = await apiClient.get<TaskListItem[]>(`${BASE_URL}/milestone/${milestoneId}`);
    return response.data;
  },

  // Delete a task
  async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },

  // Update task status
  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    const request: TaskStatusUpdateRequest = { status };
    const response = await apiClient.patch<Task>(`${BASE_URL}/${id}/status`, request);
    return response.data;
  },

  // Assign task to a user
  async assignTask(id: string, assigneeId: string, assigneeName: string): Promise<Task> {
    const request: TaskAssignRequest = { assigneeId, assigneeName };
    const response = await apiClient.patch<Task>(`${BASE_URL}/${id}/assign`, request);
    return response.data;
  },

  // Log time on a task
  async logTime(id: string, hours: number, description?: string): Promise<Task> {
    const request: TaskLogTimeRequest = { hours, description };
    const response = await apiClient.post<Task>(`${BASE_URL}/${id}/log-time`, request);
    return response.data;
  },

  // Helper: Group tasks by status (for Kanban view)
  groupTasksByStatus(tasks: TaskListItem[]): Record<TaskStatus, TaskListItem[]> {
    const grouped: Record<TaskStatus, TaskListItem[]> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      BLOCKED: [],
      DONE: [],
      CANCELLED: [],
    };

    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  },

  // Helper: Get priority badge style
  getPriorityBadge(priority: TaskPriority): { bg: string; text: string } {
    const badges: Record<TaskPriority, { bg: string; text: string }> = {
      LOW: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
      MEDIUM: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-400' },
      HIGH: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-600 dark:text-orange-400' },
      CRITICAL: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-600 dark:text-red-400' },
    };
    return badges[priority] || badges.MEDIUM;
  },

  // Helper: Get status badge style
  getStatusBadge(status: TaskStatus): { bg: string; text: string } {
    const badges: Record<TaskStatus, { bg: string; text: string }> = {
      BACKLOG: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
      TODO: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
      IN_PROGRESS: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
      IN_REVIEW: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
      BLOCKED: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
      DONE: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
      CANCELLED: { bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400' },
    };
    return badges[status] || badges.TODO;
  },

  // Helper: Format date for display
  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  },

  // Helper: Format date for input fields
  formatDateForInput(dateString?: string): string {
    if (!dateString) return '';
    return dateString.split('T')[0];
  },

  // Helper: Check if task is overdue
  isTaskOverdue(task: TaskListItem | Task): boolean {
    if (task.isOverdue) return true;
    if (!task.dueDate) return false;
    if (task.status === 'DONE' || task.status === 'CANCELLED') return false;
    return new Date(task.dueDate) < new Date();
  },
};
