'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  LayoutList,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Filter,
  Download,
  Flag,
  Users,
  Clock,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { projectService } from '@/lib/services/project.service';
import { taskService } from '@/lib/services/task.service';
import { Project } from '@/lib/types/project';
import { TaskListItem } from '@/lib/types/task';

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

interface GanttItem {
  id: string;
  name: string;
  type: 'project' | 'task' | 'milestone';
  startDate: Date;
  endDate: Date;
  progress: number;
  status: string;
  priority?: string;
  color: string;
  projectId?: string;
  dependencies?: string[];
}

const STATUS_COLORS = {
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

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#fb923c',
  HIGH: '#ef4444',
  CRITICAL: '#991b1b',
};

export default function ProjectCalendarPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showProjects, setShowProjects] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projectsResponse = await projectService.getAllProjects(0, 100, statusFilter || undefined, priorityFilter || undefined);
      setProjects(projectsResponse.content);

      // Fetch tasks for all projects
      if (showTasks) {
        const allTasks: TaskListItem[] = [];
        for (const project of projectsResponse.content) {
          try {
            const tasksResponse = await taskService.getProjectTasks(project.id, { size: 100 });
            allTasks.push(...tasksResponse.content);
          } catch (err) {
            console.error(`Error fetching tasks for project ${project.id}:`, err);
          }
        }
        setTasks(allTasks);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, showTasks]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert projects and tasks to Gantt items
  const ganttItems = useMemo(() => {
    const items: GanttItem[] = [];

    if (showProjects) {
      projects.forEach((project) => {
        const startDate = new Date(project.startDate);
        const endDate = project.expectedEndDate ? new Date(project.expectedEndDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        items.push({
          id: project.id,
          name: project.name,
          type: 'project',
          startDate,
          endDate,
          progress: project.status === 'COMPLETED' ? 100 : project.status === 'IN_PROGRESS' ? 50 : 0,
          status: project.status,
          priority: project.priority,
          color: STATUS_COLORS[project.status] || '#3b82f6',
          dependencies: [],
        });

        // Add tasks if expanded
        if (showTasks && expandedProjects.has(project.id)) {
          const projectTasks = tasks.filter((t) => t.type !== 'MILESTONE');
          projectTasks.forEach((task) => {
            if (task.dueDate) {
              const taskStart = new Date(startDate);
              const taskEnd = new Date(task.dueDate);

              items.push({
                id: task.id,
                name: `  └─ ${task.title}`,
                type: 'task',
                startDate: taskStart,
                endDate: taskEnd,
                progress: task.progressPercentage || 0,
                status: task.status,
                priority: task.priority,
                color: STATUS_COLORS[task.status] || '#64748b',
                projectId: project.id,
                dependencies: [],
              });
            }
          });

          // Add milestones
          const milestones = tasks.filter((t) => t.type === 'MILESTONE');
          milestones.forEach((milestone) => {
            if (milestone.dueDate) {
              const milestoneDate = new Date(milestone.dueDate);
              items.push({
                id: milestone.id,
                name: `  ◆ ${milestone.title}`,
                type: 'milestone',
                startDate: milestoneDate,
                endDate: milestoneDate,
                progress: milestone.progressPercentage || 0,
                status: milestone.status,
                color: '#fbbf24',
                projectId: project.id,
                dependencies: [],
              });
            }
          });
        }
      });
    }

    return items;
  }, [projects, tasks, showProjects, showTasks, expandedProjects]);

  // Calculate timeline range
  const timelineRange = useMemo(() => {
    const today = new Date();
    const startOfView = new Date(currentDate);
    let endOfView = new Date(currentDate);

    switch (zoomLevel) {
      case 'day':
        startOfView.setDate(currentDate.getDate() - 7);
        endOfView.setDate(currentDate.getDate() + 7);
        break;
      case 'week':
        startOfView.setDate(currentDate.getDate() - 14);
        endOfView.setDate(currentDate.getDate() + 42);
        break;
      case 'month':
        startOfView.setMonth(currentDate.getMonth() - 1);
        endOfView.setMonth(currentDate.getMonth() + 5);
        break;
      case 'quarter':
        startOfView.setMonth(currentDate.getMonth() - 3);
        endOfView.setMonth(currentDate.getMonth() + 9);
        break;
    }

    return { start: startOfView, end: endOfView };
  }, [currentDate, zoomLevel]);

  // Generate timeline columns
  const timelineColumns = useMemo(() => {
    const columns: { date: Date; label: string; isToday: boolean }[] = [];
    const current = new Date(timelineRange.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (current <= timelineRange.end) {
      const isToday = current.getTime() === today.getTime();
      let label = '';

      switch (zoomLevel) {
        case 'day':
          label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          columns.push({ date: new Date(current), label, isToday });
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          label = `W${getWeekNumber(current)}`;
          columns.push({ date: new Date(current), label, isToday: false });
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          label = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          columns.push({ date: new Date(current), label, isToday: false });
          current.setMonth(current.getMonth() + 1);
          break;
        case 'quarter':
          label = `Q${Math.floor(current.getMonth() / 3) + 1} ${current.getFullYear()}`;
          columns.push({ date: new Date(current), label, isToday: false });
          current.setMonth(current.getMonth() + 3);
          break;
      }
    }

    return columns;
  }, [timelineRange, zoomLevel]);

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const calculatePosition = (startDate: Date, endDate: Date) => {
    const totalDuration = timelineRange.end.getTime() - timelineRange.start.getTime();
    const itemStart = Math.max(startDate.getTime(), timelineRange.start.getTime());
    const itemEnd = Math.min(endDate.getTime(), timelineRange.end.getTime());

    const left = ((itemStart - timelineRange.start.getTime()) / totalDuration) * 100;
    const width = ((itemEnd - itemStart) / totalDuration) * 100;

    return { left: `${Math.max(0, left)}%`, width: `${Math.max(0.5, width)}%` };
  };

  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    switch (zoomLevel) {
      case 'day':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 28);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 3);
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() - 6);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    switch (zoomLevel) {
      case 'day':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 28);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 3);
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() + 6);
        break;
    }
    setCurrentDate(newDate);
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects', href: '/projects' },
    { label: 'Calendar View' },
  ];

  if (loading && projects.length === 0) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="projects">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-surface-600 dark:text-surface-400">Loading calendar...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="projects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/projects')}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              <ArrowLeft className="h-5 w-5 text-surface-600 dark:text-surface-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                Project Calendar
              </h1>
              <p className="text-surface-600 dark:text-surface-400">
                Gantt view of projects and tasks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/projects')}>
              <LayoutList className="h-4 w-4 mr-2" />
              List View
            </Button>
            <Button variant="outline" onClick={() => {}}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={fetchData} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Status</option>
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Priority</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showProjects}
                      onChange={(e) => setShowProjects(e.target.checked)}
                      className="rounded border-surface-300 dark:border-surface-600"
                    />
                    Projects
                  </label>
                  <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTasks}
                      onChange={(e) => setShowTasks(e.target.checked)}
                      className="rounded border-surface-300 dark:border-surface-600"
                    />
                    Tasks
                  </label>
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-lg">
                  {(['day', 'week', 'month', 'quarter'] as ZoomLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setZoomLevel(level)}
                      className={`px-3 py-1.5 text-sm rounded capitalize ${
                        zoomLevel === level
                          ? 'bg-white dark:bg-surface-700 shadow text-primary-600 dark:text-primary-400'
                          : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevious}
                    className="p-2 rounded hover:bg-surface-100 dark:hover:bg-surface-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-2 text-sm rounded hover:bg-surface-100 dark:hover:bg-surface-800"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-2 rounded hover:bg-surface-100 dark:hover:bg-surface-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gantt Chart */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Header */}
                <div className="flex border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 sticky top-0 z-10">
                  <div className="w-80 p-3 border-r border-surface-200 dark:border-surface-700 font-medium text-surface-700 dark:text-surface-300">
                    Project / Task
                  </div>
                  <div className="flex-1 flex">
                    {timelineColumns.map((col, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 p-3 text-center text-xs font-medium border-r border-surface-200 dark:border-surface-700 ${
                          col.isToday ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'
                        }`}
                      >
                        {col.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gantt Rows */}
                <div className="relative">
                  {ganttItems.map((item, idx) => {
                    const position = calculatePosition(item.startDate, item.endDate);
                    const isProject = item.type === 'project';
                    const isMilestone = item.type === 'milestone';
                    const isExpanded = expandedProjects.has(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`flex border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 ${
                          isProject ? 'bg-surface-50/50 dark:bg-surface-900/30' : ''
                        }`}
                      >
                        {/* Name Column */}
                        <div className="w-80 p-3 border-r border-surface-200 dark:border-surface-700">
                          <div className="flex items-center gap-2">
                            {isProject && (
                              <button
                                onClick={() => toggleProjectExpansion(item.id)}
                                className="p-0.5 hover:bg-surface-200 dark:hover:bg-surface-700 rounded"
                              >
                                <ChevronRight
                                  className={`h-4 w-4 transition-transform ${
                                    isExpanded ? 'rotate-90' : ''
                                  }`}
                                />
                              </button>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className={`truncate ${isProject ? 'font-medium text-surface-900 dark:text-white' : 'text-sm text-surface-700 dark:text-surface-300'}`}>
                                {item.name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {item.priority && (
                                  <span
                                    className="px-1.5 py-0.5 text-xs rounded"
                                    style={{ backgroundColor: PRIORITY_COLORS[item.priority] + '20', color: PRIORITY_COLORS[item.priority] }}
                                  >
                                    {item.priority}
                                  </span>
                                )}
                                <span className="text-xs text-surface-500">
                                  {item.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  {' → '}
                                  {item.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Timeline Column */}
                        <div className="flex-1 relative p-2">
                          {isMilestone ? (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 cursor-pointer"
                              style={{
                                left: position.left,
                                backgroundColor: item.color,
                              }}
                              title={`${item.name} - ${item.startDate.toLocaleDateString()}`}
                            />
                          ) : (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-8 rounded cursor-pointer group transition-all hover:h-10"
                              style={{
                                left: position.left,
                                width: position.width,
                                backgroundColor: item.color + 'E6',
                              }}
                              onClick={() => isProject ? router.push(`/projects/${item.id}`) : null}
                              title={`${item.name} - ${item.progress}%`}
                            >
                              {/* Progress bar */}
                              <div
                                className="h-full rounded bg-white/30"
                                style={{ width: `${item.progress}%` }}
                              />
                              {/* Label */}
                              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white truncate">
                                {item.progress}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Today marker */}
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (today >= timelineRange.start && today <= timelineRange.end) {
                      const position = calculatePosition(today, today);
                      return (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-primary-500 pointer-events-none z-20"
                          style={{ left: position.left }}
                        >
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary-500 rounded-full" />
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Empty State */}
                {ganttItems.length === 0 && !loading && (
                  <div className="p-12 text-center">
                    <CalendarIcon className="h-12 w-12 mx-auto text-surface-400 mb-4" />
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
                      No Projects Found
                    </h3>
                    <p className="text-surface-600 dark:text-surface-400 mb-4">
                      {statusFilter || priorityFilter
                        ? 'No projects match your filters.'
                        : 'Create your first project to see it on the timeline.'}
                    </p>
                    <Button onClick={() => router.push('/projects')}>
                      View All Projects
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Status
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <div key={status} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                      <span className="text-xs text-surface-600 dark:text-surface-400">
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Priority
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PRIORITY_COLORS).map(([priority, color]) => (
                    <div key={priority} className="flex items-center gap-2">
                      <Flag className="h-4 w-4" style={{ color }} />
                      <span className="text-xs text-surface-600 dark:text-surface-400">
                        {priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Symbols
                </h4>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rotate-45 bg-amber-500" />
                    <span className="text-xs text-surface-600 dark:text-surface-400">Milestone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-4 bg-primary-500" />
                    <span className="text-xs text-surface-600 dark:text-surface-400">Today</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">Total Projects</p>
                  <p className="text-xl font-bold text-surface-900 dark:text-white">{projects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">In Progress</p>
                  <p className="text-xl font-bold text-surface-900 dark:text-white">
                    {projects.filter((p) => p.status === 'IN_PROGRESS').length}
                  </p>
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
                  <p className="text-xs text-surface-500">Total Tasks</p>
                  <p className="text-xl font-bold text-surface-900 dark:text-white">{tasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                  <Flag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">Milestones</p>
                  <p className="text-xl font-bold text-surface-900 dark:text-white">
                    {tasks.filter((t) => t.type === 'MILESTONE').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
