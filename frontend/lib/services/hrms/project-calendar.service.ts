import {apiClient} from '../../api/client';
import {
  CalendarEvent,
  CalendarFilterOptions,
  CalendarStatistics,
  GanttFilterOptions,
  GanttStatistics,
  GanttTask,
  getPriorityColor,
  getStatusColor,
} from '../../types/hrms/project-calendar';
import {Project} from '../../types/hrms/project';
import {Task, TaskListItem} from '../../types/core/task';

class ProjectCalendarService {
  // Calendar Events
  async getProjectCalendarEvents(
    startDate: Date,
    endDate: Date,
    filters?: CalendarFilterOptions
  ): Promise<CalendarEvent[]> {
    const params: Record<string, string> = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    if (filters?.projectIds?.length) params.projectIds = filters.projectIds.join(',');
    if (filters?.statuses?.length) params.statuses = filters.statuses.join(',');
    if (filters?.priorities?.length) params.priorities = filters.priorities.join(',');

    const response = await apiClient.get<CalendarEvent[]>('/projects/calendar/events', {params});
    return (Array.isArray(response.data) ? response.data : []).map(event => ({
      ...event,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
    }));
  }

  async getCalendarStatistics(startDate: Date, endDate: Date): Promise<CalendarStatistics> {
    const params = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    const response = await apiClient.get<CalendarStatistics>('/projects/calendar/statistics', {params});
    return response.data;
  }

  // Gantt Chart
  async getGanttTasks(filters?: GanttFilterOptions): Promise<GanttTask[]> {
    const params: Record<string, string> = {};

    if (filters?.projectIds?.length) params.projectIds = filters.projectIds.join(',');
    if (filters?.statuses?.length) params.statuses = filters.statuses.join(',');
    if (filters?.priorities?.length) params.priorities = filters.priorities.join(',');
    if (filters?.showOnlyDelayed) params.showOnlyDelayed = 'true';
    if (filters?.showOnlyAtRisk) params.showOnlyAtRisk = 'true';

    const response = await apiClient.get<GanttTask[]>('/projects/gantt/tasks', {params});
    return (Array.isArray(response.data) ? response.data : []).map(task => ({
      ...task,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
    }));
  }

  async updateTaskDates(taskId: string, startDate: string, endDate: string): Promise<GanttTask> {
    const response = await apiClient.put<GanttTask>(`/pm/tasks/${taskId}/dates`, {startDate, endDate});
    return {
      ...response.data,
      startDate: new Date(response.data.startDate),
      endDate: new Date(response.data.endDate),
    };
  }

  async updateTaskProgress(taskId: string, progress: number): Promise<GanttTask> {
    const response = await apiClient.put<GanttTask>(`/pm/tasks/${taskId}/progress`, {progress});
    return {
      ...response.data,
      startDate: new Date(response.data.startDate),
      endDate: new Date(response.data.endDate),
    };
  }

  async getGanttStatistics(filters?: GanttFilterOptions): Promise<GanttStatistics> {
    const params: Record<string, string> = {};
    if (filters?.projectIds?.length) params.projectIds = filters.projectIds.join(',');

    const response = await apiClient.get<GanttStatistics>('/projects/gantt/statistics', {params});
    return response.data;
  }

  // Helper: Convert projects and tasks to calendar events
  convertToCalendarEvents(projects: Project[], tasks: Task[]): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    // Add projects as events
    projects.forEach(project => {
      events.push({
        id: `project-${project.id}`,
        title: project.name,
        type: 'project',
        startDate: new Date(project.startDate),
        endDate: project.expectedEndDate ? new Date(project.expectedEndDate) : new Date(),
        allDay: true,
        projectId: project.id,
        projectName: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        color: getStatusColor(project.status),
      });
    });

    // Add tasks as events
    tasks.forEach(task => {
      if (task.dueDate) {
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          type: task.type === 'EPIC' ? 'milestone' : 'task',
          startDate: task.startDate ? new Date(task.startDate) : new Date(),
          endDate: new Date(task.dueDate),
          allDay: false,
          projectId: task.projectId,
          taskId: task.id,
          description: task.description,
          status: task.status,
          priority: task.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
          color: getPriorityColor(task.priority),
          assignees: task.assigneeName ? [{
            id: task.assigneeId || '',
            name: task.assigneeName,
          }] : [],
        });
      }
    });

    return events;
  }

  // Helper: Convert projects and tasks to Gantt tasks
  convertToGanttTasks(projects: Project[], tasks: (Task | TaskListItem)[]): GanttTask[] {
    const ganttTasks: GanttTask[] = [];

    projects.forEach(project => {
      ganttTasks.push({
        id: project.id,
        name: project.name,
        type: 'project',
        startDate: new Date(project.startDate),
        endDate: project.expectedEndDate ? new Date(project.expectedEndDate) : new Date(),
        progress: this.calculateProjectProgress(project),
        status: project.status,
        priority: project.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        color: getStatusColor(project.status),
      });

      // Add tasks for this project
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      projectTasks.forEach(task => {
        if (task.dueDate) {
          ganttTasks.push({
            id: task.id,
            name: task.title,
            type: 'task',
            startDate: task.startDate ? new Date(task.startDate) : new Date(),
            endDate: new Date(task.dueDate),
            progress: task.progressPercentage || 0,
            status: task.status,
            priority: task.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
            color: getPriorityColor(task.priority),
            projectId: project.id,
            parentTaskId: task.parentTaskId,
            estimatedHours: task.estimatedHours,
            actualHours: task.actualHours,
          });
        }
      });
    });

    return ganttTasks;
  }

  private calculateProjectProgress(project: Project): number {
    if (project.status === 'COMPLETED') return 100;
    if (project.status === 'IN_PROGRESS') return 50;
    if (project.status === 'PLANNED') return 0;
    return 25;
  }
}

export const projectCalendarService = new ProjectCalendarService();
