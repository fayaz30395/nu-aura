'use client';

import React, {useState} from 'react';
import {Clock, Plus, X} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {SlidePanel} from '@/components/ui/SlidePanel';
import {useAuth} from '@/lib/hooks/useAuth';
import {usePermissions, Roles} from '@/lib/hooks/usePermissions';
import {
  getGetEmployeeTimesheetsQueryKey,
  useGetEmployeeTimesheets,
  useCreateTimesheet,
  useAddTimeEntry,
  useSubmitTimesheet,
  useApproveTimesheet,
  useRejectTimesheet,
} from '@/lib/generated/api/psa-timesheet-controller/psa-timesheet-controller';
import {PSATimesheetStatus, PSATimeEntryActivityType} from '@/lib/generated/api/model';
import type {PSATimesheet, PSATimeEntry} from '@/lib/generated/api/model';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved', REJECTED: 'Rejected',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};
const ACTIVITY_LABELS: Record<string, string> = {
  DEVELOPMENT: 'Development', TESTING: 'Testing', DESIGN: 'Design',
  DOCUMENTATION: 'Documentation', MEETING: 'Meeting', CODE_REVIEW: 'Code Review',
  PLANNING: 'Planning', SUPPORT: 'Support', RESEARCH: 'Research', OTHER: 'Other',
};
const ADMIN_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN];

type CreateTSForm = {weekStartDate: string; weekEndDate: string};
const BLANK_TS: CreateTSForm = {weekStartDate: '', weekEndDate: ''};

type EntryForm = {
  projectId: string; taskId: string; entryDate: string; hours: string;
  activityType: string; isBillable: boolean; isOvertime: boolean; workDescription: string;
};
const BLANK_ENTRY: EntryForm = {
  projectId: '', taskId: '', entryDate: '', hours: '',
  activityType: PSATimeEntryActivityType.DEVELOPMENT,
  isBillable: true, isOvertime: false, workDescription: '',
};

function CreateTimesheetPanel({employeeId, onClose}: {employeeId: string; onClose: () => void}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateTSForm>(BLANK_TS);
  const [error, setError] = useState('');
  const mutation = useCreateTimesheet();

  const set = (k: keyof CreateTSForm, v: string) => setForm(p => ({...p, [k]: v}));

  const handleSave = () => {
    if (!form.weekStartDate || !form.weekEndDate) {
      setError('Both start and end dates are required');
      return;
    }
    setError('');
    const data: PSATimesheet = {
      employeeId,
      weekStartDate: form.weekStartDate,
      weekEndDate: form.weekEndDate,
      status: PSATimesheetStatus.DRAFT,
    };
    mutation.mutate({data}, {
      onSuccess: () => {
        queryClient.invalidateQueries({queryKey: getGetEmployeeTimesheetsQueryKey(employeeId)});
        onClose();
      },
      onError: () => setError('Failed to create timesheet'),
    });
  };

  return (
    <SlidePanel onClose={onClose} title="New Timesheet">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">New Timesheet</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[var(--text-muted)]"/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="timesheet-week-start" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Week Start *</label>
            <Input id="timesheet-week-start" type="date" value={form.weekStartDate} onChange={e => set('weekStartDate', e.target.value)} className="h-8 text-sm"/>
          </div>
          <div>
            <label htmlFor="timesheet-week-end" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Week End *</label>
            <Input id="timesheet-week-end" type="date" value={form.weekEndDate} onChange={e => set('weekEndDate', e.target.value)} className="h-8 text-sm"/>
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

function AddEntryPanel({
  timesheet, employeeId, onClose,
}: {timesheet: PSATimesheet; employeeId: string; onClose: () => void}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EntryForm>(BLANK_ENTRY);
  const [error, setError] = useState('');
  const mutation = useAddTimeEntry();

  const set = <K extends keyof EntryForm>(k: K, v: EntryForm[K]) =>
    setForm(p => ({...p, [k]: v}));

  const handleSave = () => {
    if (!form.entryDate || !form.hours) {
      setError('Date and hours are required');
      return;
    }
    if (Number(form.hours) <= 0 || Number(form.hours) > 24) {
      setError('Hours must be between 0 and 24');
      return;
    }
    setError('');
    const data: PSATimeEntry = {
      timesheetId: timesheet.id,
      employeeId,
      projectId: form.projectId.trim() || undefined,
      taskId: form.taskId.trim() || undefined,
      entryDate: form.entryDate,
      hours: Number(form.hours),
      activityType: form.activityType as PSATimeEntry['activityType'],
      isBillable: form.isBillable,
      isOvertime: form.isOvertime,
      workDescription: form.workDescription.trim() || undefined,
    };
    mutation.mutate({id: timesheet.id!, data}, {
      onSuccess: () => {
        queryClient.invalidateQueries({queryKey: getGetEmployeeTimesheetsQueryKey(employeeId)});
        onClose();
      },
      onError: () => setError('Failed to add entry'),
    });
  };

  return (
    <SlidePanel onClose={onClose} title="Add Time Entry">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Add Time Entry</h2>
            <p className="text-xs text-[var(--text-muted)]">{timesheet.weekStartDate} – {timesheet.weekEndDate}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[var(--text-muted)]"/></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="timesheet-entry-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Date *</label>
              <Input id="timesheet-entry-date" type="date" value={form.entryDate} onChange={e => set('entryDate', e.target.value)} className="h-8 text-sm"/>
            </div>
            <div>
              <label htmlFor="timesheet-entry-hours" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Hours *</label>
              <Input id="timesheet-entry-hours" type="number" step="0.5" min="0.5" max="24" value={form.hours}
                onChange={e => set('hours', e.target.value)} className="h-8 text-sm" placeholder="8"/>
            </div>
          </div>
          <div>
            <label htmlFor="timesheet-entry-activity" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Activity</label>
            <select id="timesheet-entry-activity" value={form.activityType} onChange={e => set('activityType', e.target.value)}
              className="input-aura w-full h-8 text-sm">
              {Object.values(PSATimeEntryActivityType).map(t => (
                <option key={t} value={t}>{ACTIVITY_LABELS[t] ?? t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="timesheet-entry-project-id" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project ID</label>
            <Input id="timesheet-entry-project-id" value={form.projectId} onChange={e => set('projectId', e.target.value)}
              className="h-8 text-sm" placeholder="Optional project ID"/>
          </div>
          <div>
            <label htmlFor="timesheet-entry-task-id" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Task ID</label>
            <Input id="timesheet-entry-task-id" value={form.taskId} onChange={e => set('taskId', e.target.value)}
              className="h-8 text-sm" placeholder="Optional task ID"/>
          </div>
          <div>
            <label htmlFor="timesheet-entry-description" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea id="timesheet-entry-description" value={form.workDescription} onChange={e => set('workDescription', e.target.value)}
              rows={2} className="input-aura w-full text-sm resize-none" placeholder="What did you work on?"/>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" checked={form.isBillable} onChange={e => set('isBillable', e.target.checked)}
                className="w-3 h-3"/>
              Billable
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" checked={form.isOvertime} onChange={e => set('isOvertime', e.target.checked)}
                className="w-3 h-3"/>
              Overtime
            </label>
          </div>
          {error && <p className="text-xs text-danger-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={mutation.isPending} className="flex-1">
              {mutation.isPending ? 'Adding…' : 'Add Entry'}
            </Button>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

function TimesheetRow({
  ts, employeeId, isAdmin, onAddEntry,
}: {ts: PSATimesheet; employeeId: string; isAdmin: boolean; onAddEntry: (ts: PSATimesheet) => void}) {
  const queryClient = useQueryClient();
  const submitMut = useSubmitTimesheet();
  const approveMut = useApproveTimesheet();
  const rejectMut = useRejectTimesheet();

  const invalidate = () =>
    queryClient.invalidateQueries({queryKey: getGetEmployeeTimesheetsQueryKey(employeeId)});

  const statusCls = STATUS_COLORS[ts.status ?? ''] ?? 'bg-[var(--bg-secondary)] text-[var(--text-muted)]';
  const canSubmit = ts.status === PSATimesheetStatus.DRAFT;
  const canAdminAct = isAdmin && (ts.status === PSATimesheetStatus.SUBMITTED || ts.status === PSATimesheetStatus.UNDER_REVIEW);
  const canAddEntry = ts.status === PSATimesheetStatus.DRAFT;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-primary)]">
      <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {ts.weekStartDate} – {ts.weekEndDate}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusCls}`}>
            {STATUS_LABELS[ts.status ?? ''] ?? ts.status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[10px] text-[var(--text-muted)]">Total: {ts.totalHours ?? 0}h</span>
          <span className="text-[10px] text-[var(--text-muted)]">Billable: {ts.billableHours ?? 0}h</span>
          {ts.rejectionReason && (
            <span className="text-[10px] text-red-500 truncate max-w-40">Reason: {ts.rejectionReason}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {canAddEntry && (
          <Button size="sm" variant="outline" onClick={() => onAddEntry(ts)}
            className="h-6 text-[10px] px-2">+Entry</Button>
        )}
        {canSubmit && (
          <Button size="sm" onClick={() => submitMut.mutate({id: ts.id!}, {onSuccess: invalidate})}
            disabled={submitMut.isPending} className="h-6 text-[10px] px-2">Submit</Button>
        )}
        {canAdminAct && (
          <>
            <Button size="sm" onClick={() => approveMut.mutate({id: ts.id!, data: 'Approved'}, {onSuccess: invalidate})}
              disabled={approveMut.isPending}
              className="h-6 text-[10px] px-2 bg-green-600 hover:bg-green-700 text-white">✓</Button>
            <Button size="sm" variant="outline" onClick={() => rejectMut.mutate({id: ts.id!, data: 'Rejected'}, {onSuccess: invalidate})}
              disabled={rejectMut.isPending}
              className="h-6 text-[10px] px-2 text-red-600 border-red-300 hover:bg-red-50">✕</Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PSATimesheetsPage() {
  const {isAuthenticated, hasHydrated, user} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
  const [showCreate, setShowCreate] = useState(false);
  const [addEntryTarget, setAddEntryTarget] = useState<PSATimesheet | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const employeeId = user?.employeeId ?? '';
  const isAdmin = isReady && hasAnyRole(...ADMIN_ROLES);
  const enabled = isAuthenticated && hasHydrated && !!employeeId;

  const {data, isLoading} = useGetEmployeeTimesheets(employeeId, {query: {enabled}});

  const all: PSATimesheet[] = Array.isArray(data)
    ? data
    : ((data as unknown) as {content?: PSATimesheet[]})?.content ?? [];

  const timesheets = statusFilter === 'ALL'
    ? all
    : all.filter(t => t.status === statusFilter);

  return (
    <AppLayout
      activeMenuItem="psa-timesheets"
      breadcrumbs={[
        {label: 'Projects', href: '/projects'},
        {label: 'PSA', href: '/projects/psa'},
        {label: 'Timesheets'},
      ]}
    >
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">PSA Timesheets</h1>
            <p className="page-subtitle">Track weekly hours for professional services projects.</p>
          </div>
          {isAuthenticated && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5"/>New Timesheet
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {['ALL', ...Object.values(PSATimesheetStatus)].map(s => (
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
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-[var(--bg-secondary)] animate-pulse"/>)}
          </div>
        ) : timesheets.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Clock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2"/>
              <p className="text-sm text-[var(--text-muted)]">
                {statusFilter === 'ALL' ? 'No timesheets yet' : `No ${STATUS_LABELS[statusFilter]?.toLowerCase()} timesheets`}
              </p>
              {statusFilter === 'ALL' && (
                <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="mt-4">
                  Create First Timesheet
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {timesheets.map(ts => (
              <TimesheetRow
                key={ts.id}
                ts={ts}
                employeeId={employeeId}
                isAdmin={isAdmin}
                onAddEntry={setAddEntryTarget}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && employeeId && (
        <CreateTimesheetPanel employeeId={employeeId} onClose={() => setShowCreate(false)}/>
      )}
      {addEntryTarget && employeeId && (
        <AddEntryPanel
          timesheet={addEntryTarget}
          employeeId={employeeId}
          onClose={() => setAddEntryTarget(null)}
        />
      )}
    </AppLayout>
  );
}
