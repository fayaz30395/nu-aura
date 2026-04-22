import {apiClient} from '@/lib/api/client';
import {wrapServiceCall} from '@/lib/utils/service-error';
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
} from '@/lib/types/core/task';

// STUB: Backend endpoint not implemented — do not call.
// No TaskController exists at /pm/tasks in the backend. The modules/pm/ directory
// exists but is not wired to the Spring Boot application. These methods will return 404.
// When the backend endpoint is implemented, remove this comment.
const BASE_URL = '/pm/tasks';
const SERVICE_NAME = 'TaskService';

export const taskService = {
  /**
   * Create a new task
   */
  createTask: (request: CreateTaskRequest): Promise<Task> =>
    wrapServiceCall(`${SERVICE_NAME}.createTask`, async () => {
      const response = await apiClient.post<Task>(BASE_URL, request);
      return response.data;
    }),

  /**
   * Update an existing task
   */
  updateTask: (id: string, request: UpdateTaskRequest): Promise<Task> =>
    wrapServiceCall(`${SERVICE_NAME}.updateTask`, async () => {
      const response = await apiClient.put<Task>(`${BASE_URL}/${id}`, request);
      return response.data;
    }, {context: {taskId: id}}),

  /**
   * Get task by ID
   */
  getTask: (id: string): Promise<Task> =>
    wrapServiceCall(`${SERVICE_NAME}.getTask`, async () => {
      const response = await apiClient.get<Task>(`${BASE_URL}/${id}`);
      return response.data;
    }, {context: {taskId: id}}),

  /**
   * Get task by task code (e.g., PROJ-001)
   */
  getTaskByCode: (taskCode: string): Promise<Task> =>
    wrapServiceCall(`${SERVICE_NAME}.getTaskByCode`, async () => {
      const response = await apiClient.get<Task>(`${BASE_URL}/code/${taskCode}`);
      return response.data;
    }, {context: {taskCode}}),

  /**
   * List tasks in a project with filters
   */
  getProjectTasks: (projectId: string, options: TaskFilterOptions = {}): Promise<TasksPageResponse> =>
    wrapServiceCall(`${SERVICE_NAME}.getProjectTasks`, async () => {
      const params: Record<string, unknown> = {};

      if (options.status) params.status = options.status;
      if (options.priority) params.priority = options.priority;
      if (options.assigneeId) params.assigneeId = options.assigneeId;
      if (options.search) params.search = options.search;
      if (options.page !== undefined) params.page = options.page;
      if (options.size !== undefined) params.size = options.size;
      if (options.sort) params.sort = options.sort;

      const hasParams = Object.keys(params).length > 0;
      const response = await apiClient.get<TasksPageResponse>(
        `${BASE_URL}/project/${projectId}`,
        hasParams ? {params} : undefined
      );
      return response.data;
    }, {context: {projectId}}),

  /**
   * List tasks assigned to a user
   */
  getAssigneeTasks: (assigneeId: string, page = 0, size = 50): Promise<TasksPageResponse> =>
    wrapServiceCall(`${SERVICE_NAME}.getAssigneeTasks`, async () => {
      const response = await apiClient.get<TasksPageResponse>(
        `${BASE_URL}/assignee/${assigneeId}`, {params: {page, size}}
      );
      return response.data;
    }, {context: {assigneeId}}),

  /**
   * Get all tasks with pagination
   */
  getAllTasks: (page = 0, size = 50): Promise<TasksPageResponse> =>
    wrapServiceCall(`${SERVICE_NAME}.getAllTasks`, async () => {
      const response = await apiClient.get<TasksPageResponse>(BASE_URL, {params: {page, size}});
      return response.data;
    }),

  /**
   * Get subtasks of a parent task
   */
  getSubtasks: (parentTaskId: string): Promise<Task[]> =>
    wrapServiceCall(`${SERVICE_NAME}.getSubtasks`, async () => {
      const response = await apiClient.get<Task[]>(`${BASE_URL}/${parentTaskId}/subtasks`);
      return response.data;
    }, {context: {parentTaskId}}),

  /**
   * Get tasks in a milestone
   */
  getMilestoneTasks: (milestoneId: string): Promise<TaskListItem[]> =>
    wrapServiceCall(`${SERVICE_NAME}.getMilestoneTasks`, async () => {
      const response = await apiClient.get<TaskListItem[]>(`${BASE_URL}/milestone/${milestoneId}`);
      return response.data;
    }, {context: {milestoneId}}),

  /**
   * Delete a task
   */
  deleteTask: (id: string): Promise<void> =>
    wrapServiceCall(`${SERVICE_NAME}.deleteTask`, async () => {
      await apiClient.delete(`${BASE_URL}/${id}`);
    }, {context: {taskId: id}}),

  /**
   * Update task status
   */
  updateTaskStatus: (id: string, status: TaskStatus): Promise<Task> =>
    wrapServiceCall(`${SERVICE_NAME}.updateTaskStatus`, async () => {
      const request: TaskStatusUpdateRequest = {status};
      const response = await apiClient.patch<Task>(`${BASE_URL}/${id}/status`, request);
      return response.data;
    }, {context: {taskId: id, newStatus: status}}),

  /**
   * Assign task to a user
   */
  assignTask: (id: string, assigneeId: string, assigneeName: string): Promise<Task> =>
    wrapServiceCall(`${SERVICE_NAME}.assignTask`, async () => {
      const request: TaskAssignRequest = {assigneeId, assigneeName};
      const response = await apiClient.patch<Task>(`${BASE_URL}/${id}/assign`, request);
      return response.data;
    }, {context: {taskId: id, assigneeId}}),

  /**
   * Log time on a task
   */
  logTime: (id: string, hours: number, description?: string): Promise<Task> =>
    wrapServiceCall(`${SERVICE_NAME}.logTime`, async () => {
      const request: TaskLogTimeRequest = {hours, description};
      const response = await apiClient.post<Task>(`${BASE_URL}/${id}/log-time`, request);
      return response.data;
    }, {context: {taskId: id, hours}}),

  // ============================================================
  // Helper methods (synchronous, no API calls - no error handling needed)
  // ============================================================

  /**
   * Group tasks by status (for Kanban view)
   */
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

  /**
   * Get priority badge style
   */
  getPriorityBadge(priority: TaskPriority): { bg: string; text: string } {
    const badges: Record<TaskPriority, { bg: string; text: string }> = {
      LOW: {bg: "bg-[var(--bg-surface)]", text: 'text-[var(--text-secondary)]'},
      MEDIUM: {bg: "bg-accent-subtle", text: "text-accent"},
      HIGH: {bg: "bg-status-warning-bg", text: "text-status-warning-text"},
      CRITICAL: {bg: "bg-status-danger-bg", text: "text-status-danger-text"},
    };
    return badges[priority] || badges.MEDIUM;
  },

  /**
   * Get status badge style
   */
  getStatusBadge(status: TaskStatus): { bg: string; text: string } {
    const badges: Record<TaskStatus, { bg: string; text: string }> = {
      BACKLOG: {bg: 'bg-[var(--bg-surface)]', text: 'text-[var(--text-secondary)]'},
      TODO: {bg: 'bg-[var(--bg-surface)]', text: 'text-[var(--text-secondary)]'},
      IN_PROGRESS: {bg: "bg-accent-subtle", text: "text-accent"},
      IN_REVIEW: {bg: "bg-accent-subtle", text: "text-accent"},
      BLOCKED: {bg: "bg-status-danger-bg", text: "text-status-danger-text"},
      DONE: {bg: "bg-status-success-bg", text: "text-status-success-text"},
      CANCELLED: {bg: 'bg-[var(--bg-surface)]', text: 'text-[var(--text-muted)]'},
    };
    return badges[status] || badges.TODO;
  },

  /**
   * Format date for display
   */
  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  },

  /**
   * Format date for input fields
   */
  formatDateForInput(dateString?: string): string {
    if (!dateString) return '';
    return dateString.split('T')[0];
  },

  /**
   * Check if task is overdue
   */
  isTaskOverdue(task: TaskListItem | Task): boolean {
    if (task.isOverdue) return true;
    if (!task.dueDate) return false;
    if (task.status === 'DONE' || task.status === 'CANCELLED') return false;
    return new Date(task.dueDate) < new Date();
  },
};
