'use client';

import React, {useState} from 'react';
import {CheckCircle, Clock, Database, Download, FileText, Shield, Trash2, XCircle} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {useAuth} from '@/lib/hooks/useAuth';
import {usePermissions, Roles} from '@/lib/hooks/usePermissions';
import {
  getGetMyRequests3QueryKey,
  getListForAdminQueryKey,
  useCreateAccessRequest,
  useCreateErasureRequest,
  useCreatePortabilityRequest,
  useGetMyRequests3,
  useListForAdmin,
  useUpdateStatus2,
} from '@/lib/generated/api/gdpr-dsr/gdpr-dsr';
import {useFulfill} from '@/lib/generated/api/gdpr-dsr-admin/gdpr-dsr-admin';
import type {DsrRequestResponse} from '@/lib/generated/api/model';
import {DsrRequestResponseRequestType, DsrRequestResponseStatus, DsrStatusUpdateBodyStatus} from '@/lib/generated/api/model';
import {formatDate} from '@/lib/utils/format/date';

const REQUEST_META = {
  [DsrRequestResponseRequestType.ACCESS]: {
    label: 'Data Access',
    description: 'Receive a copy of all personal data we hold about you.',
    icon: Database,
    article: 'Article 15',
    hook: 'access',
  },
  [DsrRequestResponseRequestType.PORTABILITY]: {
    label: 'Data Portability',
    description: 'Export your personal data in a machine-readable format.',
    icon: Download,
    article: 'Article 20',
    hook: 'portability',
  },
  [DsrRequestResponseRequestType.ERASURE]: {
    label: 'Right to Erasure',
    description: 'Request deletion of your personal data where legally permitted.',
    icon: Trash2,
    article: 'Article 17',
    hook: 'erasure',
  },
  [DsrRequestResponseRequestType.RECTIFICATION]: {
    label: 'Data Rectification',
    description: 'Request correction of inaccurate personal data.',
    icon: FileText,
    article: 'Article 16',
    hook: 'rectification',
  },
} as const;

function statusVariant(status?: string): 'default' | 'warning' | 'success' | 'danger' {
  if (status === DsrRequestResponseStatus.PENDING) return 'warning';
  if (status === DsrRequestResponseStatus.IN_PROGRESS) return 'warning';
  if (status === DsrRequestResponseStatus.COMPLETED) return 'success';
  if (status === DsrRequestResponseStatus.REJECTED) return 'danger';
  return 'default';
}

function RequestCard({req}: {req: DsrRequestResponse}) {
  const meta = req.requestType ? REQUEST_META[req.requestType] : null;
  const Icon = meta?.icon ?? FileText;
  return (
    <div className="flex items-center gap-3 p-3 border border-[var(--border-subtle)] rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[var(--text-muted)]"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">{meta?.label ?? req.requestType}</span>
          <Badge variant={statusVariant(req.status)} className="text-[10px]">{req.status}</Badge>
        </div>
        {req.reason && <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{req.reason}</p>}
        {req.adminNotes && (
          <p className="text-xs text-[var(--text-muted)] italic mt-0.5">Admin: {req.adminNotes}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] text-[var(--text-muted)]">{req.requestedAt ? formatDate(req.requestedAt) : '—'}</p>
        {req.completedAt && (
          <p className="text-[10px] text-[var(--text-muted)]">Done {formatDate(req.completedAt)}</p>
        )}
      </div>
    </div>
  );
}

function EmployeeView() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const {data: myRequests, isLoading} = useGetMyRequests3();
  const requests: DsrRequestResponse[] = Array.isArray(myRequests) ? myRequests : [];

  const invalidate = () => queryClient.invalidateQueries({queryKey: getGetMyRequests3QueryKey()});

  const accessMutation = useCreateAccessRequest();
  const portabilityMutation = useCreatePortabilityRequest();
  const erasureMutation = useCreateErasureRequest();

  const submit = (type: string) => {
    setSubmitting(type);
    const payload = {data: {reason: reason.trim() || undefined}};
    const onSuccess = () => {
      setSuccessMsg(`${type} request submitted successfully.`);
      setActiveForm(null);
      setReason('');
      setSubmitting(null);
      invalidate();
      setTimeout(() => setSuccessMsg(''), 4000);
    };
    const onError = () => setSubmitting(null);

    if (type === DsrRequestResponseRequestType.ACCESS) {
      accessMutation.mutate(payload, {onSuccess, onError});
    } else if (type === DsrRequestResponseRequestType.PORTABILITY) {
      portabilityMutation.mutate(payload, {onSuccess, onError});
    } else if (type === DsrRequestResponseRequestType.ERASURE) {
      erasureMutation.mutate(payload, {onSuccess, onError});
    }
  };

  const notAllowed = [DsrRequestResponseRequestType.RECTIFICATION];
  const availableTypes = Object.entries(REQUEST_META).filter(
    ([type]) => !notAllowed.includes(type as typeof notAllowed[0]),
  );

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-700 text-xs text-success-800 dark:text-success-300">
          <CheckCircle className="w-4 h-4 shrink-0"/>
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {availableTypes.map(([type, meta]) => {
          const Icon = meta.icon;
          const isOpen = activeForm === type;
          const pending = submitting === type;
          return (
            <div key={type} className="border border-[var(--border-main)] rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-50 dark:bg-accent-900/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-accent-600"/>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{meta.label}</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">{meta.article}</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-3">{meta.description}</p>
                <Button
                  size="sm"
                  variant={isOpen ? 'outline' : 'default'}
                  onClick={() => setActiveForm(isOpen ? null : type)}
                  className="w-full text-xs h-7"
                >
                  {isOpen ? 'Cancel' : 'File Request'}
                </Button>
              </div>
              {isOpen && (
                <div className="border-t border-[var(--border-subtle)] p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Reason <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      rows={3}
                      placeholder="Provide context for your request..."
                      className="input-aura w-full text-xs resize-none"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => submit(type)}
                    disabled={pending}
                    className="w-full text-xs h-7"
                  >
                    {pending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">My Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            Array.from({length: 2}).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-[var(--bg-secondary)] animate-pulse"/>
            ))
          ) : requests.length === 0 ? (
            <div className="py-10 text-center">
              <Clock className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2"/>
              <p className="text-sm text-[var(--text-muted)]">No requests filed yet</p>
            </div>
          ) : (
            requests.map(r => <RequestCard key={r.id} req={r}/>)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminView() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const {data: allRequests, isLoading} = useListForAdmin({status: DsrRequestResponseStatus.PENDING});
  const requests: DsrRequestResponse[] = Array.isArray(allRequests) ? allRequests : [];

  const invalidate = () => queryClient.invalidateQueries({queryKey: getListForAdminQueryKey()});

  const fulfillMutation = useFulfill();
  const statusMutation = useUpdateStatus2();

  const handleFulfill = (id: string) => {
    setProcessing(id);
    fulfillMutation.mutate({id}, {
      onSuccess: () => {invalidate(); setProcessing(null);},
      onError: () => setProcessing(null),
    });
  };

  const handleReject = (id: string) => {
    setProcessing(id + '-reject');
    statusMutation.mutate({
      requestId: id,
      data: {status: DsrStatusUpdateBodyStatus.REJECTED, adminNotes: notes[id] ?? ''},
    }, {
      onSuccess: () => {invalidate(); setProcessing(null);},
      onError: () => setProcessing(null),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm mr-auto">Pending DSR Requests</CardTitle>
          <Badge variant="warning" className="text-[10px]">{requests.length} pending</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({length: 3}).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-[var(--bg-secondary)] animate-pulse"/>
          ))
        ) : requests.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle className="w-6 h-6 text-success-500 mx-auto mb-2"/>
            <p className="text-sm text-[var(--text-muted)]">No pending requests</p>
          </div>
        ) : (
          requests.map(req => {
            const meta = req.requestType ? REQUEST_META[req.requestType] : null;
            const Icon = meta?.icon ?? FileText;
            const isPending = processing === req.id;
            const isRejectPending = processing === req.id + '-reject';
            return (
              <div key={req.id} className="border border-[var(--border-main)] rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[var(--text-muted)]"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{meta?.label ?? req.requestType}</span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">{meta?.article}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Requested {req.requestedAt ? formatDate(req.requestedAt) : '—'}
                    </p>
                    {req.reason && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1 italic">&ldquo;{req.reason}&rdquo;</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Admin Notes</label>
                  <textarea
                    value={notes[req.id ?? ''] ?? ''}
                    onChange={e => setNotes(prev => ({...prev, [req.id ?? '']: e.target.value}))}
                    rows={2}
                    placeholder="Add notes visible to the requester..."
                    className="input-aura w-full text-xs resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleFulfill(req.id ?? '')}
                    disabled={isPending || isRejectPending}
                    className="text-xs h-7 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3"/>
                    {isPending ? 'Fulfilling...' : 'Fulfil'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(req.id ?? '')}
                    disabled={isPending || isRejectPending}
                    className="text-xs h-7 flex items-center gap-1 text-danger-600 border-danger-300 hover:bg-danger-50"
                  >
                    <XCircle className="w-3 h-3"/>
                    {isRejectPending ? 'Rejecting...' : 'Reject'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export default function PrivacyPage() {
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
  const [tab, setTab] = useState<'my-requests' | 'admin'>('my-requests');

  const isAdmin = isReady && hasAnyRole(Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN);

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <AppLayout>
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Privacy & Data Rights</h1>
            <p className="page-subtitle">Exercise your GDPR data subject rights.</p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg w-fit mb-6">
            {(['my-requests', 'admin'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tab === t
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t === 'my-requests' ? 'My Requests' : 'Admin Dashboard'}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 p-4 bg-accent-50 dark:bg-accent-900/10 border border-accent-200 dark:border-accent-800 rounded-lg flex items-start gap-3">
          <Shield className="w-4 h-4 text-accent-600 mt-0.5 shrink-0"/>
          <div className="text-xs text-accent-800 dark:text-accent-300">
            <p className="font-medium mb-0.5">Your GDPR Rights</p>
            <p>Under the General Data Protection Regulation (GDPR), you have the right to access, port, and request erasure of your personal data. Requests are typically fulfilled within 30 days.</p>
          </div>
        </div>

        {tab === 'my-requests' ? <EmployeeView /> : <AdminView />}
      </div>
    </AppLayout>
  );
}
