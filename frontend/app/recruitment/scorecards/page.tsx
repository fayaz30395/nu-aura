'use client';

import React, {useState} from 'react';
import {Check, ClipboardList, Edit2, Plus, Star, Trash2, X} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Badge} from '@/components/ui/Badge';
import {SlidePanel} from '@/components/ui/SlidePanel';
import {useAuth} from '@/lib/hooks/useAuth';
import {usePermissions, Roles} from '@/lib/hooks/usePermissions';
import {
  getListTemplates1QueryKey,
  useCreateTemplate,
  useDeleteTemplate,
  useListTemplates1,
  useUpdateTemplate,
} from '@/lib/generated/api/scorecard-controller/scorecard-controller';
import type {ScorecardTemplateResponse, CriterionRequest, CriterionResponse} from '@/lib/generated/api/model';

const ADMIN_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN];

type CriterionForm = {name: string; category: string; weight: string};

const BLANK_CRITERION: CriterionForm = {name: '', category: '', weight: ''};

function CriteriaEditor({
  criteria,
  onChange,
}: {
  criteria: CriterionForm[];
  onChange: (c: CriterionForm[]) => void;
}) {
  const add = () => onChange([...criteria, {...BLANK_CRITERION}]);
  const remove = (i: number) => onChange(criteria.filter((_, idx) => idx !== i));
  const update = (i: number, k: keyof CriterionForm, v: string) =>
    onChange(criteria.map((c, idx) => idx === i ? {...c, [k]: v} : c));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Criteria</span>
        <button type="button" onClick={add} className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3"/>Add
        </button>
      </div>
      {criteria.map((c, i) => (
        <div key={i} className="flex gap-2 items-start">
          <Input
            value={c.name}
            onChange={e => update(i, 'name', e.target.value)}
            className="h-7 text-xs flex-1"
            placeholder="Criterion name *"
          />
          <Input
            value={c.category}
            onChange={e => update(i, 'category', e.target.value)}
            className="h-7 text-xs w-28"
            placeholder="Category"
          />
          <Input
            type="number"
            value={c.weight}
            onChange={e => update(i, 'weight', e.target.value)}
            className="h-7 text-xs w-16"
            placeholder="Wt"
          />
          <button type="button" onClick={() => remove(i)} className="h-7 w-7 flex items-center justify-center text-[var(--text-muted)] hover:text-danger-600 shrink-0">
            <X className="w-3 h-3"/>
          </button>
        </div>
      ))}
      {criteria.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">No criteria yet. Add at least one to evaluate candidates.</p>
      )}
    </div>
  );
}

function TemplatePanel({
  template,
  onClose,
}: {
  template: ScorecardTemplateResponse | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [criteria, setCriteria] = useState<CriterionForm[]>(
    (template?.criteria ?? []).map((c: CriterionResponse) => ({
      name: c.name ?? '',
      category: c.category ?? '',
      weight: String(c.weight ?? ''),
    }))
  );
  const [error, setError] = useState('');

  const invalidate = () => queryClient.invalidateQueries({queryKey: getListTemplates1QueryKey()});
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const toCriterionRequests = (): CriterionRequest[] =>
    criteria
      .filter(c => c.name.trim())
      .map((c, i) => ({
        name: c.name.trim(),
        category: c.category.trim() || undefined,
        weight: c.weight ? Number(c.weight) : undefined,
        orderIndex: i,
      }));

  const handleSave = () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    setError('');
    const data = {name: name.trim(), description: description.trim() || undefined, isDefault, criteria: toCriterionRequests()};
    const onSuccess = () => {invalidate(); onClose();};
    const onError = () => setError('Failed to save template');
    if (template?.id) {
      updateMutation.mutate({id: template.id, data}, {onSuccess, onError});
    } else {
      createMutation.mutate({data}, {onSuccess, onError});
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <SlidePanel onClose={onClose} ariaLabel={template ? 'Edit Template' : 'New Scorecard Template'} widthClassName="max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">{template ? 'Edit Template' : 'New Scorecard Template'}</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[var(--text-muted)]"/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="scorecard-template-name" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Template Name *</label>
            <Input id="scorecard-template-name" value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" placeholder="e.g. Engineering Role Scorecard"/>
          </div>
          <div>
            <label htmlFor="scorecard-template-description" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea id="scorecard-template-description" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="input-aura w-full text-sm resize-none" placeholder="Optional description..."/>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={isDefault}
              onClick={() => setIsDefault(v => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${isDefault ? 'bg-[var(--accent)]' : 'bg-[var(--border-main)]'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white dark:bg-gray-100 shadow transition-all ${isDefault ? 'translate-x-4' : 'translate-x-0.5'}`}/>
            </button>
            <span className="text-xs text-[var(--text-secondary)]">Set as default template</span>
          </div>
          <CriteriaEditor criteria={criteria} onChange={setCriteria}/>
          {error && <p className="text-xs text-danger-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isPending} className="flex-1">
              {isPending ? 'Saving…' : 'Save Template'}
            </Button>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

function TemplateCard({template, onEdit}: {template: ScorecardTemplateResponse; onEdit: () => void}) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useDeleteTemplate();

  const handleDelete = () => {
    deleteMutation.mutate({id: template.id ?? ''}, {
      onSuccess: () => queryClient.invalidateQueries({queryKey: getListTemplates1QueryKey()}),
    });
  };

  return (
    <Card className="hover:border-[var(--accent)] transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 text-[var(--text-muted)]"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[var(--text-primary)]">{template.name}</span>
              {template.isDefault && (
                <Badge variant="success" className="text-[10px] flex items-center gap-1">
                  <Star className="w-2.5 h-2.5"/>Default
                </Badge>
              )}
            </div>
            {template.description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{template.description}</p>
            )}
            {(template.criteria?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {template.criteria?.slice(0, 4).map((c: CriterionResponse, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                    <Check className="w-2.5 h-2.5"/>
                    {c.name}
                    {c.weight ? <span className="text-[var(--text-muted)]">({c.weight}%)</span> : null}
                  </span>
                ))}
                {(template.criteria?.length ?? 0) > 4 && (
                  <span className="text-[10px] text-[var(--text-muted)] px-1.5 py-0.5">+{(template.criteria?.length ?? 0) - 4} more</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" aria-label="Edit scorecard" onClick={onEdit} className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-secondary)]">
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
        </div>
      </CardContent>
    </Card>
  );
}

export default function ScorecardsPage() {
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
  const [panelTemplate, setPanelTemplate] = useState<ScorecardTemplateResponse | null | 'new'>(null);

  const isAdmin = isReady && hasAnyRole(...ADMIN_ROLES);
  const enabled = isAuthenticated && hasHydrated;

  const {data: templates, isLoading} = useListTemplates1({query: {enabled}});
  const list: ScorecardTemplateResponse[] = Array.isArray(templates) ? templates : ((templates as unknown) as {content?: ScorecardTemplateResponse[]})?.content ?? [];

  if (hasHydrated && isAuthenticated && isReady && !hasAnyRole(Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.RECRUITER)) {
    return null;
  }

  return (
    <AppLayout>
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Interview Scorecards</h1>
            <p className="page-subtitle">Manage scorecard templates used to evaluate candidates consistently.</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setPanelTemplate('new')} className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5"/>
              New Template
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-lg bg-[var(--bg-secondary)] animate-pulse"/>)}
          </div>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ClipboardList className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2"/>
              <p className="text-sm text-[var(--text-muted)]">No scorecard templates yet</p>
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => setPanelTemplate('new')} className="mt-4">
                  Create First Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {list.some(t => t.isDefault) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1">
                    <Star className="w-3 h-3"/>Default
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {list.filter(t => t.isDefault).map(t => (
                    <TemplateCard key={t.id} template={t} onEdit={() => setPanelTemplate(t)}/>
                  ))}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">All Templates</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map(t => (
                  <TemplateCard key={t.id} template={t} onEdit={() => setPanelTemplate(t)}/>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {panelTemplate !== null && (
        <TemplatePanel
          template={panelTemplate === 'new' ? null : panelTemplate}
          onClose={() => setPanelTemplate(null)}
        />
      )}
    </AppLayout>
  );
}
