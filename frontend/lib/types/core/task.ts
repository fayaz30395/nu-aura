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
  {value: 'BACKLOG', label: 'Backlog', color: 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'},
  {value: 'TODO', label: 'To Do', color: 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'},
  {
    value: 'IN_PROGRESS',
    label: 'In Progress',
    color: "bg-accent-subtle text-accent"
  },
  {
    value: 'IN_REVIEW',
    label: 'In Review',
    color: "bg-accent-subtle text-accent"
  },
  {value: 'BLOCKED', label: 'Blocked', color: "bg-status-danger-bg text-status-danger-text"},
  {value: 'DONE', label: 'Done', color: "bg-status-success-bg text-status-success-text"},
  {value: 'CANCELLED', label: 'Cancelled', color: 'bg-[var(--bg-surface)] text-[var(--text-muted)]'},
];

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  {value: 'LOW', label: 'Low', color: 'bg-[var(--bg-surface)] text-[var(--text-muted)]'},
  {value: 'MEDIUM', label: 'Medium', color: "bg-accent-subtle text-accent"},
  {value: 'HIGH', label: 'High', color: "bg-status-warning-bg text-status-warning-text"},
  {
    value: 'CRITICAL',
    label: 'Critical',
    color: "bg-status-danger-bg text-status-danger-text"
  },
];

export const TASK_TYPE_OPTIONS: { value: TaskType; label: string; icon: string }[] = [
  {value: 'EPIC', label: 'Epic', icon: '⚡'},
  {value: 'STORY', label: 'Story', icon: '📖'},
  {value: 'TASK', label: 'Task', icon: '✓'},
  {value: 'SUBTASK', label: 'Subtask', icon: '↳'},
  {value: 'BUG', label: 'Bug', icon: '🐛'},
  {value: 'FEATURE', label: 'Feature', icon: '✨'},
  {value: 'IMPROVEMENT', label: 'Improvement', icon: '📈'},
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
