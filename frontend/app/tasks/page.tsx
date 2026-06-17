'use client';

import React, {useState} from 'react';
import {CheckSquare, Plus, X} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {SlidePanel} from '@/components/ui/SlidePanel';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  getListByAssigneeQueryKey,
  useListByAssignee,
  useCreate,
  useUpdateStatus4,
  useDelete,
} from '@/lib/generated/api/task-controller/task-controller';
import {
  CreateRequestPriority,
  CreateRequestType,
  StatusUpdateRequestStatus,
} from '@/lib/generated/api/model';
import type {CreateRequest, ListResponse, StatusUpdateRequest} from '@/lib/generated/api/model';

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: 'Backlog', TODO: 'To Do', IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review', BLOCKED: 'Blocked', DONE: 'Done', CANCELLED: 'Cancelled',
};
const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  TODO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  IN_REVIEW: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  BLOCKED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  DONE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-slate-400', MEDIUM: 'text-blue-500',
  HIGH: 'text-amber-500', CRITICAL: 'text-red-500',
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
};
const TYPE_LABELS: Record<string, string> = {
  EPIC: 'Epic', STORY: 'Story', TASK: 'Task',
  SUBTASK: 'Subtask', BUG: 'Bug',
};

type TaskForm = {
  title: string; description: string; priority: string;
  type: string; dueDate: string; estimatedHours: string;
  projectId: string;
};
const BLANK: TaskForm = {
  title: '', description: '',
  priority: CreateRequestPriority.MEDIUM,
  type: CreateRequestType.TASK,
  dueDate: '', estimatedHours: '', projectId: '',
};

function CreateTaskPanel({
  assigneeId, onClose,
}: {assigneeId: string; onClose: () => void}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TaskForm>(BLANK);
  const [error, setError] = useState('');
  const mutation = useCreate();

  const set = <K extends keyof TaskForm>(k: K, v: TaskForm[K]) =>
    setForm(p => ({...p, [k]: v}));

  const handleSave = () => {
    if (!form.title.trim()) {setError('Title is required'); return;}
    setError('');
    const data: CreateRequest = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority as CreateRequest['priority'],
      type: form.type as CreateRequest['type'],
      dueDate: form.dueDate || undefined,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      assigneeId,
      projectId: form.projectId.trim() || undefined,
    };
    mutation.mutate({data}, {
      onSuccess: () => {
        queryClient.invalidateQueries({queryKey: getListByAssigneeQueryKey(assigneeId)});
        onClose();
      },
      onError: () => setError('Failed to create task'),
    });
  };

  return (
    <SlidePanel onClose={onClose} title="New Task">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">New Task</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[var(--text-muted)]"/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="task-title" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Title *</label>
            <Input id="task-title" value={form.title} onChange={e => set('title', e.target.value)}
              className="h-8 text-sm" placeholder="Task title"/>
          </div>
          <div>
            <label htmlFor="task-description" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea id="task-description" value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} className="input-aura w-full text-sm resize-none" placeholder="Optional details..."/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="task-type" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Type</label>
              <select id="task-type" value={form.type} onChange={e => set('type', e.target.value)}
                className="input-aura w-full h-8 text-sm">
                {Object.values(CreateRequestType).map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Priority</label>
              <select id="task-priority" value={form.priority} onChange={e => set('priority', e.target.value)}
                className="input-aura w-full h-8 text-sm">
                {Object.values(CreateRequestPriority).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p] ?? p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="task-due-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Due Date</label>
              <Input id="task-due-date" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className="h-8 text-sm"/>
            </div>
            <div>
              <label htmlFor="task-estimated-hours" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Est. Hours</label>
              <Input id="task-estimated-hours" type="number" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)}
                className="h-8 text-sm" placeholder="0"/>
            </div>
          </div>
          <div>
            <label htmlFor="task-project-id" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project ID</label>
            <Input id="task-project-id" value={form.projectId} onChange={e => set('projectId', e.target.value)}
              className="h-8 text-sm" placeholder="Optional project ID"/>
          </div>
          {error && <p className="text-xs text-danger-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={mutation.isPending} className="flex-1">
              {mutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

function TaskRow({
  task, assigneeId,
}: {task: ListResponse; assigneeId: string}) {
  const queryClient = useQueryClient();
  const updateStatusMut = useUpdateStatus4();
  const deleteMut = useDelete();

  const invalidate = () =>
    queryClient.invalidateQueries({queryKey: getListByAssigneeQueryKey(assigneeId)});

  const statusCls = STATUS_COLORS[task.status ?? ''] ?? 'bg-[var(--bg-secondary)] text-[var(--text-muted)]';
  const priorityCls = PRIORITY_COLORS[task.priority ?? ''] ?? 'text-[var(--text-muted)]';
  const isDone = task.status === StatusUpdateRequestStatus.DONE || task.status === StatusUpdateRequestStatus.CANCELLED;

  const advanceStatus = () => {
    const flow: string[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
    const idx = flow.indexOf(task.status ?? '');
    const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
    if (!next || !task.id) return;
    const data: StatusUpdateRequest = {status: next as StatusUpdateRequest['status']};
    updateStatusMut.mutate({id: task.id, data}, {onSuccess: invalidate});
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-primary)]">
      <button type="button" onClick={advanceStatus}
        className={`w-4 h-4 rounded border-2 shrink-0 transition-colors ${isDone ? 'bg-green-500 border-green-500' : 'border-[var(--border-main)] hover:border-[var(--accent)]'}`}>
        {isDone && <span className="text-white text-[8px] flex items-center justify-center w-full h-full">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium text-[var(--text-primary)] ${isDone ? 'line-through text-[var(--text-muted)]' : ''} truncate max-w-56`}>
            {task.title}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusCls}`}>
            {STATUS_LABELS[task.status ?? ''] ?? task.status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {task.taskCode && <span className="text-[10px] text-[var(--text-muted)] font-mono">{task.taskCode}</span>}
          <span className={`text-[10px] font-medium ${priorityCls}`}>{PRIORITY_LABELS[task.priority ?? ''] ?? task.priority}</span>
          {task.type && <span className="text-[10px] text-[var(--text-muted)]">{TYPE_LABELS[task.type] ?? task.type}</span>}
          {task.dueDate && (
            <span className={`text-[10px] ${task.overdue ? 'text-red-500 font-medium' : 'text-[var(--text-muted)]'}`}>
              {task.overdue ? '⚠ ' : ''}{task.dueDate}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!isDone && !updateStatusMut.isPending && (
          <Button size="sm" variant="outline" onClick={advanceStatus}
            className="h-6 text-[10px] px-2">→</Button>
        )}
        <Button size="sm" variant="outline" onClick={() => task.id && deleteMut.mutate({id: task.id}, {onSuccess: invalidate})}
          disabled={deleteMut.isPending}
          className="h-6 text-[10px] px-2 text-red-600 border-red-300 hover:bg-red-50">✕</Button>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const {isAuthenticated, hasHydrated, user} = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const employeeId = user?.employeeId ?? '';
  const enabled = isAuthenticated && hasHydrated && !!employeeId;

  const {data, isLoading} = useListByAssignee(
    employeeId,
    {pageable: {page: 0, size: 100}},
    {query: {enabled}}
  );

  const raw = (data as unknown) as {content?: ListResponse[]} | ListResponse[];
  const allTasks: ListResponse[] = Array.isArray(raw) ? raw : raw?.content ?? [];

  const tasks = statusFilter === 'ALL'
    ? allTasks
    : allTasks.filter(t => t.status === statusFilter);

  const openCount = allTasks.filter(t =>
    t.status !== StatusUpdateRequestStatus.DONE && t.status !== StatusUpdateRequestStatus.CANCELLED
  ).length;

  return (
    <AppLayout>
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Tasks</h1>
            <p className="page-subtitle">
              {openCount > 0 ? `${openCount} open task${openCount === 1 ? '' : 's'} assigned to you` : 'Track tasks assigned to you.'}
            </p>
          </div>
          {isAuthenticated && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5"/>New Task
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {['ALL', ...Object.values(StatusUpdateRequestStatus)].map(s => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                statusFilter === s
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
              }`}>
              {s === 'ALL' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-[var(--bg-secondary)] animate-pulse"/>)}
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2"/>
              <p className="text-sm text-[var(--text-muted)]">
                {statusFilter === 'ALL' ? 'No tasks assigned to you' : `No ${STATUS_LABELS[statusFilter]?.toLowerCase()} tasks`}
              </p>
              {statusFilter === 'ALL' && (
                <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="mt-4">
                  Create First Task
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.map(t => <TaskRow key={t.id} task={t} assigneeId={employeeId}/>)}
          </div>
        )}
      </div>

      {showCreate && employeeId && (
        <CreateTaskPanel assigneeId={employeeId} onClose={() => setShowCreate(false)}/>
      )}
    </AppLayout>
  );
}
