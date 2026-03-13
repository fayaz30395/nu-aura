// Task Status enum
export type TaskStatus =
  | 'BACKLOG'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'BLOCKED'
  | 'DONE'
  | 'CANCELLED';

// Task Priority enum
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Task Type enum
export type TaskType =
  | 'EPIC'
  | 'STORY'
  | 'TASK'
  | 'SUBTASK'
  | 'BUG'
  | 'FEATURE'
  | 'IMPROVEMENT'
  | 'MILESTONE';

// Full Task Response
export interface Task {
  id: string;
  taskCode: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  assigneeId?: string;
  assigneeName?: string;
  reporterId?: string;
  reporterName?: string;
  parentTaskId?: string;
  milestoneId?: string;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  progressPercentage?: number;
  storyPoints?: number;
  sprintName?: string;
  sortOrder?: number;
  tags?: string;
  color?: string;
  isOverdue: boolean;
  isSubtask: boolean;
  subtaskCount?: number;
  commentCount?: number;
  createdAt: string;
  updatedAt?: string;
}

// Lightweight Task for list views
export interface TaskListItem {
  id: string;
  taskCode: string;
  projectId?: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  assigneeName?: string;
  startDate?: string;
  dueDate?: string;
  progressPercentage?: number;
  color?: string;
  isOverdue: boolean;
  isSubtask: boolean;
  parentTaskId?: string;
  estimatedHours?: number;
  actualHours?: number;
}

// Create Task Request
export interface CreateTaskRequest {
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  type?: TaskType;
  assigneeId?: string;
  assigneeName?: string;
  reporterId?: string;
  reporterName?: string;
  parentTaskId?: string;
  milestoneId?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  storyPoints?: number;
  sprintName?: string;
  tags?: string;
  color?: string;
}

// Update Task Request
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  assigneeId?: string;
  assigneeName?: string;
  milestoneId?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  progressPercentage?: number;
  storyPoints?: number;
  sprintName?: string;
  sortOrder?: number;
  tags?: string;
  color?: string;
}

// Status Update Request
export interface TaskStatusUpdateRequest {
  status: TaskStatus;
}

// Assign Task Request
export interface TaskAssignRequest {
  assigneeId: string;
  assigneeName: string;
}

// Log Time Request
export interface TaskLogTimeRequest {
  hours: number;
  description?: string;
}

// Paginated Response
export interface TasksPageResponse {
  content: TaskListItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// Task Filter Options
export interface TaskFilterOptions {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

// Utility constants
export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'BACKLOG', label: 'Backlog', color: 'bg-gray-100 text-gray-700 dark:bg-surface-800 dark:text-gray-300' },
  { value: 'TODO', label: 'To Do', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'IN_REVIEW', label: 'In Review', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'BLOCKED', label: 'Blocked', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  { value: 'DONE', label: 'Done', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-gray-200 text-gray-500 dark:bg-surface-700 dark:text-gray-400' },
];

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-600 dark:bg-surface-800 dark:text-gray-400' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' },
];

export const TASK_TYPE_OPTIONS: { value: TaskType; label: string; icon: string }[] = [
  { value: 'EPIC', label: 'Epic', icon: '⚡' },
  { value: 'STORY', label: 'Story', icon: '📖' },
  { value: 'TASK', label: 'Task', icon: '✓' },
  { value: 'SUBTASK', label: 'Subtask', icon: '↳' },
  { value: 'BUG', label: 'Bug', icon: '🐛' },
  { value: 'FEATURE', label: 'Feature', icon: '✨' },
  { value: 'IMPROVEMENT', label: 'Improvement', icon: '📈' },
];

// Helper functions
export function getStatusColor(status: TaskStatus): string {
  return TASK_STATUS_OPTIONS.find(s => s.value === status)?.color || TASK_STATUS_OPTIONS[0].color;
}

export function getPriorityColor(priority: TaskPriority): string {
  return TASK_PRIORITY_OPTIONS.find(p => p.value === priority)?.color || TASK_PRIORITY_OPTIONS[0].color;
}

export function getTypeIcon(type: TaskType): string {
  return TASK_TYPE_OPTIONS.find(t => t.value === type)?.icon || '✓';
}

export function getStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_OPTIONS.find(s => s.value === status)?.label || status;
}

export function getPriorityLabel(priority: TaskPriority): string {
  return TASK_PRIORITY_OPTIONS.find(p => p.value === priority)?.label || priority;
}

export function getTypeLabel(type: TaskType): string {
  return TASK_TYPE_OPTIONS.find(t => t.value === type)?.label || type;
}
