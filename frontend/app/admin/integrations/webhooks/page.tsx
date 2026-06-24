'use client';

import React, {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useQueryClient} from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
  Key,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Webhook,
  XCircle,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Label} from '@/components/ui/Label';
import {Badge} from '@/components/ui/Badge';
import {useAuth} from '@/lib/hooks/useAuth';
import {Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {useToast} from '@/components/notifications/ToastProvider';
import {
  useActivateWebhook,
  useCreateWebhook,
  useDeactivateWebhook,
  useDeleteWebhook,
  useGetDeliveries,
  useListWebhooks,
  useRetryDelivery,
  getListWebhooksQueryKey,
} from '@/lib/generated/api/webhooks/webhooks';
import {useRotateSecret} from '@/lib/generated/api/webhook-admin/webhook-admin';
import type {WebhookRequest, WebhookResponse, WebhookDeliveryResponse} from '@/lib/generated/api/model';
import {WebhookResponseEventsItem, WebhookResponseStatus, WebhookDeliveryResponseStatus} from '@/lib/generated/api/model';

const ADMIN_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN];

const EVENT_GROUPS: Record<string, WebhookResponseEventsItem[]> = {
  Employee: [
    WebhookResponseEventsItem.EMPLOYEE_CREATED,
    WebhookResponseEventsItem.EMPLOYEE_UPDATED,
    WebhookResponseEventsItem.EMPLOYEE_TERMINATED,
    WebhookResponseEventsItem.EMPLOYEE_PROMOTED,
    WebhookResponseEventsItem.EMPLOYEE_TRANSFERRED,
    WebhookResponseEventsItem.EMPLOYEE_STATUS_CHANGED,
    WebhookResponseEventsItem.EMPLOYEE_DEPARTMENT_CHANGED,
  ],
  Leave: [
    WebhookResponseEventsItem.LEAVE_REQUESTED,
    WebhookResponseEventsItem.LEAVE_APPROVED,
    WebhookResponseEventsItem.LEAVE_REJECTED,
    WebhookResponseEventsItem.LEAVE_CANCELLED,
  ],
  Attendance: [
    WebhookResponseEventsItem.ATTENDANCE_CHECK_IN,
    WebhookResponseEventsItem.ATTENDANCE_CHECK_OUT,
    WebhookResponseEventsItem.ATTENDANCE_REGULARIZED,
  ],
  Payroll: [
    WebhookResponseEventsItem.PAYROLL_PROCESSED,
    WebhookResponseEventsItem.PAYSLIP_GENERATED,
  ],
  Performance: [
    WebhookResponseEventsItem.REVIEW_STARTED,
    WebhookResponseEventsItem.REVIEW_COMPLETED,
    WebhookResponseEventsItem.GOAL_CREATED,
    WebhookResponseEventsItem.GOAL_UPDATED,
  ],
  Recruitment: [
    WebhookResponseEventsItem.CANDIDATE_CREATED,
    WebhookResponseEventsItem.CANDIDATE_STATUS_CHANGED,
    WebhookResponseEventsItem.OFFER_CREATED,
    WebhookResponseEventsItem.OFFER_ACCEPTED,
    WebhookResponseEventsItem.OFFER_REJECTED,
  ],
  Documents: [
    WebhookResponseEventsItem.DOCUMENT_UPLOADED,
    WebhookResponseEventsItem.DOCUMENT_SIGNED,
  ],
  Expenses: [
    WebhookResponseEventsItem.EXPENSE_SUBMITTED,
    WebhookResponseEventsItem.EXPENSE_APPROVED,
    WebhookResponseEventsItem.EXPENSE_REJECTED,
  ],
  Assets: [
    WebhookResponseEventsItem.ASSET_ASSIGNED,
    WebhookResponseEventsItem.ASSET_RETURNED,
  ],
  Training: [
    WebhookResponseEventsItem.TRAINING_ENROLLED,
    WebhookResponseEventsItem.TRAINING_COMPLETED,
  ],
};

const webhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  url: z.string().url('Must be a valid HTTPS URL').startsWith('https://', 'Must use HTTPS'),
  secret: z.string().min(16, 'Secret must be at least 16 characters').max(256),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  customHeaders: z.string().max(4096).optional(),
});
type WebhookFormData = z.infer<typeof webhookSchema>;

function statusColor(status?: WebhookResponseStatus) {
  switch (status) {
    case WebhookResponseStatus.ACTIVE: return 'success';
    case WebhookResponseStatus.PAUSED: return 'warning';
    case WebhookResponseStatus.DISABLED_FAILURES: return 'danger';
    default: return 'default';
  }
}

function statusLabel(status?: WebhookResponseStatus) {
  switch (status) {
    case WebhookResponseStatus.ACTIVE: return 'Active';
    case WebhookResponseStatus.PAUSED: return 'Paused';
    case WebhookResponseStatus.DISABLED_FAILURES: return 'Disabled (failures)';
    case WebhookResponseStatus.DELETED: return 'Deleted';
    default: return 'Unknown';
  }
}

function deliveryStatusColor(status?: WebhookDeliveryResponseStatus) {
  switch (status) {
    case WebhookDeliveryResponseStatus.DELIVERED: return 'text-success-600';
    case WebhookDeliveryResponseStatus.FAILED: return 'text-danger-600';
    case WebhookDeliveryResponseStatus.RETRYING: return 'text-warning-600';
    default: return 'text-[var(--text-secondary)]';
  }
}

function DeliveryRow({delivery, onRetry}: {delivery: WebhookDeliveryResponse; onRetry: () => void}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-[var(--border-main)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--bg-secondary)] transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4 shrink-0 text-[var(--text-muted)]"/> :
          <ChevronRight className="w-4 h-4 shrink-0 text-[var(--text-muted)]"/>}
        <span className={`text-xs font-medium w-20 shrink-0 ${deliveryStatusColor(delivery.status)}`}>
          {delivery.status}
        </span>
        <span className="text-xs text-[var(--text-secondary)] font-mono flex-1 truncate">
          {delivery.eventType}
        </span>
        <span className="text-xs text-[var(--text-muted)] shrink-0">
          {delivery.httpStatusCode ? `HTTP ${delivery.httpStatusCode}` : '—'}
        </span>
        <span className="text-xs text-[var(--text-muted)] shrink-0 ml-2">
          {delivery.durationMs != null ? `${delivery.durationMs}ms` : ''}
        </span>
        {delivery.status === WebhookDeliveryResponseStatus.FAILED && (
          <button
            type="button"
            onClick={e => {e.stopPropagation(); onRetry();}}
            className="ml-2 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            title="Retry delivery"
          >
            <RefreshCw className="w-3.5 h-3.5"/>
          </button>
        )}
      </button>
      {expanded && delivery.errorMessage && (
        <div className="px-4 pb-3 pt-0 border-t border-[var(--border-main)] bg-[var(--bg-secondary)]">
          <p className="text-xs font-mono text-danger-600 mt-2 break-all">{delivery.errorMessage}</p>
        </div>
      )}
    </div>
  );
}

function DeliveryPanel({webhookId, onClose}: {webhookId: string; onClose: () => void}) {
  const {data} = useGetDeliveries(webhookId, {pageable: {page: 0, size: 20}});
  const retryMutation = useRetryDelivery();
  const toast = useToast();
  const deliveries: WebhookDeliveryResponse[] = (data as unknown as {content?: WebhookDeliveryResponse[]})?.content ?? [];

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-[var(--bg-primary)] border-l border-[var(--border-main)] shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--text-muted)]"/>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Delivery History</h3>
        </div>
        <button type="button" aria-label="Close" onClick={onClose}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
          <XCircle className="w-4 h-4"/>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {deliveries.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">No deliveries yet</p>
        ) : deliveries.map(d => (
          <DeliveryRow key={d.id} delivery={d} onRetry={() => {
            if (!d.id) return;
            retryMutation.mutate({deliveryId: d.id}, {
              onSuccess: () => toast.success('Delivery queued for retry'),
              onError: (err: unknown) => toast.error(
                (err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to queue retry'
              ),
            });
          }}/>
        ))}
      </div>
    </div>
  );
}

function CreateWebhookPanel({onClose, onCreated}: {onClose: () => void; onCreated: () => void}) {
  const toast = useToast();
  const createMutation = useCreateWebhook();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({Employee: true});

  const {control, register, handleSubmit, formState: {errors, isSubmitting}} = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {events: []},
  });

  const toggleGroup = (group: string) =>
    setExpandedGroups(prev => ({...prev, [group]: !prev[group]}));

  const onSubmit = (data: WebhookFormData) => {
    const payload: WebhookRequest = {
      name: data.name,
      description: data.description,
      url: data.url,
      secret: data.secret,
      events: data.events as WebhookRequest['events'],
      customHeaders: data.customHeaders || undefined,
    };
    createMutation.mutate({data: payload}, {
      onSuccess: () => {
        toast.success('Webhook created');
        onCreated();
      },
      onError: (err: unknown) => toast.error(
        (err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to create webhook'
      ),
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-[var(--bg-primary)] border-l border-[var(--border-main)] shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-[var(--text-muted)]"/>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">New Webhook</h3>
        </div>
        <button type="button" aria-label="Close" onClick={onClose}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
          <XCircle className="w-4 h-4"/>
        </button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="wh-name">Name *</Label>
          <Input id="wh-name" {...register('name')} placeholder="My Webhook"/>
          {errors.name && <p className="text-xs text-danger-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wh-desc">Description</Label>
          <Input id="wh-desc" {...register('description')} placeholder="Optional description"/>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wh-url">Endpoint URL *</Label>
          <Input id="wh-url" {...register('url')} placeholder="https://your-server.com/webhooks"/>
          {errors.url && <p className="text-xs text-danger-500">{errors.url.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wh-secret">Signing Secret *</Label>
          <Input id="wh-secret" {...register('secret')} type="password"
            placeholder="Min 16 characters — store securely"/>
          <p className="text-xs text-[var(--text-muted)]">
            Used to verify the <code className="bg-[var(--bg-secondary)] px-1 rounded">X-Hub-Signature-256</code> header on your endpoint.
          </p>
          {errors.secret && <p className="text-xs text-danger-500">{errors.secret.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wh-headers">Custom Headers (JSON)</Label>
          <textarea
            id="wh-headers"
            {...register('customHeaders')}
            className="input-aura text-xs font-mono w-full min-h-[60px] resize-y"
            placeholder={'{"X-My-Header": "value"}'}
          />
          {errors.customHeaders && <p className="text-xs text-danger-500">{errors.customHeaders.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Events *</Label>
            <Controller control={control} name="events" render={({field}) => (
              <button type="button" className="text-xs text-accent-600 hover:underline"
                onClick={() => field.onChange(
                  field.value.length === 0 ? [WebhookResponseEventsItem.ALL] : []
                )}>
                {field.value.includes(WebhookResponseEventsItem.ALL) ? 'Deselect All' : 'Select All'}
              </button>
            )}/>
          </div>
          {errors.events && <p className="text-xs text-danger-500">{errors.events.message}</p>}
          <Controller control={control} name="events" render={({field}) => (
            <div className="space-y-2">
              {Object.entries(EVENT_GROUPS).map(([group, events]) => (
                <div key={group} className="border border-[var(--border-main)] rounded-lg overflow-hidden">
                  <button type="button" onClick={() => toggleGroup(group)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                    <span>{group}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-muted)]">
                        {events.filter(e => field.value.includes(e)).length}/{events.length}
                      </span>
                      {expandedGroups[group] ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                    </div>
                  </button>
                  {expandedGroups[group] && (
                    <div className="p-2 space-y-1">
                      {events.map(event => {
                        const checked = field.value.includes(event) || field.value.includes(WebhookResponseEventsItem.ALL);
                        return (
                          <label key={event} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--bg-secondary)] cursor-pointer">
                            <input type="checkbox" checked={checked} className="w-3.5 h-3.5 accent-accent-600"
                              onChange={e => {
                                const next = e.target.checked
                                  ? [...field.value.filter(v => v !== WebhookResponseEventsItem.ALL), event]
                                  : field.value.filter(v => v !== event);
                                field.onChange(next);
                              }}/>
                            <span className="text-xs text-[var(--text-secondary)] font-mono">{event}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}/>
        </div>

        <div className="pt-3 border-t border-[var(--border-main)]">
          <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
            Create Webhook
          </Button>
        </div>
      </form>
    </div>
  );
}

function WebhookCard({webhook, onDeliveries}: {webhook: WebhookResponse; onDeliveries: (id: string) => void}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const activateMutation = useActivateWebhook();
  const deactivateMutation = useDeactivateWebhook();
  const deleteMutation = useDeleteWebhook();
  const rotateMutation = useRotateSecret();
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refetchList = () => queryClient.invalidateQueries({queryKey: getListWebhooksQueryKey()});

  const handleToggle = () => {
    if (!webhook.id) return;
    const isActive = webhook.status === WebhookResponseStatus.ACTIVE;
    if (isActive) {
      deactivateMutation.mutate({id: webhook.id}, {
        onSuccess: () => {toast.success('Webhook paused'); refetchList();},
        onError: (err: unknown) => toast.error(
          (err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to pause webhook'
        ),
      });
    } else {
      activateMutation.mutate({id: webhook.id}, {
        onSuccess: () => {toast.success('Webhook activated'); refetchList();},
        onError: (err: unknown) => toast.error(
          (err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to activate webhook'
        ),
      });
    }
  };

  const handleDelete = () => {
    if (!webhook.id) return;
    deleteMutation.mutate({id: webhook.id}, {
      onSuccess: () => {toast.success('Webhook deleted'); refetchList();},
      onError: (err: unknown) => toast.error(
        (err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to delete webhook'
      ),
    });
  };

  const handleRotate = () => {
    if (!webhook.id) return;
    rotateMutation.mutate({id: webhook.id}, {
      onSuccess: (data) => {
        setShowSecret(data?.newSecret ?? null);
        toast.success('Secret rotated — copy the new secret now');
      },
      onError: (err: unknown) => toast.error(
        (err as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to rotate secret'
      ),
    });
  };

  const isActive = webhook.status === WebhookResponseStatus.ACTIVE;
  const isToggling = activateMutation.isPending || deactivateMutation.isPending;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
            <Webhook className="w-4 h-4 text-[var(--text-muted)]"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{webhook.name}</h3>
              <Badge size="sm" variant={statusColor(webhook.status) as 'success' | 'warning' | 'danger' | 'default'}>
                {statusLabel(webhook.status)}
              </Badge>
              {webhook.consecutiveFailures != null && webhook.consecutiveFailures > 0 && (
                <span className="flex items-center gap-1 text-xs text-warning-600">
                  <AlertTriangle className="w-3 h-3"/>
                  {webhook.consecutiveFailures} failures
                </span>
              )}
            </div>
            <a href={webhook.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 mt-0.5 text-xs text-[var(--text-muted)] hover:text-accent-600 transition-colors truncate max-w-sm">
              <ExternalLink className="w-3 h-3 shrink-0"/>
              <span className="truncate">{webhook.url}</span>
            </a>
            {webhook.description && (
              <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2">{webhook.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {(webhook.events ?? []).slice(0, 5).map(e => (
                <span key={e} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                  {e}
                </span>
              ))}
              {(webhook.events ?? []).length > 5 && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                  +{(webhook.events?.length ?? 0) - 5} more
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={handleToggle} disabled={isToggling}
              title={isActive ? 'Pause' : 'Activate'}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50">
              {isToggling ? <Loader2 className="w-4 h-4 animate-spin"/> :
                isActive ? <PauseCircle className="w-4 h-4"/> : <PlayCircle className="w-4 h-4"/>}
            </button>
            <button type="button" onClick={handleRotate} disabled={rotateMutation.isPending}
              title="Rotate secret"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50">
              {rotateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Key className="w-4 h-4"/>}
            </button>
            <button type="button" onClick={() => webhook.id && onDeliveries(webhook.id)}
              title="Delivery history"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
              <Activity className="w-4 h-4"/>
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button type="button" onClick={handleDelete} disabled={deleteMutation.isPending}
                  className="p-1.5 rounded-lg text-danger-600 hover:bg-danger-50 transition-colors text-xs font-medium">
                  Confirm
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors text-xs">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} title="Delete"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-danger-600 hover:bg-[var(--bg-secondary)] transition-colors">
                <Trash2 className="w-4 h-4"/>
              </button>
            )}
          </div>
        </div>

        {showSecret && (
          <div className="mt-3 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning-600 shrink-0 mt-0.5"/>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-warning-700 mb-1">
                  New secret — copy now, it will not be shown again
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-warning-800 break-all flex-1">{showSecret}</code>
                  <button type="button" onClick={() => {
                    navigator.clipboard.writeText(showSecret);
                    toast.success('Copied to clipboard');
                  }}
                    className="p-1.5 rounded shrink-0 text-warning-700 hover:bg-warning-100 transition-colors">
                    <ClipboardCopy className="w-3.5 h-3.5"/>
                  </button>
                </div>
                <p className="text-xs text-warning-600 mt-1">
                  Previous secret remains valid for 24 hours to avoid dropping in-flight retries.
                </p>
              </div>
              <button type="button" onClick={() => setShowSecret(null)}
                className="p-1 text-warning-600 hover:text-warning-800 transition-colors">
                <XCircle className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WebhooksPage() {
  const {hasHydrated, isAuthenticated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
  const [showCreate, setShowCreate] = useState(false);
  const [deliveriesWebhookId, setDeliveriesWebhookId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {data: webhooks = [], isLoading} = useListWebhooks();

  if (hasHydrated && isReady && isAuthenticated && !hasAnyRole(...ADMIN_ROLES)) {
    return null;
  }

  return (
    <AppLayout
      activeMenuItem="integrations"
      breadcrumbs={[
        {label: 'Admin', href: '/admin'},
        {label: 'Integrations', href: '/admin/integrations'},
        {label: 'Webhooks'},
      ]}
    >
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Webhooks</h1>
            <p className="page-subtitle">
              Receive real-time event notifications at your endpoints. All payloads are signed with HMAC-SHA256.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4"/>
            New Webhook
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-[var(--bg-secondary)] animate-pulse"/>
            ))}
          </div>
        ) : webhooks.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Webhook className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3"/>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No webhooks yet</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Create a webhook to start receiving real-time event notifications.
              </p>
              <Button onClick={() => setShowCreate(true)} variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4"/>
                Create your first webhook
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh: WebhookResponse) => (
              <WebhookCard key={wh.id} webhook={wh} onDeliveries={setDeliveriesWebhookId}/>
            ))}
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Integration Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-[var(--text-secondary)]">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success-500 mt-0.5 shrink-0"/>
              <span>Verify the <code className="bg-[var(--bg-secondary)] px-1 rounded">X-Hub-Signature-256</code> header on every delivery using your signing secret.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success-500 mt-0.5 shrink-0"/>
              <span>Return HTTP 2xx within 10 seconds. Timed-out or failed deliveries are retried with exponential backoff.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success-500 mt-0.5 shrink-0"/>
              <span>After 5 consecutive failures a webhook is auto-disabled. Rotate the secret and re-activate it here.</span>
            </div>
            <div className="flex items-start gap-2">
              <RotateCcw className="w-3.5 h-3.5 text-accent-500 mt-0.5 shrink-0"/>
              <span>When rotating a signing secret, the previous secret remains valid for 24 hours so in-flight retries are not dropped.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {showCreate && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowCreate(false)}/>
          <CreateWebhookPanel
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              queryClient.invalidateQueries({queryKey: getListWebhooksQueryKey()});
            }}
          />
        </>
      )}

      {deliveriesWebhookId && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setDeliveriesWebhookId(null)}/>
          <DeliveryPanel webhookId={deliveriesWebhookId} onClose={() => setDeliveriesWebhookId(null)}/>
        </>
      )}
    </AppLayout>
  );
}
