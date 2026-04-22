'use client';

import {useMemo, useState} from 'react';
import {logger} from '@/lib/utils/logger';
import {
  AlertCircle,
  ArrowRight,
  BarChart2,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  FileText,
  Link2,
  Save,
  Target,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui';
import {
  calculateTaskDuration,
  CalendarEvent,
  GanttTask,
  getPriorityColor,
  getStatusColor,
  isTaskAtRisk,
  isTaskDelayed,
} from '@/lib/types/hrms/project-calendar';
import {format} from 'date-fns';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: GanttTask | CalendarEvent | null;
  onUpdateProgress?: (taskId: string, progress: number) => Promise<void>;
  onUpdateStatus?: (taskId: string, status: string) => Promise<void>;
  readonly?: boolean;
}

const STATUS_OPTIONS = [
  {value: 'BACKLOG', label: 'Backlog'},
  {value: 'TODO', label: 'To Do'},
  {value: 'IN_PROGRESS', label: 'In Progress'},
  {value: 'IN_REVIEW', label: 'In Review'},
  {value: 'BLOCKED', label: 'Blocked'},
  {value: 'DONE', label: 'Done'},
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
        return 'bg-accent-100 text-accent-700 dark:bg-accent-900/50 dark:text-accent-300';
      case 'task':
        return 'bg-accent-300 text-accent-900 dark:bg-accent-900/50 dark:text-accent-500';
      case 'milestone':
        return 'bg-warning-100 text-warning-700 dark:bg-warning-900/50 dark:text-warning-300';
      case 'deadline':
        return 'bg-danger-100 text-danger-700 dark:bg-danger-900/50 dark:text-danger-300';
      case 'phase':
        return 'bg-accent-100 text-accent-700 dark:bg-accent-900/50 dark:text-accent-300';
      default:
        return 'bg-[var(--bg-surface)] text-[var(--text-secondary)]';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(normalizedTask.type)}`}>
            {getTypeLabel(normalizedTask.type)}
          </span>
          <h2 className='text-xl font-semibold text-primary'>
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
              <label className='block text-sm font-medium text-secondary mb-2'>
                Status
              </label>
              {readonly || !onUpdateStatus ? (
                <span
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${getStatusColor(normalizedTask.status)}20`,
                    color: getStatusColor(normalizedTask.status),
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{backgroundColor: getStatusColor(normalizedTask.status)}}
                  />
                  {normalizedTask.status.replace('_', ' ')}
                </span>
              ) : (
                <select
                  value={normalizedTask.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isSaving}
                  className='w-full px-4 py-2 border border-subtle rounded-lg bg-[var(--bg-card)] text-primary'
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
                <label className='block text-sm font-medium text-secondary mb-2'>
                  Priority
                </label>
                <span
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${getPriorityColor(normalizedTask.priority)}20`,
                    color: getPriorityColor(normalizedTask.priority),
                  }}
                >
                  <AlertCircle className="w-4 h-4"/>
                  {normalizedTask.priority}
                </span>
              </div>
            )}
          </div>

          {/* Warning Badges */}
          {(isDelayed || isAtRisk) && (
            <div className="flex flex-wrap gap-2">
              {isDelayed && (
                <span
                  className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-status-danger-bg text-status-danger-text'>
                  <AlertCircle className="w-4 h-4"/>
                  Delayed
                </span>
              )}
              {isAtRisk && !isDelayed && (
                <span
                  className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-status-warning-bg text-status-warning-text'>
                  <AlertCircle className="w-4 h-4"/>
                  At Risk
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {normalizedTask.description && (
            <div>
              <label className='block text-sm font-medium text-secondary mb-2'>
                <FileText className="w-4 h-4 inline mr-1"/>
                Description
              </label>
              <p className='text-secondary bg-base rounded-lg p-4'>
                {normalizedTask.description}
              </p>
            </div>
          )}

          {/* Date Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className='bg-base rounded-lg p-4'>
              <div className='flex items-center gap-2 text-muted mb-1'>
                <Calendar className="w-4 h-4"/>
                <span className="text-sm">Start Date</span>
              </div>
              <p className='font-semibold text-primary'>
                {format(normalizedTask.startDate, 'MMM d, yyyy')}
              </p>
            </div>
            <div className='bg-base rounded-lg p-4'>
              <div className='flex items-center gap-2 text-muted mb-1'>
                <Calendar className="w-4 h-4"/>
                <span className="text-sm">End Date</span>
              </div>
              <p className='font-semibold text-primary'>
                {format(normalizedTask.endDate, 'MMM d, yyyy')}
              </p>
            </div>
            <div className='bg-base rounded-lg p-4'>
              <div className='flex items-center gap-2 text-muted mb-1'>
                <Clock className="w-4 h-4"/>
                <span className="text-sm">Duration</span>
              </div>
              <p className='font-semibold text-primary'>
                {duration} day{duration !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Progress */}
          {normalizedTask.progress !== undefined && (
            <div>
              <div className="row-between mb-2">
                <label className='text-sm font-medium text-secondary flex items-center gap-2'>
                  <TrendingUp className="w-4 h-4"/>
                  Progress
                </label>
                {!readonly && onUpdateProgress && (
                  <button
                    onClick={isEditingProgress ? handleSaveProgress : handleStartEditProgress}
                    disabled={isSaving}
                    className='text-sm text-accent hover:text-accent flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
                  >
                    {isEditingProgress ? (
                      <>
                        <Save className="w-4 h-4"/>
                        Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4"/>
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
                  <div className='flex justify-between text-sm text-muted'>
                    <span>0%</span>
                    <span className='font-medium text-accent'>{editProgress}%</span>
                    <span>100%</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className='h-3 bg-elevated rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-accent rounded-full transition-all duration-300'
                      style={{width: `${normalizedTask.progress}%`}}
                    />
                  </div>
                  <div className='flex justify-between text-sm text-muted'>
                    <span>{normalizedTask.progress}% complete</span>
                    {normalizedTask.progress === 100 && (
                      <span className='flex items-center gap-1 text-status-success-text'>
                        <CheckCircle className="w-4 h-4"/>
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
                <div className='bg-base rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-muted mb-1'>
                    <Timer className="w-4 h-4"/>
                    <span className="text-sm">Estimated</span>
                  </div>
                  <p className='font-semibold text-primary'>
                    {normalizedTask.estimatedHours} hours
                  </p>
                </div>
              )}
              {normalizedTask.actualHours !== undefined && (
                <div className='bg-base rounded-lg p-4'>
                  <div className='flex items-center gap-2 text-muted mb-1'>
                    <BarChart2 className="w-4 h-4"/>
                    <span className="text-sm">Actual</span>
                  </div>
                  <p className='font-semibold text-primary'>
                    {normalizedTask.actualHours} hours
                    {normalizedTask.estimatedHours && (
                      <span
                        className={`ml-2 text-sm ${
                          normalizedTask.actualHours > normalizedTask.estimatedHours
                            ? 'text-danger-600'
                            : 'text-success-600'
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
              <label
                className='block text-sm font-medium text-secondary mb-4 flex items-center gap-2'>
                <Users className="w-4 h-4"/>
                Assigned To ({normalizedTask.assignees.length})
              </label>
              <div className="space-y-2">
                {normalizedTask.assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className='row-between p-4 bg-base rounded-lg'
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className='w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center text-accent font-medium'>
                        {assignee.employeeName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className='font-medium text-primary'>
                          {assignee.employeeName}
                        </p>
                        {assignee.role && (
                          <p className='text-sm text-muted'>{assignee.role}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className='text-sm font-medium text-secondary'>
                        {assignee.allocationPercentage}%
                      </span>
                      <p className='text-xs text-muted'>Allocation</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {normalizedTask.dependencies && normalizedTask.dependencies.length > 0 && (
            <div>
              <label
                className='block text-sm font-medium text-secondary mb-4 flex items-center gap-2'>
                <Link2 className="w-4 h-4"/>
                Dependencies ({normalizedTask.dependencies.length})
              </label>
              <div className="space-y-2">
                {normalizedTask.dependencies.map((dep) => (
                  <div
                    key={dep.id}
                    className='flex items-center gap-2 p-4 bg-base rounded-lg'
                  >
                    <ArrowRight className='w-4 h-4 text-muted'/>
                    <span className='text-secondary'>
                      {dep.type.replace(/-/g, ' ')}
                    </span>
                    {dep.lag && (
                      <span className='text-sm text-muted'>
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
            <div className='bg-base rounded-lg p-4'>
              <div className='flex items-center gap-2 text-muted mb-1'>
                <Target className="w-4 h-4"/>
                <span className="text-sm">Project</span>
              </div>
              <p className='font-medium text-primary'>
                {normalizedTask.projectName}
              </p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className='px-4 py-2 border border-subtle rounded-lg hover:bg-surface transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
        >
          Close
        </button>
      </ModalFooter>
    </Modal>
  );
}
