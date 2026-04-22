'use client';

import React, {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutList,
  List,
  Loader2
} from 'lucide-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {Button, Card, CardContent} from '@/components/ui';
import {TaskListItem} from '@/lib/types/core/task';
import {CalendarEvent, GanttTask, PRIORITY_COLORS, STATUS_COLORS} from '@/lib/types/hrms/project-calendar';
import {CalendarGridView} from '@/components/projects/CalendarGridView';
import {TaskDetailsModal} from '@/components/projects/TaskDetailsModal';
import {useAuth} from '@/lib/hooks/useAuth';
import {hasPermission} from '@/lib/utils';
import {toPriority} from '@/lib/utils/type-guards';
import {useProjects} from '@/lib/hooks/queries/useProjects';
import {useQuery} from '@tanstack/react-query';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('ProjectCalendarPage');

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';
type ViewMode = 'timeline' | 'calendar';

// Extended task type for internal use to handle missing properties in TaskListItem
type TaskWithProject = TaskListItem & {
  projectId: string;
  projectName: string;
  createdAt?: string;
  startDate?: string;
};

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

export default function ProjectCalendarPage() {
  const router = useRouter();
  const {user} = useAuth();

  // Permission Check
  const canEditTasks = useMemo(() => {
    if (!user?.roles) return false;
    return hasPermission(user.roles, 'tasks:write') || hasPermission(user.roles, 'projects:write');
  }, [user]);

  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showProjects, setShowProjects] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Modal State
  const [selectedTask, setSelectedTask] = useState<GanttTask | CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch data with React Query
  const {data: projectsData, isLoading, error, refetch} = useProjects(
    0,
    100,
    statusFilter || undefined,
    priorityFilter || undefined
  );

  // Stable reference: prevents calendarEvents useMemo from re-running on every render.
  const projects = useMemo(() => projectsData?.content ?? [], [projectsData]);

  // Fetch tasks for all projects (task management coming soon)
  const tasksQuery = useQuery({
    queryKey: ['tasks', showTasks, projects.length],
    queryFn: async () => {
      // Task API endpoints not yet implemented - return empty array
      // Once task endpoints are ready, fetch individual project tasks here
      return [] as TaskWithProject[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Stable reference: prevents calendarEvents useMemo from re-running on every render.
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const loading = isLoading || tasksQuery.isLoading;
  const queryError = error || tasksQuery.error;

  // Convert to CalendarEvents for Grid View
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    if (showProjects) {
      projects.forEach(p => {
        events.push({
          id: p.id,
          title: p.name,
          type: 'project',
          startDate: new Date(p.startDate),
          endDate: p.expectedEndDate ? new Date(p.expectedEndDate) : new Date(p.startDate),
          status: p.status,
          priority: toPriority(p.priority),
          color: STATUS_COLORS[p.status] || '#3b82f6',
          description: p.description,
        });
      });
    }

    if (showTasks) {
      tasks.forEach(t => {
        if (t.dueDate) {
          // Basic start date inference: startDate > createdAt > today
          const startStr = t.startDate || t.createdAt;
          const start = startStr ? new Date(startStr) : new Date();

          events.push({
            id: t.id,
            title: t.title,
            type: t.type === 'MILESTONE' ? 'milestone' : 'task',
            startDate: start,
            endDate: new Date(t.dueDate),
            status: t.status,
            priority: toPriority(t.priority),
            color: t.type === 'MILESTONE' ? '#f59e0b' : (STATUS_COLORS[t.status] || '#64748b'),
            projectId: t.projectId,
            projectName: t.projectName,
          });
        }
      });
    }

    return events;
  }, [projects, tasks, showProjects, showTasks]);

  // Convert projects and tasks to Gantt items (Timeline View)
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
          const projectTasks = tasks.filter((t) => t.projectId === project.id && t.type !== 'MILESTONE');
          projectTasks.forEach((task) => {
            if (task.dueDate) {
              const startStr = task.startDate || task.createdAt;
              const taskStart = startStr ? new Date(startStr) : new Date(startDate);
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
          const milestones = tasks.filter((t) => t.projectId === project.id && t.type === 'MILESTONE');
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
    const startOfView = new Date(currentDate);
    const endOfView = new Date(currentDate);

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

    return {start: startOfView, end: endOfView};
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
          label = current.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
          columns.push({date: new Date(current), label, isToday});
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          label = `W${getWeekNumber(current)}`;
          columns.push({date: new Date(current), label, isToday: false});
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          label = current.toLocaleDateString('en-US', {month: 'short', year: '2-digit'});
          columns.push({date: new Date(current), label, isToday: false});
          current.setMonth(current.getMonth() + 1);
          break;
        case 'quarter':
          label = `Q${Math.floor(current.getMonth() / 3) + 1} ${current.getFullYear()}`;
          columns.push({date: new Date(current), label, isToday: false});
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

    return {left: `${Math.max(0, left)}%`, width: `${Math.max(0.5, width)}%`};
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
    if (viewMode === 'calendar') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
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
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'calendar') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
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
    }
    setCurrentDate(newDate);
  };

  const handleEventClick = (event: CalendarEvent | GanttItem) => {
    // If it has progress, treat as GanttTask to preserve progress editing in Modal
    if ('progress' in event) {
      setSelectedTask(event as unknown as GanttTask);
    } else {
      setSelectedTask(event);
    }
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (_taskId: string, _status: string) => {
    if (!canEditTasks) {
      return;
    }
    try {
      // Status update would be handled by taskService mutation
      // For now, just close modal
      setIsModalOpen(false);
    } catch (error) {
      log.error('Failed to update status', error);
    }
  };

  const handleUpdateProgress = async (_taskId: string, _progress: number) => {
    try {
      // Progress update would be handled by taskService mutation
    } catch (err) {
      log.error('Failed to update task progress', err);
    }
  };

  const breadcrumbs = [
    {label: 'Dashboard', href: '/dashboard'},
    {label: 'Projects', href: '/projects'},
    {label: 'Calendar View'},
  ];

  if (loading && projects.length === 0) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="projects">
        <div className="flex items-center justify-center h-64">
          <Loader2 className='h-8 w-8 animate-spin text-accent'/>
          <span className="ml-2 text-[var(--text-secondary)]">Loading calendar...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="projects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/projects')}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]"
              aria-label="Back to projects"
            >
              <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]"/>
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
                Project Calendar
              </h1>
              <p className="text-[var(--text-secondary)]">
                Visualize projects and tasks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-[var(--bg-secondary)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition-all ${viewMode === 'timeline'
                  ? 'bg-[var(--bg-surface)] text-accent-700 shadow-[var(--shadow-card)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <LayoutList className="h-4 w-4"/>
                Timeline
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition-all ${viewMode === 'calendar'
                  ? 'bg-[var(--bg-surface)] text-accent-700 shadow-[var(--shadow-card)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <CalendarIcon className="h-4 w-4"/>
                Calendar
              </button>
            </div>

            <Button variant="outline" onClick={() => router.push('/projects')}>
              <List className="h-4 w-4 mr-2"/>
              List View
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {queryError && (
          <Card className='border border-status-danger-border bg-status-danger-bg'>
            <CardContent className="p-4">
              <div className='flex items-center gap-2 text-status-danger-text'>
                <AlertCircle className="h-5 w-5"/>
                <span>{queryError instanceof Error ? queryError.message : 'Failed to load data'}</span>
                <Button size="sm" variant="outline" onClick={() => refetch()} className="ml-auto">
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
              <div className="flex flex-wrap gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
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
                  className="px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="">All Priority</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-body-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showProjects}
                      onChange={(e) => setShowProjects(e.target.checked)}
                      className="rounded border-[var(--border-main)] dark:border-[var(--border-main)]"
                    />
                    Projects
                  </label>
                  <label className="flex items-center gap-2 text-body-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTasks}
                      onChange={(e) => setShowTasks(e.target.checked)}
                      className="rounded border-[var(--border-main)] dark:border-[var(--border-main)]"
                    />
                    Tasks
                  </label>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                {viewMode === 'timeline' && (
                  <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg mr-2">
                    {(['day', 'week', 'month', 'quarter'] as ZoomLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setZoomLevel(level)}
                        className={`px-4 py-1.5 text-sm rounded capitalize ${zoomLevel === level
                          ? 'bg-[var(--bg-surface)] shadow text-accent-700 dark:text-accent-400'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevious}
                    className="p-2 rounded hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]"
                    aria-label="Previous period"
                  >
                    <ChevronLeft className="h-4 w-4"/>
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-4 py-2 text-sm rounded hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] font-medium"
                  >
                    {viewMode === 'timeline' ? 'Today' : currentDate.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-2 rounded hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]"
                    aria-label="Next period"
                  >
                    <ChevronRight className="h-4 w-4"/>
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TIMELINE (GANTT) VIEW */}
        {viewMode === 'timeline' && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
                  {/* Header */}
                  <div
                    className="flex border-b border-[var(--border-main)] bg-[var(--bg-secondary)]/50 sticky top-0 z-10">
                    <div
                      className="w-80 p-4 border-r border-[var(--border-main)] font-medium text-[var(--text-secondary)]">
                      Project / Task
                    </div>
                    <div className="flex-1 flex">
                      {timelineColumns.map((col, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 p-4 text-center text-xs font-medium border-r border-[var(--border-main)] ${col.isToday ? 'bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {col.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gantt Rows */}
                  <div className="relative">
                    {ganttItems.map((item, _idx) => {
                      const position = calculatePosition(item.startDate, item.endDate);
                      const isProject = item.type === 'project';
                      const isMilestone = item.type === 'milestone';
                      const isExpanded = expandedProjects.has(item.id);

                      return (
                        <div
                          key={item.id}
                          className={`flex border-b border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 ${isProject ? 'bg-[var(--bg-secondary)]/50 dark:bg-[var(--bg-secondary)]' : ''
                          }`}
                        >
                          {/* Name Column */}
                          <div className="w-80 p-4 border-r border-[var(--border-main)]">
                            <div className="flex items-center gap-2">
                              {isProject && (
                                <button
                                  onClick={() => toggleProjectExpansion(item.id)}
                                  className="p-0.5 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded"
                                >
                                  <ChevronRight
                                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''
                                    }`}
                                  />
                                </button>
                              )}
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`truncate ${isProject ? 'font-medium text-[var(--text-primary)]' : 'text-body-secondary'}`}>
                                  {item.name}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.priority && (
                                    <span
                                      className="px-1.5 py-0.5 text-xs rounded"
                                      style={{
                                        backgroundColor: PRIORITY_COLORS[item.priority] + '20',
                                        color: PRIORITY_COLORS[item.priority]
                                      }}
                                    >
                                      {item.priority}
                                    </span>
                                  )}
                                  <span className="text-caption">
                                    {item.startDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                                    {' → '}
                                    {item.endDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
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
                                onClick={() => handleEventClick(item)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleEventClick(item);
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Milestone: ${item.name}`}
                              />
                            ) : (
                              <div
                                className="absolute top-1/2 -translate-y-1/2 h-8 rounded cursor-pointer group transition-all hover:h-10"
                                style={{
                                  left: position.left,
                                  width: position.width,
                                  backgroundColor: item.color + 'E6',
                                }}
                                onClick={() => {
                                  if (isProject) {
                                    void router.push(`/projects/${item.id}`);
                                  } else {
                                    handleEventClick(item);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    if (isProject) {
                                      void router.push(`/projects/${item.id}`);
                                    } else {
                                      handleEventClick(item);
                                    }
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                                title={`${item.name} - ${item.progress}%`}
                                aria-label={`${item.name}: ${item.progress}% complete`}
                              >
                                {/* Progress bar */}
                                <div
                                  className="h-full rounded bg-white/30"
                                  style={{width: `${item.progress}%`}}
                                />
                                {/* Label */}
                                <span
                                  className='absolute inset-0 flex items-center px-2 text-xs font-medium text-inverse truncate'>
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
                            className='absolute top-0 bottom-0 w-0.5 bg-accent pointer-events-none z-20'
                            style={{left: position.left}}
                          >
                            <div
                              className='absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-accent rounded-full'/>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Empty State */}
                  {ganttItems.length === 0 && !loading && (
                    <div className="p-12 text-center">
                      <CalendarIcon className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4"/>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                        No Projects Found
                      </h3>
                      <p className="text-[var(--text-secondary)] mb-4">
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
        )}

        {/* CALENDAR GRID VIEW */}
        {viewMode === 'calendar' && (
          <Card className="h-[800px]">
            <CardContent className="p-4 h-full">
              <CalendarGridView
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                events={calendarEvents}
                onEventClick={handleEventClick}
                viewMode="month"
              />
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        {/* Only show for timeline, or show universally if consistent */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Status
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <div key={status} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{backgroundColor: color}}/>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Priority
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PRIORITY_COLORS).map(([priority, color]) => (
                    <div key={priority} className="flex items-center gap-2">
                      <Flag className="h-4 w-4" style={{color}}/>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Details Modal */}
        {selectedTask && (
          <TaskDetailsModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            task={selectedTask}
            onUpdateStatus={canEditTasks ? handleUpdateStatus : undefined}
            onUpdateProgress={canEditTasks ? handleUpdateProgress : undefined}
            readonly={!canEditTasks}
          />
        )}
      </div>
    </AppLayout>
  );
}
