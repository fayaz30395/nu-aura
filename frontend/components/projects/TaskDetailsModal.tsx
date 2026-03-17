'use client';

import { useState, useMemo } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Target,
  TrendingUp,
  Edit2,
  Save,
  FileText,
  Link2,
  Timer,
  BarChart2,
} from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui';
import {
  GanttTask,
  CalendarEvent,
  getStatusColor,
  getPriorityColor,
  calculateTaskDuration,
  isTaskDelayed,
  isTaskAtRisk,
} from '@/lib/types/project-calendar';
import { format } from 'date-fns';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: GanttTask | CalendarEvent | null;
  onUpdateProgress?: (taskId: string, progress: number) => Promise<void>;
  onUpdateStatus?: (taskId: string, status: string) => Promise<void>;
  readonly?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'DONE', label: 'Done' },
];

export function TaskDetailsModal({
  isOpen,
  onClose,
  task,
  onUpdateProgress,
  onUpdateStatus,
  readonly = false,
}: TaskDetailsModalProps) {
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [editProgress, setEditProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Normalize task data (handle both GanttTask and CalendarEvent)
  const normalizedTask = useMemo(() => {
    if (!task) return null;

    // Check if it's a GanttTask (has progress property)
    const isGanttTask = 'progress' in task;

    return {
      id: task.id,
      name: isGanttTask ? (task as GanttTask).name : (task as CalendarEvent).title,
      type: task.type,
      startDate: task.startDate,
      endDate: task.endDate,
      status: task.status,
      priority: task.priority,
      progress: isGanttTask ? (task as GanttTask).progress : undefined,
      projectId: isGanttTask ? (task as GanttTask).projectId : (task as CalendarEvent).projectId,
      projectName: !isGanttTask ? (task as CalendarEvent).projectName : undefined,
      description: !isGanttTask ? (task as CalendarEvent).description : undefined,
      assignees: isGanttTask
        ? (task as GanttTask).assignees
        : (task as CalendarEvent).assignees?.map((a) => ({
            id: a.id,
            employeeId: a.id,
            employeeName: a.name,
            avatar: a.avatar,
            role: a.role,
            allocationPercentage: 100,
            startDate: task.startDate,
          })),
      dependencies: isGanttTask ? (task as GanttTask).dependencies : undefined,
      estimatedHours: isGanttTask ? (task as GanttTask).estimatedHours : undefined,
      actualHours: isGanttTask ? (task as GanttTask).actualHours : undefined,
    };
  }, [task]);

  if (!normalizedTask) return null;

  const duration = calculateTaskDuration(normalizedTask.startDate, normalizedTask.endDate);
  const isDelayed = 'progress' in (task || {}) && isTaskDelayed(task as GanttTask);
  const isAtRisk = 'progress' in (task || {}) && isTaskAtRisk(task as GanttTask);

  const handleStartEditProgress = () => {
    setEditProgress(normalizedTask.progress || 0);
    setIsEditingProgress(true);
  };

  const handleSaveProgress = async () => {
    if (!onUpdateProgress) return;
    setIsSaving(true);
    try {
      await onUpdateProgress(normalizedTask.id, editProgress);
      setIsEditingProgress(false);
    } catch (error) {
      logger.error('Failed to update progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!onUpdateStatus) return;
    setIsSaving(true);
    try {
      await onUpdateStatus(normalizedTask.id, newStatus);
    } catch (error) {
      logger.error('Failed to update status:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project':
        return 'Project';
      case 'task':
        return 'Task';
      case 'milestone':
        return 'Milestone';
      case 'deadline':
        return 'Deadline';
      case 'phase':
        return 'Phase';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'project':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      case 'task':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
      case 'milestone':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
      case 'deadline':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
      case 'phase':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300';
      default:
        return 'bg-[var(--bg-surface)] text-gray-700 dark:bg-surface-800 dark:text-gray-300';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(normalizedTask.type)}`}>
            {getTypeLabel(normalizedTask.type)}
          </span>
          <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">
            {normalizedTask.name}
          </h2>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-6">
          {/* Status and Priority Row */}
          <div className="flex flex-wrap gap-4">
            {/* Status */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">
                Status
              </label>
              {readonly || !onUpdateStatus ? (
                <span
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${getStatusColor(normalizedTask.status)}20`,
                    color: getStatusColor(normalizedTask.status),
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getStatusColor(normalizedTask.status) }}
                  />
                  {normalizedTask.status.replace('_', ' ')}
                </span>
              ) : (
                <select
                  value={normalizedTask.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-card)] text-surface-900 dark:text-surface-100"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Priority */}
            {normalizedTask.priority && (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">
                  Priority
                </label>
                <span
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${getPriorityColor(normalizedTask.priority)}20`,
                    color: getPriorityColor(normalizedTask.priority),
                  }}
                >
                  <AlertCircle className="w-4 h-4" />
                  {normalizedTask.priority}
                </span>
              </div>
            )}
          </div>

          {/* Warning Badges */}
          {(isDelayed || isAtRisk) && (
            <div className="flex flex-wrap gap-2">
              {isDelayed && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                  <AlertCircle className="w-4 h-4" />
                  Delayed
                </span>
              )}
              {isAtRisk && !isDelayed && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4" />
                  At Risk
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {normalizedTask.description && (
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Description
              </label>
              <p className="text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-900 rounded-lg p-4">
                {normalizedTask.description}
              </p>
            </div>
          )}

          {/* Date Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-surface-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Start Date</span>
              </div>
              <p className="font-semibold text-surface-900 dark:text-surface-50">
                {format(normalizedTask.startDate, 'MMM d, yyyy')}
              </p>
            </div>
            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-surface-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">End Date</span>
              </div>
              <p className="font-semibold text-surface-900 dark:text-surface-50">
                {format(normalizedTask.endDate, 'MMM d, yyyy')}
              </p>
            </div>
            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-surface-500 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Duration</span>
              </div>
              <p className="font-semibold text-surface-900 dark:text-surface-50">
                {duration} day{duration !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Progress */}
          {normalizedTask.progress !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-surface-600 dark:text-surface-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Progress
                </label>
                {!readonly && onUpdateProgress && (
                  <button
                    onClick={isEditingProgress ? handleSaveProgress : handleStartEditProgress}
                    disabled={isSaving}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    {isEditingProgress ? (
                      <>
                        <Save className="w-4 h-4" />
                        Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </>
                    )}
                  </button>
                )}
              </div>
              {isEditingProgress ? (
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editProgress}
                    onChange={(e) => setEditProgress(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-surface-500">
                    <span>0%</span>
                    <span className="font-medium text-primary-600">{editProgress}%</span>
                    <span>100%</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-300"
                      style={{ width: `${normalizedTask.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-surface-500">
                    <span>{normalizedTask.progress}% complete</span>
                    {normalizedTask.progress === 100 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Time Tracking */}
          {(normalizedTask.estimatedHours || normalizedTask.actualHours) && (
            <div className="grid grid-cols-2 gap-4">
              {normalizedTask.estimatedHours && (
                <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-surface-500 mb-1">
                    <Timer className="w-4 h-4" />
                    <span className="text-sm">Estimated</span>
                  </div>
                  <p className="font-semibold text-surface-900 dark:text-surface-50">
                    {normalizedTask.estimatedHours} hours
                  </p>
                </div>
              )}
              {normalizedTask.actualHours !== undefined && (
                <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-surface-500 mb-1">
                    <BarChart2 className="w-4 h-4" />
                    <span className="text-sm">Actual</span>
                  </div>
                  <p className="font-semibold text-surface-900 dark:text-surface-50">
                    {normalizedTask.actualHours} hours
                    {normalizedTask.estimatedHours && (
                      <span
                        className={`ml-2 text-sm ${
                          normalizedTask.actualHours > normalizedTask.estimatedHours
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        (
                        {normalizedTask.actualHours > normalizedTask.estimatedHours ? '+' : ''}
                        {((normalizedTask.actualHours / normalizedTask.estimatedHours - 1) * 100).toFixed(0)}
                        %)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Assignees */}
          {normalizedTask.assignees && normalizedTask.assignees.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assigned To ({normalizedTask.assignees.length})
              </label>
              <div className="space-y-2">
                {normalizedTask.assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-900 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 font-medium">
                        {assignee.employeeName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-surface-900 dark:text-surface-50">
                          {assignee.employeeName}
                        </p>
                        {assignee.role && (
                          <p className="text-sm text-surface-500">{assignee.role}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                        {assignee.allocationPercentage}%
                      </span>
                      <p className="text-xs text-surface-500">Allocation</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {normalizedTask.dependencies && normalizedTask.dependencies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Dependencies ({normalizedTask.dependencies.length})
              </label>
              <div className="space-y-2">
                {normalizedTask.dependencies.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center gap-2 p-4 bg-surface-50 dark:bg-surface-900 rounded-lg"
                  >
                    <ArrowRight className="w-4 h-4 text-surface-400" />
                    <span className="text-surface-700 dark:text-surface-300">
                      {dep.type.replace(/-/g, ' ')}
                    </span>
                    {dep.lag && (
                      <span className="text-sm text-surface-500">
                        ({dep.lag > 0 ? '+' : ''}{dep.lag} days)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project Reference */}
          {normalizedTask.projectName && (
            <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-surface-500 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-sm">Project</span>
              </div>
              <p className="font-medium text-surface-900 dark:text-surface-50">
                {normalizedTask.projectName}
              </p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          Close
        </button>
      </ModalFooter>
    </Modal>
  );
}
