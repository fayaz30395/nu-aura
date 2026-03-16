'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  Calendar,
  Users,
  Target,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { projectService } from '@/lib/services/project.service';
import { projectCalendarService } from '@/lib/services/project-calendar.service';
import {
  GanttTask,
  GanttFilterOptions,
  getStatusColor,
  getPriorityColor,
  isTaskDelayed,
  isTaskAtRisk,
  calculateTaskDuration,
} from '@/lib/types/project-calendar';
import type { Task, TaskListItem } from '@/lib/types/task';

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

// Helper function - defined before component to avoid hoisting issues
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export default function GanttChartPage() {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [filters, setFilters] = useState<GanttFilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);

  // Fetch projects with React Query
  const projectsQuery = useQuery({
    queryKey: ['projects', 'gantt'],
    queryFn: () => projectService.getAllProjects(0, 100),
    staleTime: 5 * 60 * 1000,
  });

  const ganttTasks = useMemo(() => {
    if (!projectsQuery.data) return [];

    // Convert projects to Gantt tasks (task management coming soon)
    const tasks = projectCalendarService.convertToGanttTasks(
      projectsQuery.data.content,
      [] // No individual tasks yet - task management in development
    );

    // Apply filters
    let filteredTasks = tasks;
    if (filters.projectIds?.length) {
      filteredTasks = filteredTasks.filter(t =>
        t.type === 'project' ? filters.projectIds!.includes(t.id) : filters.projectIds!.includes(t.projectId || '')
      );
    }
    if (filters.statuses?.length) {
      filteredTasks = filteredTasks.filter(t => filters.statuses!.includes(t.status));
    }
    if (filters.showOnlyDelayed) {
      filteredTasks = filteredTasks.filter(t => isTaskDelayed(t));
    }
    if (filters.showOnlyAtRisk) {
      filteredTasks = filteredTasks.filter(t => isTaskAtRisk(t));
    }

    return filteredTasks;
  }, [projectsQuery.data, filters]);

  const loading = projectsQuery.isLoading;
  const error = projectsQuery.error;

  const refetch = () => {
    projectsQuery.refetch();
  };

  // Calculate timeline range
  const timelineRange = useMemo(() => {
    if (ganttTasks.length === 0) {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 3, 0),
      };
    }

    const dates = ganttTasks.flatMap(t => [t.startDate, t.endDate]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Add some padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    return { start: minDate, end: maxDate };
  }, [ganttTasks]);

  // Generate timeline columns based on zoom level
  const timelineColumns = useMemo(() => {
    const columns: { date: Date; label: string; isToday: boolean }[] = [];
    const current = new Date(timelineRange.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (current <= timelineRange.end) {
      const isToday = current.getTime() === today.getTime();

      if (zoomLevel === 'day') {
        columns.push({
          date: new Date(current),
          label: current.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          isToday,
        });
        current.setDate(current.getDate() + 1);
      } else if (zoomLevel === 'week') {
        columns.push({
          date: new Date(current),
          label: `Week ${getWeekNumber(current)}`,
          isToday,
        });
        current.setDate(current.getDate() + 7);
      } else if (zoomLevel === 'month') {
        columns.push({
          date: new Date(current),
          label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          isToday,
        });
        current.setMonth(current.getMonth() + 1);
      } else {
        columns.push({
          date: new Date(current),
          label: `Q${Math.ceil((current.getMonth() + 1) / 3)} ${current.getFullYear()}`,
          isToday,
        });
        current.setMonth(current.getMonth() + 3);
      }
    }

    return columns;
  }, [timelineRange, zoomLevel]);

  const getTaskPosition = (task: GanttTask) => {
    const totalDays = calculateTaskDuration(timelineRange.start, timelineRange.end);
    const startOffset = calculateTaskDuration(timelineRange.start, task.startDate);
    const duration = calculateTaskDuration(task.startDate, task.endDate);

    const left = (startOffset / totalDays) * 100;
    const width = Math.max((duration / totalDays) * 100, 1);

    return { left: `${left}%`, width: `${width}%` };
  };

  // Statistics
  const stats = useMemo(() => {
    const total = ganttTasks.filter(t => t.type === 'task').length;
    const completed = ganttTasks.filter(t => t.type === 'task' && t.progress === 100).length;
    const delayed = ganttTasks.filter(t => t.type === 'task' && isTaskDelayed(t)).length;
    const atRisk = ganttTasks.filter(t => t.type === 'task' && isTaskAtRisk(t)).length;
    const avgProgress = total > 0
      ? Math.round(ganttTasks.filter(t => t.type === 'task').reduce((sum, t) => sum + t.progress, 0) / total)
      : 0;

    return { total, completed, delayed, atRisk, avgProgress };
  }, [ganttTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <p className="text-lg text-[var(--text-secondary)]">{errorMessage}</p>
        <Button onClick={refetch}>Try Again</Button>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              Gantt Chart
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Project timeline and task dependencies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info-50 dark:bg-info-900/30">
              <Target className="h-5 w-5 text-info-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Total Tasks</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Target className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Completed</p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
              <Clock className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Delayed</p>
              <p className="text-2xl font-bold">{stats.delayed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning-50 dark:bg-warning-900/30">
              <AlertCircle className="h-5 w-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">At Risk</p>
              <p className="text-2xl font-bold">{stats.atRisk}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Target className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Avg Progress</p>
              <p className="text-2xl font-bold">{stats.avgProgress}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date(startDate);
              d.setMonth(d.getMonth() - 1);
              setStartDate(d);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date(startDate);
              d.setMonth(d.getMonth() + 1);
              setStartDate(d);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-muted)]">Zoom:</span>
          {(['day', 'week', 'month', 'quarter'] as ZoomLevel[]).map((level) => (
            <Button
              key={level}
              variant={zoomLevel === level ? 'default' : 'outline'}
              size="sm"
              onClick={() => setZoomLevel(level)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Timeline Header */}
            <div className="flex border-b border-[var(--border-main)]">
              <div className="w-64 flex-shrink-0 p-3 bg-[var(--bg-secondary)] font-semibold border-r border-[var(--border-main)]">
                Task Name
              </div>
              <div className="flex-1 flex">
                {timelineColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 min-w-[80px] p-2 text-center text-sm border-r border-[var(--border-main)] ${
                      col.isToday ? 'bg-info-50 dark:bg-info-900/20' : 'bg-[var(--bg-secondary)]'
                    }`}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Task Rows */}
            {ganttTasks.map((task) => (
              <div
                key={task.id}
                className="flex border-b border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]"
              >
                {/* Task Name */}
                <div className={`w-64 flex-shrink-0 p-3 border-r border-[var(--border-main)] ${
                  task.type === 'project' ? 'font-semibold bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]' : 'pl-8'
                }`}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: task.color }}
                    />
                    <span className="truncate">{task.name}</span>
                  </div>
                  {task.type === 'task' && (
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      {task.progress}% complete
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="flex-1 relative h-16">
                  {/* Task Bar */}
                  <div
                    className="absolute top-3 h-10 rounded-md flex items-center justify-center text-xs text-white font-medium"
                    style={{
                      ...getTaskPosition(task),
                      backgroundColor: task.color,
                    }}
                  >
                    {/* Progress Bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-black/20 rounded-l-md"
                      style={{ width: `${task.progress}%` }}
                    />
                    <span className="relative z-10 px-2 truncate">
                      {task.type === 'project' ? task.name : `${task.progress}%`}
                    </span>
                  </div>

                  {/* Delayed/At Risk Indicators */}
                  {isTaskDelayed(task) && (
                    <div className="absolute right-2 top-1 px-1.5 py-0.5 bg-danger-500 text-white text-xs rounded">
                      Delayed
                    </div>
                  )}
                  {!isTaskDelayed(task) && isTaskAtRisk(task) && (
                    <div className="absolute right-2 top-1 px-1.5 py-0.5 bg-warning-500 text-white text-xs rounded">
                      At Risk
                    </div>
                  )}
                </div>
              </div>
            ))}

            {ganttTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                  <BarChart3 className="h-8 w-8 text-primary-500" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Gantt View Coming Soon</h2>
                <p className="text-sm text-[var(--text-muted)] max-w-md">
                  The Gantt chart view is under development. Project timelines will be visualized here once task management is enabled.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}
