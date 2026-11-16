'use client';

import React, {useState} from 'react';
import {ClipboardList, Plus, X} from 'lucide-react';
import {Checkbox} from '@mantine/core';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Skeleton} from '@/components/ui/Skeleton';
import {EmptyState} from '@/components/ui/EmptyState';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Select} from '@/components/ui/Select';
import {Textarea} from '@/components/ui/Textarea';
import {SlidePanel} from '@/components/ui/SlidePanel';
import {useAuth} from '@/lib/hooks/useAuth';
import {usePermissions, Roles} from '@/lib/hooks/usePermissions';
import {
  getGetAllSurveysQueryKey,
  useGetAllSurveys,
  useCreateSurvey,
  usePublishSurvey,
  useCloseSurvey,
  useDeleteSurvey,
} from '@/lib/generated/api/pulse-survey-controller/pulse-survey-controller';
import {
  PulseSurveyResponseStatus,
  PulseSurveyRequestSurveyType,
  PulseSurveyRequestFrequency,
} from '@/lib/generated/api/model';
import type {PulseSurveyRequest, PulseSurveyResponse} from '@/lib/generated/api/model';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SCHEDULED: 'Scheduled', ACTIVE: 'Active',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};
const STATUS_VARIANTS: Record<string, 'default' | 'info' | 'success' | 'primary' | 'danger'> = {
  DRAFT: 'default', SCHEDULED: 'info', ACTIVE: 'success',
  COMPLETED: 'primary', CANCELLED: 'danger',
};
const TYPE_LABELS: Record<string, string> = {
  ENGAGEMENT: 'Engagement', SATISFACTION: 'Satisfaction', ONBOARDING: 'Onboarding',
  EXIT: 'Exit', WELLNESS: 'Wellness', CUSTOM: 'Custom',
};
const FREQ_LABELS: Record<string, string> = {
  ONE_TIME: 'One Time', WEEKLY: 'Weekly', BI_WEEKLY: 'Bi-Weekly',
  MONTHLY: 'Monthly', QUARTERLY: 'Quarterly',
};
const ADMIN_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN];

type SurveyForm = {
  title: string;
  description: string;
  surveyType: string;
  startDate: string;
  endDate: string;
  frequency: string;
  isAnonymous: boolean;
  isMandatory: boolean;
};
const BLANK: SurveyForm = {
  title: '',
  description: '',
  surveyType: PulseSurveyRequestSurveyType.ENGAGEMENT,
  startDate: '',
  endDate: '',
  frequency: PulseSurveyRequestFrequency.ONE_TIME,
  isAnonymous: true,
  isMandatory: false,
};

function CreateSurveyPanel({onClose}: {onClose: () => void}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SurveyForm>(BLANK);
  const [error, setError] = useState('');
  const mutation = useCreateSurvey();

  const set = <K extends keyof SurveyForm>(k: K, v: SurveyForm[K]) =>
    setForm(p => ({...p, [k]: v}));

  const handleSave = () => {
    if (!form.title.trim()) {setError('Title is required'); return;}
    if (!form.startDate || !form.endDate) {setError('Start and end dates are required'); return;}
    setError('');
    const data: PulseSurveyRequest = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      surveyType: form.surveyType as PulseSurveyRequest['surveyType'],
      startDate: form.startDate,
      endDate: form.endDate,
      frequency: form.frequency as PulseSurveyRequest['frequency'],
      isAnonymous: form.isAnonymous,
      isMandatory: form.isMandatory,
    };
    mutation.mutate({data}, {
      onSuccess: () => {
        queryClient.invalidateQueries({queryKey: getGetAllSurveysQueryKey()});
        onClose();
      },
      onError: () => setError('Failed to create survey'),
    });
  };

  return (
    <SlidePanel onClose={onClose} title="New Pulse Survey">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">New Pulse Survey</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[var(--text-muted)]"/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="pulse-survey-title" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Title *</label>
            <Input id="pulse-survey-title" value={form.title} onChange={e => set('title', e.target.value)}
              className="h-8 text-sm" placeholder="Q2 Employee Engagement Survey"/>
          </div>
          <div>
            <label htmlFor="pulse-survey-description" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <Textarea id="pulse-survey-description" value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} className="resize-none" placeholder="Purpose of this survey..."/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="pulse-survey-type" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Type</label>
              <Select id="pulse-survey-type" value={form.surveyType} onChange={e => set('surveyType', e.target.value)}
                className="h-8 text-sm">
                {Object.values(PulseSurveyRequestSurveyType).map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="pulse-survey-frequency" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Frequency</label>
              <Select id="pulse-survey-frequency" value={form.frequency} onChange={e => set('frequency', e.target.value)}
                className="h-8 text-sm">
                {Object.values(PulseSurveyRequestFrequency).map(f => (
                  <option key={f} value={f}>{FREQ_LABELS[f] ?? f}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="pulse-survey-start-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Date *</label>
              <Input id="pulse-survey-start-date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="h-8 text-sm"/>
            </div>
            <div>
              <label htmlFor="pulse-survey-end-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Date *</label>
              <Input id="pulse-survey-end-date" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className="h-8 text-sm"/>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Checkbox size="xs" label="Anonymous" checked={form.isAnonymous} onChange={e => set('isAnonymous', e.currentTarget.checked)}/>
            <Checkbox size="xs" label="Mandatory" checked={form.isMandatory} onChange={e => set('isMandatory', e.currentTarget.checked)}/>
          </div>
          {error && <p className="text-xs text-danger-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={mutation.isPending} className="flex-1">
              {mutation.isPending ? 'Creating…' : 'Create Survey'}
            </Button>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

function SurveyRow({survey}: {survey: PulseSurveyResponse}) {
  const queryClient = useQueryClient();
  const publishMut = usePublishSurvey();
  const closeMut = useCloseSurvey();
  const deleteMut = useDeleteSurvey();

  const invalidate = () => queryClient.invalidateQueries({queryKey: getGetAllSurveysQueryKey()});

  const statusVariant = STATUS_VARIANTS[survey.status ?? ''] ?? 'default';
  const canPublish = survey.status === PulseSurveyResponseStatus.DRAFT || survey.status === PulseSurveyResponseStatus.SCHEDULED;
  const canClose = survey.status === PulseSurveyResponseStatus.ACTIVE;
  const canDelete = survey.status === PulseSurveyResponseStatus.DRAFT || survey.status === PulseSurveyResponseStatus.CANCELLED;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-primary)]">
      <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0 mt-0.5">
        <ClipboardList className="w-3.5 h-3.5 text-[var(--text-muted)]"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-56">{survey.title}</span>
          <Badge variant={statusVariant} className="text-xs">
            {STATUS_LABELS[survey.status ?? ''] ?? survey.status}
          </Badge>
          {survey.isAnonymous && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">Anon</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-[var(--text-muted)]">{TYPE_LABELS[survey.surveyType ?? ''] ?? survey.surveyType}</span>
          {survey.startDate && <span className="text-xs text-[var(--text-muted)]">{survey.startDate} – {survey.endDate}</span>}
          {survey.totalResponses != null && (
            <span className="text-xs text-[var(--text-muted)]">
              {survey.totalResponses}/{survey.totalInvited ?? '?'} responses
              {survey.responseRate != null && ` (${Math.round(survey.responseRate)}%)`}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {canPublish && (
          <Button size="sm" onClick={() => publishMut.mutate({surveyId: survey.id!}, {onSuccess: invalidate})}
            disabled={publishMut.isPending}
            >Publish</Button>
        )}
        {canClose && (
          <Button size="sm" variant="outline" onClick={() => closeMut.mutate({surveyId: survey.id!}, {onSuccess: invalidate})}
            disabled={closeMut.isPending}
            >Close</Button>
        )}
        {canDelete && (
          <Button size="sm" variant="destructive" onClick={() => deleteMut.mutate({surveyId: survey.id!}, {onSuccess: invalidate})}
            disabled={deleteMut.isPending}
            >Del</Button>
        )}
      </div>
    </div>
  );
}

export default function PulseSurveysPage() {
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const isAdmin = isReady && hasAnyRole(...ADMIN_ROLES);
  const enabled = isAuthenticated && hasHydrated;

  const {data, isLoading} = useGetAllSurveys(
    {pageable: {page: 0, size: 50}},
    {query: {enabled}}
  );

  const all: PulseSurveyResponse[] = Array.isArray(data)
    ? data
    : ((data as unknown) as {content?: PulseSurveyResponse[]})?.content ?? [];

  const surveys = statusFilter === 'ALL'
    ? all
    : all.filter(s => s.status === statusFilter);

  return (
    <AppLayout>
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Pulse Surveys</h1>
            <p className="page-subtitle">Create and manage employee pulse surveys to measure engagement.</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5"/>New Survey
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {['ALL', ...Object.values(PulseSurveyResponseStatus)].map(s => (
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
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg"/>)}
          </div>
        ) : surveys.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <EmptyState
                icon={<ClipboardList className="w-8 h-8"/>}
                title={statusFilter === 'ALL' ? 'No pulse surveys yet' : `No ${STATUS_LABELS[statusFilter]?.toLowerCase()} surveys`}
              />
              {statusFilter === 'ALL' && isAdmin && (
                <div className="flex justify-center">
                  <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="mt-4">
                    Create First Survey
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {surveys.map(s => <SurveyRow key={s.id} survey={s}/>)}
          </div>
        )}
      </div>

      {showCreate && <CreateSurveyPanel onClose={() => setShowCreate(false)}/>}
    </AppLayout>
  );
}
