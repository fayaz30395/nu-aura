// Project Types
export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  ownerId?: string;
  ownerName?: string;
  startDate?: string;
  endDate?: string;
  targetEndDate?: string;
  clientName?: string;
  budget?: number;
  currency?: string;
  progressPercentage: number;
  color?: string;
  tags?: string;
  isArchived: boolean;
  isOverdue: boolean;
  totalTasks?: number;
  completedTasks?: number;
  totalMembers?: number;
  totalMilestones?: number;
  completedMilestones?: number;
  createdAt: string;
  updatedAt: string;
}

// Task Types
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskType = 'EPIC' | 'STORY' | 'TASK' | 'SUBTASK' | 'BUG' | 'FEATURE' | 'IMPROVEMENT';

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
  progressPercentage: number;
  storyPoints?: number;
  sprintName?: string;
  sortOrder: number;
  tags?: string;
  color?: string;
  isOverdue: boolean;
  isSubtask: boolean;
  subtaskCount?: number;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Milestone Types
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: MilestoneStatus;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  progressPercentage: number;
  ownerId?: string;
  ownerName?: string;
  sortOrder: number;
  color?: string;
  isOverdue: boolean;
  totalTasks?: number;
  completedTasks?: number;
  createdAt: string;
  updatedAt: string;
}

// Member Types
export type ProjectRole = 'OWNER' | 'PROJECT_MANAGER' | 'TECH_LEAD' | 'DEVELOPER' | 'QA_ENGINEER' | 'DESIGNER' | 'ANALYST' | 'MEMBER' | 'VIEWER';

export interface Member {
  id: string;
  projectId: string;
  userId: string;
  userName?: string;
  email?: string;
  role: ProjectRole;
  joinedDate?: string;
  leftDate?: string;
  isActive: boolean;
  hoursPerWeek?: number;
  department?: string;
  designation?: string;
  createdAt: string;
  updatedAt: string;
}

// Comment Types
export type CommentType = 'COMMENT' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'MENTION' | 'SYSTEM';

export interface Comment {
  id: string;
  projectId: string;
  taskId?: string;
  milestoneId?: string;
  authorId?: string;
  authorName?: string;
  content: string;
  parentCommentId?: string;
  type: CommentType;
  isEdited: boolean;
  isDeleted: boolean;
  mentions?: string;
  attachments?: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

// Statistics
export interface ProjectStatistics {
  totalProjects: number;
  planningProjects: number;
  inProgressProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  overdueProjects: number;
}

// Page Response
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
