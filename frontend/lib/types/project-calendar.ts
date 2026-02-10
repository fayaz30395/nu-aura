// Calendar Event Types
export type CalendarViewType = 'month' | 'week' | 'day';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'project' | 'task' | 'milestone' | 'deadline';
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  description?: string;
  status: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  color: string;
  assignees?: CalendarEventAssignee[];
}

export interface CalendarEventAssignee {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

// Gantt Chart Types
export interface GanttTask {
  id: string;
  name: string;
  type: 'project' | 'task' | 'milestone' | 'phase';
  startDate: Date;
  endDate: Date;
  duration?: number;
  progress: number;
  status: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  color: string;
  projectId?: string;
  parentTaskId?: string;
  dependencies?: TaskDependency[];
  assignees?: ResourceAllocation[];
  estimatedHours?: number;
  actualHours?: number;
}

export interface TaskDependency {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
  lag?: number;
}

export interface ResourceAllocation {
  id: string;
  employeeId: string;
  employeeName: string;
  avatar?: string;
  role?: string;
  allocationPercentage: number;
  startDate: Date;
  endDate?: Date;
}

// Timeline and View Configuration
export interface TimelineConfig {
  zoomLevel: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: Date;
  endDate: Date;
  showWeekends?: boolean;
  showToday?: boolean;
}

export interface GanttViewConfig {
  showCriticalPath?: boolean;
  showDependencies?: boolean;
  showProgress?: boolean;
  showResources?: boolean;
  groupBy?: 'project' | 'status' | 'priority' | 'assignee' | 'none';
  sortBy?: 'startDate' | 'endDate' | 'priority' | 'name' | 'progress';
  sortDirection?: 'asc' | 'desc';
}

// Filter Options
export interface CalendarFilterOptions {
  projectIds?: string[];
  statuses?: string[];
  priorities?: string[];
  assigneeIds?: string[];
  eventTypes?: ('project' | 'task' | 'milestone' | 'deadline')[];
  dateRange?: { start: Date; end: Date };
}

export interface GanttFilterOptions {
  projectIds?: string[];
  statuses?: string[];
  priorities?: string[];
  assigneeIds?: string[];
  showOnlyDelayed?: boolean;
  showOnlyAtRisk?: boolean;
}

// Statistics
export interface CalendarStatistics {
  totalEvents: number;
  totalProjects: number;
  totalTasks: number;
  totalMilestones: number;
  upcomingDeadlines: number;
  overdueItems: number;
  completionRate: number;
}

export interface GanttStatistics {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  delayedTasks: number;
  atRiskTasks: number;
  averageProgress: number;
}

// Color constants
export const CALENDAR_EVENT_COLORS = {
  project: '#3b82f6',
  task: '#8b5cf6',
  milestone: '#f59e0b',
  deadline: '#ef4444',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  ON_HOLD: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
  BACKLOG: '#6b7280',
  TODO: '#64748b',
  IN_REVIEW: '#8b5cf6',
  BLOCKED: '#dc2626',
  DONE: '#059669',
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#fb923c',
  HIGH: '#ef4444',
  URGENT: '#dc2626',
  CRITICAL: '#991b1b',
};

// Helper functions
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#6b7280';
}

export function getPriorityColor(priority: string): string {
  return PRIORITY_COLORS[priority] || '#6b7280';
}

export function calculateTaskDuration(startDate: Date, endDate: Date): number {
  const diff = endDate.getTime() - startDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isTaskDelayed(task: GanttTask): boolean {
  const today = new Date();
  return task.endDate < today && task.progress < 100;
}

export function isTaskAtRisk(task: GanttTask): boolean {
  const today = new Date();
  const duration = calculateTaskDuration(task.startDate, task.endDate);
  const elapsed = calculateTaskDuration(task.startDate, today);
  const expectedProgress = (elapsed / duration) * 100;
  return task.progress < expectedProgress - 10;
}
