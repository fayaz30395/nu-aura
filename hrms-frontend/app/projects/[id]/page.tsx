'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FolderKanban,
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  Clock,
  Loader2,
  Edit,
  Plus,
  CheckSquare,
  ListTodo,
  LayoutGrid,
  LayoutList,
  Search,
  Filter,
  MoreVertical,
  User,
  AlertTriangle,
  ChevronDown,
  X,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui';
import { projectService } from '@/lib/services/project.service';
import { taskService } from '@/lib/services/task.service';
import { Project, ProjectEmployee } from '@/lib/types/project';
import {
  Task,
  TaskListItem,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskStatus,
  TaskPriority,
  TaskType,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS,
  getStatusColor,
  getPriorityColor,
  getTypeIcon,
  getStatusLabel,
  getPriorityLabel,
} from '@/lib/types/task';

type TabType = 'overview' | 'tasks' | 'resources' | 'timesheets';
type TaskViewMode = 'list' | 'board';

const STATUS_CONFIG = {
  PLANNED: { label: 'Planned', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900' },
  ON_HOLD: { label: 'On Hold', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900' },
  COMPLETED: { label: 'Completed', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900' },
};

const PRIORITY_CONFIG = {
  LOW: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  MEDIUM: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900' },
  HIGH: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900' },
  CRITICAL: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900' },
};

const formatDate = (date: string | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('tasks');

  // Task states
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>('board');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | ''>('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<TaskPriority | ''>('');

  // Task modals
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [savingTask, setSavingTask] = useState(false);

  // Task form
  const [taskForm, setTaskForm] = useState<CreateTaskRequest>({
    projectId: projectId,
    title: '',
    description: '',
    priority: 'MEDIUM',
    type: 'TASK',
    dueDate: '',
    estimatedHours: undefined,
    storyPoints: undefined,
  });

  // Resource states
  const [teamMembers, setTeamMembers] = useState<ProjectEmployee[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Fetch project
  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProject(projectId);
      setProject(data);
    } catch (err: any) {
      console.error('Error fetching project:', err);
      setError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const response = await taskService.getProjectTasks(projectId, {
        status: taskStatusFilter || undefined,
        priority: taskPriorityFilter || undefined,
        search: taskSearchQuery || undefined,
        size: 100,
      });
      setTasks(response.content);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, [projectId, taskStatusFilter, taskPriorityFilter, taskSearchQuery]);

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const members = await projectService.getTeamMembers(projectId);
      setTeamMembers(members);
    } catch (err) {
      console.error('Error fetching team:', err);
      setTeamMembers([]);
    } finally {
      setLoadingTeam(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    } else if (activeTab === 'resources') {
      fetchTeamMembers();
    }
  }, [activeTab, fetchTasks, fetchTeamMembers]);

  // Reset task form
  const resetTaskForm = () => {
    setTaskForm({
      projectId: projectId,
      title: '',
      description: '',
      priority: 'MEDIUM',
      type: 'TASK',
      dueDate: '',
      estimatedHours: undefined,
      storyPoints: undefined,
    });
  };

  // Handle create task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTask(true);
    try {
      await taskService.createTask(taskForm);
      setShowAddTaskModal(false);
      resetTaskForm();
      fetchTasks();
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSavingTask(false);
    }
  };

  // Handle task status change
  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      fetchTasks();
    } catch (err: any) {
      console.error('Error updating task status:', err);
    }
  };

  // Handle view task details
  const handleViewTaskDetails = async (taskId: string) => {
    try {
      const task = await taskService.getTask(taskId);
      setSelectedTask(task);
      setShowTaskDetailModal(true);
    } catch (err) {
      console.error('Error fetching task:', err);
    }
  };

  // Handle delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskService.deleteTask(taskId);
      setShowTaskDetailModal(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (err: any) {
      console.error('Error deleting task:', err);
    }
  };

  // Group tasks by status for Kanban
  const tasksByStatus = taskService.groupTasksByStatus(tasks);

  // Kanban columns
  const kanbanColumns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'BACKLOG', label: 'Backlog', color: 'border-gray-300' },
    { status: 'TODO', label: 'To Do', color: 'border-slate-400' },
    { status: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-500' },
    { status: 'IN_REVIEW', label: 'In Review', color: 'border-purple-500' },
    { status: 'DONE', label: 'Done', color: 'border-green-500' },
  ];

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects', href: '/projects' },
    { label: project?.name || 'Loading...' },
  ];

  if (loading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="projects">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-surface-600 dark:text-surface-400">Loading project...</span>
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="projects">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
              Error Loading Project
            </h2>
            <p className="text-surface-600 dark:text-surface-400 mb-4">{error}</p>
            <Button onClick={() => router.push('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="projects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/projects')}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              <ArrowLeft className="h-5 w-5 text-surface-600 dark:text-surface-400" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm text-surface-500 font-mono">{project.projectCode}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_CONFIG[project.status]?.bgColor} ${STATUS_CONFIG[project.status]?.color}`}>
                  {STATUS_CONFIG[project.status]?.label}
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_CONFIG[project.priority]?.bgColor} ${PRIORITY_CONFIG[project.priority]?.color}`}>
                  {PRIORITY_CONFIG[project.priority]?.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-surface-600 dark:text-surface-400 mt-1 max-w-2xl">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">Start Date</p>
                  <p className="font-semibold text-surface-900 dark:text-white">{formatDate(project.startDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                  <Calendar className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">Deadline</p>
                  <p className="font-semibold text-surface-900 dark:text-white">{formatDate(project.expectedEndDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">Budget</p>
                  <p className="font-semibold text-surface-900 dark:text-white">{formatCurrency(project.budget, project.currency)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">Team Size</p>
                  <p className="font-semibold text-surface-900 dark:text-white">{teamMembers.length} members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                  <CheckSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">Tasks</p>
                  <p className="font-semibold text-surface-900 dark:text-white">{tasks.length} total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-200 dark:border-surface-700">
          <nav className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: FolderKanban },
              { id: 'tasks', label: 'Tasks', icon: ListTodo },
              { id: 'resources', label: 'Resources', icon: Users },
              { id: 'timesheets', label: 'Timesheets', icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Project Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-surface-500">Description</label>
                    <p className="text-surface-700 dark:text-surface-300">{project.description || 'No description'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-surface-500">Client</label>
                      <p className="text-surface-700 dark:text-surface-300">{project.clientName || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-surface-500">Project Manager</label>
                      <p className="text-surface-700 dark:text-surface-300">{project.projectManagerName || '-'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Task Summary</h3>
                <div className="space-y-3">
                  {kanbanColumns.map((col) => (
                    <div key={col.status} className="flex items-center justify-between">
                      <span className="text-sm text-surface-600 dark:text-surface-400">{col.label}</span>
                      <span className="font-semibold text-surface-900 dark:text-white">
                        {tasksByStatus[col.status]?.length || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Task Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-1 gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-surface-400" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <select
                  value={taskStatusFilter}
                  onChange={(e) => setTaskStatusFilter(e.target.value as TaskStatus | '')}
                  className="px-3 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg text-sm"
                >
                  <option value="">All Status</option>
                  {TASK_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={taskPriorityFilter}
                  onChange={(e) => setTaskPriorityFilter(e.target.value as TaskPriority | '')}
                  className="px-3 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg text-sm"
                >
                  <option value="">All Priority</option>
                  {TASK_PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-lg">
                  <button
                    onClick={() => setTaskViewMode('board')}
                    className={`p-2 rounded ${taskViewMode === 'board' ? 'bg-white dark:bg-surface-700 shadow' : ''}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setTaskViewMode('list')}
                    className={`p-2 rounded ${taskViewMode === 'list' ? 'bg-white dark:bg-surface-700 shadow' : ''}`}
                  >
                    <LayoutList className="h-4 w-4" />
                  </button>
                </div>
                <Button onClick={() => setShowAddTaskModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>

            {/* Loading */}
            {loadingTasks && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                <span className="ml-2 text-surface-500">Loading tasks...</span>
              </div>
            )}

            {/* Kanban Board View */}
            {!loadingTasks && taskViewMode === 'board' && (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {kanbanColumns.map((col) => (
                  <div key={col.status} className={`flex-shrink-0 w-72 bg-surface-50 dark:bg-surface-800/50 rounded-lg border-t-4 ${col.color}`}>
                    <div className="p-3 border-b border-surface-200 dark:border-surface-700">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-surface-900 dark:text-white">{col.label}</h3>
                        <span className="text-sm text-surface-500 bg-surface-200 dark:bg-surface-700 px-2 py-0.5 rounded-full">
                          {tasksByStatus[col.status]?.length || 0}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-400px)] overflow-y-auto">
                      {tasksByStatus[col.status]?.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleViewTaskDetails(task.id)}
                          className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-mono text-surface-500">{task.taskCode}</span>
                            <span className={`px-1.5 py-0.5 text-xs rounded ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-surface-900 dark:text-white mb-2 line-clamp-2">
                            {getTypeIcon(task.type)} {task.title}
                          </p>
                          <div className="flex items-center justify-between text-xs text-surface-500">
                            <div className="flex items-center gap-1">
                              {task.assigneeName ? (
                                <>
                                  <User className="h-3 w-3" />
                                  <span className="truncate max-w-[80px]">{task.assigneeName}</span>
                                </>
                              ) : (
                                <span className="text-surface-400">Unassigned</span>
                              )}
                            </div>
                            {task.dueDate && (
                              <div className={`flex items-center gap-1 ${task.isOverdue ? 'text-red-500' : ''}`}>
                                <Calendar className="h-3 w-3" />
                                {formatDate(task.dueDate)}
                              </div>
                            )}
                          </div>
                          {task.progressPercentage !== undefined && task.progressPercentage > 0 && (
                            <div className="mt-2">
                              <div className="w-full h-1 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary-500"
                                  style={{ width: `${task.progressPercentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {(!tasksByStatus[col.status] || tasksByStatus[col.status].length === 0) && (
                        <div className="p-4 text-center text-surface-400 text-sm">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* List View */}
            {!loadingTasks && taskViewMode === 'list' && (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                        <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">Task</th>
                        <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">Priority</th>
                        <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">Assignee</th>
                        <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">Due Date</th>
                        <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr
                          key={task.id}
                          onClick={() => handleViewTaskDetails(task.id)}
                          className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer"
                        >
                          <td className="p-4">
                            <div>
                              <span className="text-xs font-mono text-surface-500 mr-2">{task.taskCode}</span>
                              <span className="text-sm font-medium text-surface-900 dark:text-white">
                                {getTypeIcon(task.type)} {task.title}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-surface-600 dark:text-surface-400">
                            {task.assigneeName || '-'}
                          </td>
                          <td className="p-4 text-sm text-surface-600 dark:text-surface-400">
                            <span className={task.isOverdue ? 'text-red-500' : ''}>
                              {formatDate(task.dueDate)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary-500"
                                  style={{ width: `${task.progressPercentage || 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-surface-500">{task.progressPercentage || 0}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tasks.length === 0 && (
                    <div className="p-12 text-center">
                      <ClipboardList className="h-12 w-12 mx-auto text-surface-400 mb-4" />
                      <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">No Tasks Found</h3>
                      <p className="text-surface-600 dark:text-surface-400 mb-4">
                        {taskSearchQuery || taskStatusFilter || taskPriorityFilter
                          ? 'No tasks match your filters.'
                          : 'Get started by creating your first task.'}
                      </p>
                      <Button onClick={() => setShowAddTaskModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Team Members</h3>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </div>
              {loadingTeam ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8 text-surface-500">
                  No team members assigned
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                          {member.employeeName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-surface-900 dark:text-white">{member.employeeName}</p>
                          <p className="text-sm text-surface-500">{member.role || 'Team Member'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-surface-500">Allocation</p>
                          <p className="font-semibold text-surface-900 dark:text-white">{member.allocationPercentage}%</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${member.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600'}`}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'timesheets' && (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-surface-400 mb-4" />
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">Timesheets</h3>
              <p className="text-surface-600 dark:text-surface-400 mb-4">
                View and manage time entries for this project
              </p>
              <Button onClick={() => router.push('/timesheets')}>
                View Timesheets
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Task Modal */}
        <Modal isOpen={showAddTaskModal} onClose={() => setShowAddTaskModal(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">Create New Task</h2>
          </ModalHeader>
          <form onSubmit={handleCreateTask}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Task title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={taskForm.description || ''}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Task description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Type
                    </label>
                    <select
                      value={taskForm.type}
                      onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value as TaskType })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg"
                    >
                      {TASK_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg"
                    >
                      {TASK_PRIORITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={taskForm.dueDate || ''}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={taskForm.estimatedHours || ''}
                      onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Story Points
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={taskForm.storyPoints || ''}
                    onChange={(e) => setTaskForm({ ...taskForm, storyPoints: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-32 px-3 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg"
                    placeholder="0"
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowAddTaskModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingTask}>
                {savingTask ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </>
                )}
              </Button>
            </ModalFooter>
          </form>
        </Modal>

        {/* Task Detail Modal */}
        <Modal isOpen={showTaskDetailModal} onClose={() => setShowTaskDetailModal(false)} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-surface-500">{selectedTask?.taskCode}</span>
              {selectedTask && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(selectedTask.priority)}`}>
                  {getPriorityLabel(selectedTask.priority)}
                </span>
              )}
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedTask && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
                    {getTypeIcon(selectedTask.type)} {selectedTask.title}
                  </h2>
                  <p className="text-surface-600 dark:text-surface-400">
                    {selectedTask.description || 'No description'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-surface-500">Status</label>
                    <select
                      value={selectedTask.status}
                      onChange={(e) => handleTaskStatusChange(selectedTask.id, e.target.value as TaskStatus)}
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg"
                    >
                      {TASK_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-surface-500">Assignee</label>
                    <p className="mt-1 font-medium text-surface-900 dark:text-white">
                      {selectedTask.assigneeName || 'Unassigned'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <label className="text-xs text-surface-500">Due Date</label>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {formatDate(selectedTask.dueDate)}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <label className="text-xs text-surface-500">Est. Hours</label>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {selectedTask.estimatedHours || '-'}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <label className="text-xs text-surface-500">Actual Hours</label>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {selectedTask.actualHours || '-'}
                    </p>
                  </div>
                </div>

                {selectedTask.progressPercentage !== undefined && (
                  <div>
                    <label className="text-sm text-surface-500">Progress</label>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-3 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500"
                          style={{ width: `${selectedTask.progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                        {selectedTask.progressPercentage}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="destructive"
              onClick={() => selectedTask && handleDeleteTask(selectedTask.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setShowTaskDetailModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
