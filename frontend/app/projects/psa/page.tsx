'use client';

import React, {useState} from 'react';
import {Briefcase, DollarSign, Edit2, Plus, Trash2, X} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {SlidePanel} from '@/components/ui/SlidePanel';
import {useAuth} from '@/lib/hooks/useAuth';
import {usePermissions, Roles} from '@/lib/hooks/usePermissions';
import {
  getGetAllProjectsQueryKey,
  useCreateProject,
  useDeleteProject,
  useGetAllProjects,
  useUpdateProject,
} from '@/lib/generated/api/psa-project-controller/psa-project-controller';
import {PSAProjectBillingType, PSAProjectStatus} from '@/lib/generated/api/model';
import type {PSAProject} from '@/lib/generated/api/model';

const ADMIN_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN];

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ON_HOLD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const BILLING_LABELS: Record<string, string> = {
  TIME_AND_MATERIAL: 'T&M',
  FIXED_PRICE: 'Fixed',
  NON_BILLABLE: 'Non-Billable',
  RETAINER: 'Retainer',
};

type FormState = {
  projectName: string;
  projectCode: string;
  description: string;
  status: string;
  billingType: string;
  billingRate: string;
  budget: string;
  startDate: string;
  endDate: string;
  isBillable: boolean;
};

const BLANK: FormState = {
  projectName: '',
  projectCode: '',
  description: '',
  status: PSAProjectStatus.PLANNED,
  billingType: PSAProjectBillingType.TIME_AND_MATERIAL,
  billingRate: '',
  budget: '',
  startDate: '',
  endDate: '',
  isBillable: true,
};

function toForm(p: PSAProject): FormState {
  return {
    projectName: p.projectName ?? '',
    projectCode: p.projectCode ?? '',
    description: p.description ?? '',
    status: p.status ?? PSAProjectStatus.PLANNED,
    billingType: p.billingType ?? PSAProjectBillingType.TIME_AND_MATERIAL,
    billingRate: p.billingRate != null ? String(p.billingRate) : '',
    budget: p.budget != null ? String(p.budget) : '',
    startDate: p.startDate ?? '',
    endDate: p.endDate ?? '',
    isBillable: p.isBillable ?? true,
  };
}

function ProjectPanel({
  project,
  onClose,
}: {
  project: PSAProject | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(project ? toForm(project) : BLANK);
  const [error, setError] = useState('');

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm(prev => ({...prev, [k]: v}));

  const invalidate = () =>
    queryClient.invalidateQueries({queryKey: getGetAllProjectsQueryKey()});

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();

  const handleSave = () => {
    if (!form.projectName.trim()) {
      setError('Project name is required');
      return;
    }
    setError('');
    const data: PSAProject = {
      projectName: form.projectName.trim(),
      projectCode: form.projectCode.trim() || undefined,
      description: form.description.trim() || undefined,
      status: form.status as PSAProject['status'],
      billingType: form.billingType as PSAProject['billingType'],
      billingRate: form.billingRate ? Number(form.billingRate) : undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      isBillable: form.isBillable,
    };
    const onSuccess = () => {invalidate(); onClose();};
    const onError = () => setError('Failed to save project');
    if (project?.id) {
      updateMutation.mutate({id: project.id, data}, {onSuccess, onError});
    } else {
      createMutation.mutate({data}, {onSuccess, onError});
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <SlidePanel onClose={onClose} title={project ? 'Edit Project' : 'New PSA Project'} widthClassName="max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">{project ? 'Edit Project' : 'New PSA Project'}</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[var(--text-muted)]"/></button>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="psa-project-name" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project Name *</label>
            <Input id="psa-project-name" value={form.projectName} onChange={e => set('projectName', e.target.value)} className="h-8 text-sm" placeholder="e.g. Client Portal Redesign"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="psa-project-code" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project Code</label>
              <Input id="psa-project-code" value={form.projectCode} onChange={e => set('projectCode', e.target.value)} className="h-8 text-sm" placeholder="PRJ-001"/>
            </div>
            <div>
              <label htmlFor="psa-project-status" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
              <select
                id="psa-project-status"
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="input-aura w-full h-8 text-sm"
              >
                {Object.values(PSAProjectStatus).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="psa-project-description" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea id="psa-project-description" value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="input-aura w-full text-sm resize-none" placeholder="Optional description..."/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="psa-project-billing-type" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Billing Type</label>
              <select
                id="psa-project-billing-type"
                value={form.billingType}
                onChange={e => set('billingType', e.target.value)}
                className="input-aura w-full h-8 text-sm"
              >
                {Object.values(PSAProjectBillingType).map(b => (
                  <option key={b} value={b}>{BILLING_LABELS[b]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="psa-project-billing-rate" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Billing Rate/hr</label>
              <Input id="psa-project-billing-rate" type="number" value={form.billingRate} onChange={e => set('billingRate', e.target.value)} className="h-8 text-sm" placeholder="0.00"/>
            </div>
          </div>
          <div>
            <label htmlFor="psa-project-budget" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Budget</label>
            <Input id="psa-project-budget" type="number" value={form.budget} onChange={e => set('budget', e.target.value)} className="h-8 text-sm" placeholder="Total project budget"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="psa-project-start-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
              <Input id="psa-project-start-date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="h-8 text-sm"/>
            </div>
            <div>
              <label htmlFor="psa-project-end-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Date</label>
              <Input id="psa-project-end-date" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className="h-8 text-sm"/>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={form.isBillable}
              onClick={() => set('isBillable', !form.isBillable)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${form.isBillable ? 'bg-[var(--accent)]' : 'bg-[var(--border-main)]'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${form.isBillable ? 'translate-x-4' : 'translate-x-0.5'}`}/>
            </button>
            <span className="text-xs text-[var(--text-secondary)]">Billable project</span>
          </div>

          {error && <p className="text-xs text-danger-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isPending} className="flex-1">
              {isPending ? 'Saving…' : 'Save Project'}
            </Button>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

function ProjectCard({project, onEdit, isAdmin}: {project: PSAProject; onEdit: () => void; isAdmin: boolean}) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useDeleteProject();

  const handleDelete = () => {
    deleteMutation.mutate({id: project.id ?? ''}, {
      onSuccess: () => queryClient.invalidateQueries({queryKey: getGetAllProjectsQueryKey()}),
    });
  };

  const statusCls = STATUS_COLORS[project.status ?? ''] ?? 'bg-[var(--bg-secondary)] text-[var(--text-muted)]';

  return (
    <Card className="hover:border-[var(--accent)] transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4 text-[var(--text-muted)]"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[var(--text-primary)]">{project.projectName}</span>
              {project.projectCode && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] font-mono">{project.projectCode}</span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusCls}`}>
                {STATUS_LABELS[project.status ?? ''] ?? project.status}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{project.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {project.billingType && (
                <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-0.5">
                  <DollarSign className="w-2.5 h-2.5"/>{BILLING_LABELS[project.billingType]}
                </span>
              )}
              {project.billingRate != null && (
                <span className="text-[10px] text-[var(--text-secondary)]">${project.billingRate}/hr</span>
              )}
              {project.budget != null && (
                <span className="text-[10px] text-[var(--text-secondary)]">Budget: ${Number(project.budget).toLocaleString()}</span>
              )}
              {project.startDate && (
                <span className="text-[10px] text-[var(--text-muted)]">{project.startDate}{project.endDate ? ` → ${project.endDate}` : ''}</span>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={onEdit} className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-secondary)]">
                <Edit2 className="w-3.5 h-3.5"/>
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={handleDelete} disabled={deleteMutation.isPending} className="text-[10px] px-2 py-1 rounded bg-danger-600 text-white hover:bg-danger-700">
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-[10px] px-2 py-1 rounded border border-[var(--border-main)] text-[var(--text-secondary)]">
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-danger-600 rounded hover:bg-[var(--bg-secondary)]">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PSAProjectsPage() {
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
  const [panel, setPanel] = useState<PSAProject | null | 'new'>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const isAdmin = isReady && hasAnyRole(...ADMIN_ROLES);
  const enabled = isAuthenticated && hasHydrated;

  const {data, isLoading} = useGetAllProjects(
    {pageable: {page: 0, size: 50}},
    {query: {enabled}}
  );

  const allProjects: PSAProject[] = Array.isArray(data)
    ? data
    : ((data as unknown) as {content?: PSAProject[]})?.content ?? [];

  const projects = statusFilter === 'ALL'
    ? allProjects
    : allProjects.filter(p => p.status === statusFilter);

  if (hasHydrated && isAuthenticated && isReady && !hasAnyRole(...ADMIN_ROLES, Roles.RECRUITER)) {
    return null;
  }

  return (
    <AppLayout>
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">PSA Projects</h1>
            <p className="page-subtitle">Professional services and billable client projects.</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setPanel('new')} className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5"/>New Project
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {['ALL', ...Object.values(PSAProjectStatus)].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                statusFilter === s
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
              }`}
            >
              {s === 'ALL' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-[var(--bg-secondary)] animate-pulse"/>)}
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Briefcase className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2"/>
              <p className="text-sm text-[var(--text-muted)]">
                {statusFilter === 'ALL' ? 'No PSA projects yet' : `No projects with status "${STATUS_LABELS[statusFilter]}"`}
              </p>
              {isAdmin && statusFilter === 'ALL' && (
                <Button size="sm" variant="outline" onClick={() => setPanel('new')} className="mt-4">
                  Create First Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={() => setPanel(p)}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>

      {panel !== null && (
        <ProjectPanel
          project={panel === 'new' ? null : panel}
          onClose={() => setPanel(null)}
        />
      )}
    </AppLayout>
  );
}
