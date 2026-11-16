'use client';

import {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {AlertCircle, Ban, CheckCircle, Home, Plus, XCircle} from 'lucide-react';
import {Button, Modal, Select, Tabs, Textarea} from '@mantine/core';
import {DateInput} from '@mantine/dates';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {QueryState} from '@/components/ui/QueryState';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {useToast} from '@/components/ui/Toast';
import {apiClient} from '@/lib/api/client';
import type {StatusMeta} from '@/lib/status/vocabulary';
import {
  validateWorkRequest,
  type WorkRequest,
  type WorkRequestForm,
  type WorkRequestType,
} from './workRequests';

interface PageResponse<T> {
  content: T[];
}

const BASE = '/attendance/work-requests';
const KEY = ['attendance', 'work-requests'] as const;

const TYPE_LABEL: Record<WorkRequestType, string> = {
  WORK_FROM_HOME: 'Work from home',
  ON_DUTY: 'On duty',
  REMOTE_CLOCK_IN: 'Remote clock-in',
};

const STATUS_META: Record<string, StatusMeta> = {
  PENDING: {label: 'Pending', tone: 'warning', icon: AlertCircle},
  APPROVED: {label: 'Approved', tone: 'success', icon: CheckCircle},
  REJECTED: {label: 'Rejected', tone: 'danger', icon: XCircle},
  CANCELLED: {label: 'Cancelled', tone: 'neutral', icon: Ban},
};

const EMPTY_FORM: WorkRequestForm = {startDate: '', endDate: '', reason: ''};
const SKELETON = <ListPageSkeleton rows={4} columns={4} showHeader={false} showFilters={false}/>;

interface Props {
  /** Request types this section handles; more than one shows a type picker. */
  types: WorkRequestType[];
  title: string;
  canApprove: boolean;
}

export function WorkRequestsPanel({types, title, canApprove}: Props) {
  const queryClient = useQueryClient();
  const {success, error} = useToast();
  const [tab, setTab] = useState<'my' | 'pending'>('my');
  const [showCreate, setShowCreate] = useState(false);
  const [type, setType] = useState<WorkRequestType>(types[0]);
  const [form, setForm] = useState<WorkRequestForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const inSection = (r: WorkRequest) => types.includes(r.requestType);

  const myQuery = useQuery({
    queryKey: [...KEY, 'my'],
    queryFn: () => apiClient.get<PageResponse<WorkRequest>>(`${BASE}/my`).then((r) => r.data.content.filter(inSection)),
  });
  const pendingQuery = useQuery({
    queryKey: [...KEY, 'pending'],
    queryFn: () => apiClient.get<PageResponse<WorkRequest>>(`${BASE}/pending`).then((r) => r.data.content.filter(inSection)),
    enabled: canApprove && tab === 'pending',
  });

  const errorMessage = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

  const act = useMutation({
    mutationFn: ({path, body}: { path: string; body?: object }) => apiClient.post(`${BASE}${path}`, body ?? {}),
    onSuccess: () => queryClient.invalidateQueries({queryKey: KEY}),
    meta: {skipGlobalError: true},
  });

  const run = (path: string, body: object | undefined, done: string, onDone?: () => void) =>
    act.mutate({path, body}, {
      onSuccess: () => {
        success(done);
        onDone?.();
      },
      onError: (err) => error(errorMessage(err, 'Something went wrong. Please try again.')),
    });

  const submit = () => {
    const problem = validateWorkRequest(type, form, new Date().toISOString().slice(0, 10));
    setFormError(problem);
    if (problem) return;
    run('', {requestType: type, ...form, reason: form.reason.trim()}, 'Request submitted', () => {
      setShowCreate(false);
      setForm(EMPTY_FORM);
    });
  };

  const columns: Column<WorkRequest>[] = [
    {
      key: 'type',
      header: 'Type',
      mobilePriority: 'primary',
      accessor: (r) => <span className="font-medium text-text-1">{TYPE_LABEL[r.requestType]}</span>,
    },
    {
      key: 'dates',
      header: 'Dates',
      mobileLabel: 'Dates',
      accessor: (r) => (r.startDate === r.endDate ? r.startDate : `${r.startDate} to ${r.endDate}`),
    },
    {
      key: 'reason',
      header: 'Reason',
      mobilePriority: 'hidden',
      accessor: (r) => <span className="block max-w-xs truncate text-text-2">{r.reason}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      accessor: (r) => <StatusBadge status={r.status} meta={STATUS_META[r.status] ?? STATUS_META.CANCELLED}/>,
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<Home className="h-full w-full"/>}
      title={`No ${title.toLowerCase()}`}
      description={tab === 'my' ? 'Raise a request and it will show up here.' : 'Nothing is waiting for your approval.'}
      actionLabel={tab === 'my' ? 'New request' : undefined}
      onAction={tab === 'my' ? () => setShowCreate(true) : undefined}
      size="compact"
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-1">{title}</h2>
        <Button leftSection={<Plus size={16} aria-hidden/>} onClick={() => setShowCreate(true)}>
          New request
        </Button>
      </div>

      <Tabs value={tab} onChange={(v) => v && setTab(v as 'my' | 'pending')} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="my">My Requests</Tabs.Tab>
          {canApprove && <Tabs.Tab value="pending">Pending Approval</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="my" pt="md">
          <QueryState query={myQuery} skeleton={SKELETON} errorTitle="Couldn't load your requests">
            {(data) => (
              <ResponsiveTable
                columns={columns}
                data={data}
                keyExtractor={(r) => r.id}
                emptyState={emptyState}
                rowActionsMenu={(r) =>
                  r.status === 'PENDING' ? [{label: 'Cancel request', color: 'red', onClick: () => setCancelId(r.id)}] : []
                }
              />
            )}
          </QueryState>
        </Tabs.Panel>

        <Tabs.Panel value="pending" pt="md">
          <QueryState query={pendingQuery} skeleton={SKELETON} errorTitle="Couldn't load pending requests">
            {(data) => (
              <ResponsiveTable
                columns={columns}
                data={data}
                keyExtractor={(r) => r.id}
                emptyState={emptyState}
                rowActionsMenu={(r) => [
                  {
                    label: 'Approve',
                    disabled: act.isPending,
                    onClick: () => run(`/${r.id}/approve`, {}, 'Request approved'),
                  },
                  {label: 'Reject', color: 'red', disabled: act.isPending, onClick: () => setRejectId(r.id)},
                ]}
              />
            )}
          </QueryState>
        </Tabs.Panel>
      </Tabs>

      <Modal opened={showCreate} onClose={() => setShowCreate(false)} title={`New ${title.toLowerCase()}`} centered>
        <div className="flex flex-col gap-4">
          {types.length > 1 && (
            <Select
              label="Request type"
              data={types.map((t) => ({value: t, label: TYPE_LABEL[t]}))}
              value={type}
              onChange={(v) => v && setType(v as WorkRequestType)}
              allowDeselect={false}
            />
          )}
          <DateInput
            label="From"
            withAsterisk
            value={form.startDate || null}
            onChange={(d) => setForm((f) => ({...f, startDate: d ?? '', endDate: type === 'REMOTE_CLOCK_IN' ? d ?? '' : f.endDate}))}
            valueFormat="YYYY-MM-DD"
            placeholder="YYYY-MM-DD"
          />
          {type !== 'REMOTE_CLOCK_IN' && (
            <DateInput
              label="To"
              withAsterisk
              value={form.endDate || null}
              onChange={(d) => setForm((f) => ({...f, endDate: d ?? ''}))}
              valueFormat="YYYY-MM-DD"
              placeholder="YYYY-MM-DD"
            />
          )}
          <Textarea
            label="Reason"
            withAsterisk
            rows={3}
            value={form.reason}
            onChange={(e) => {
              // Read before the updater runs: currentTarget is null by then.
              const reason = e.currentTarget.value;
              setForm((f) => ({...f, reason}));
            }}
            error={formError}
          />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="default" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={submit} loading={act.isPending}>Submit</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={cancelId !== null}
        onClose={() => setCancelId(null)}
        title="Cancel request"
        message="This request will be withdrawn."
        confirmText="Cancel request"
        loading={act.isPending}
        onConfirm={() => {
          if (cancelId) run(`/${cancelId}/cancel`, undefined, 'Request cancelled', () => setCancelId(null));
        }}
      />

      <ConfirmDialog
        isOpen={rejectId !== null}
        onClose={() => setRejectId(null)}
        title="Reject request"
        message="The employee will see your note."
        confirmText="Reject"
        loading={act.isPending}
        reason={{label: 'Reason for rejection', required: true, minLength: 5}}
        onConfirm={(note) => {
          if (rejectId) run(`/${rejectId}/reject`, {note}, 'Request rejected', () => setRejectId(null));
        }}
      />
    </div>
  );
}
