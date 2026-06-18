'use client';

import React, {useState} from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Key,
  Plus,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Badge} from '@/components/ui/Badge';
import {SlidePanel} from '@/components/ui/SlidePanel';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  getListApiKeys1QueryKey,
  useCreateApiKey,
  useDeleteApiKey,
  useListApiKeys1,
  useRegenerateApiKey,
  useRevokeApiKey1,
  useUpdateScopes,
} from '@/lib/generated/api/api-keys/api-keys';
import type {ApiKeyCreationResponse, ApiKeyResponse} from '@/lib/generated/api/model';
import {formatDate} from '@/lib/utils/format/date';

const AVAILABLE_SCOPES = [
  {value: 'read:employees', label: 'Read Employees'},
  {value: 'write:employees', label: 'Write Employees'},
  {value: 'read:attendance', label: 'Read Attendance'},
  {value: 'write:attendance', label: 'Write Attendance'},
  {value: 'read:payroll', label: 'Read Payroll'},
  {value: 'write:payroll', label: 'Write Payroll'},
  {value: 'read:leave', label: 'Read Leave'},
  {value: 'write:leave', label: 'Write Leave'},
  {value: 'read:reports', label: 'Read Reports'},
  {value: 'read:recruitment', label: 'Read Recruitment'},
  {value: 'write:recruitment', label: 'Write Recruitment'},
  {value: 'admin:webhooks', label: 'Admin Webhooks'},
];

function CopyButton({value}: {value: string}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-success-500"/> : <Copy className="w-3.5 h-3.5"/>}
    </button>
  );
}

function NewKeyBanner({creation, onDismiss}: {creation: ApiKeyCreationResponse; onDismiss: () => void}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 shrink-0"/>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-warning-800 dark:text-warning-300 mb-1">
            Copy your new API key — it will not be shown again.
          </p>
          <div className="flex items-center gap-2 bg-white dark:bg-black/20 rounded border border-warning-200 dark:border-warning-700 px-3 py-2">
            <span className="font-mono text-xs text-[var(--text-primary)] flex-1 truncate">
              {visible ? creation.rawKey : '•'.repeat(48)}
            </span>
            <button
              type="button"
              aria-label={visible ? 'Hide API key' : 'Show API key'}
              onClick={() => setVisible(v => !v)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              {visible ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
            </button>
            {creation.rawKey && <CopyButton value={creation.rawKey}/>}
          </div>
          {creation.scopes && creation.scopes.length > 0 && (
            <p className="text-xs text-warning-700 dark:text-warning-400 mt-1.5">
              Scopes: {creation.scopes.join(', ')}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss API key notice"
          onClick={onDismiss}
          className="text-warning-500 hover:text-warning-700 shrink-0"
        >
          <X className="w-4 h-4"/>
        </button>
      </div>
    </div>
  );
}

function ScopeSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (scopes: string[]) => void;
}) {
  const toggle = (scope: string) => {
    if (selected.includes(scope)) {
      onChange(selected.filter(s => s !== scope));
    } else {
      onChange([...selected, scope]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {AVAILABLE_SCOPES.map(s => (
        <label key={s.value} className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={selected.includes(s.value)}
            onChange={() => toggle(s.value)}
            className="rounded border-[var(--border-main)] text-accent-600"
          />
          <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
            {s.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function CreatePanel({onClose, onCreate}: {onClose: () => void; onCreate: (r: ApiKeyCreationResponse) => void}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');

  const createMutation = useCreateApiKey();

  const submit = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setError('');
    createMutation.mutate({
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
        scopes: scopes.length > 0 ? scopes : undefined,
        expiresAt: expiresAt || undefined,
      },
    }, {
      onSuccess: (data) => onCreate(data),
      onError: () => setError('Failed to create API key'),
    });
  };

  return (
    <SlidePanel onClose={onClose} title="New API Key" widthClassName="max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">New API Key</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <X className="w-4 h-4"/>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="api-key-name" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Name <span className="text-danger-500">*</span>
            </label>
            <Input
              id="api-key-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Production Integration"
              className="h-8 text-sm"
            />
          </div>

          <div>
            <label htmlFor="api-key-description" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <Input
              id="api-key-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              className="h-8 text-sm"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Scopes</span>
            <ScopeSelector selected={scopes} onChange={setScopes}/>
            {scopes.length === 0 && (
              <p className="text-[10px] text-[var(--text-muted)] mt-1">No scopes = full access</p>
            )}
          </div>

          <div>
            <label htmlFor="api-key-expires-at" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Expires At</label>
            <Input
              id="api-key-expires-at"
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Leave blank for no expiry</p>
          </div>

          {error && (
            <p className="text-xs text-danger-600 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5"/>{error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={createMutation.isPending}
              className="flex-1"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Key'}
            </Button>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

function ApiKeyCard({apiKey}: {apiKey: ApiKeyResponse}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editingScopes, setEditingScopes] = useState(false);
  const [pendingScopes, setPendingScopes] = useState<string[]>([]);
  const [newKeyData, setNewKeyData] = useState<ApiKeyCreationResponse | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<'revoke' | 'delete' | null>(null);

  const invalidate = () => queryClient.invalidateQueries({queryKey: getListApiKeys1QueryKey()});

  const regenerateMutation = useRegenerateApiKey();
  const revokeMutation = useRevokeApiKey1();
  const deleteMutation = useDeleteApiKey();
  const scopesMutation = useUpdateScopes();

  const handleRegenerate = () => {
    if (!apiKey.id) return;
    regenerateMutation.mutate({keyId: apiKey.id}, {
      onSuccess: (data) => {
        setNewKeyData(data);
        invalidate();
      },
    });
  };

  const handleRevoke = () => {
    if (!apiKey.id) return;
    revokeMutation.mutate({keyId: apiKey.id}, {onSuccess: invalidate});
    setConfirmDelete(null);
  };

  const handleDelete = () => {
    if (!apiKey.id) return;
    deleteMutation.mutate({keyId: apiKey.id}, {onSuccess: invalidate});
    setConfirmDelete(null);
  };

  const handleSaveScopes = () => {
    if (!apiKey.id) return;
    scopesMutation.mutate({keyId: apiKey.id, data: {scopes: pendingScopes}}, {
      onSuccess: () => {setEditingScopes(false); invalidate();},
    });
  };

  const isActive = apiKey.isActive !== false;

  return (
    <div className="border border-[var(--border-main)] rounded-lg overflow-hidden">
      {newKeyData && (
        <div className="p-4 border-b border-[var(--border-main)]">
          <NewKeyBanner creation={newKeyData} onDismiss={() => setNewKeyData(null)}/>
        </div>
      )}

      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
          <Key className="w-4 h-4 text-[var(--text-muted)]"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">{apiKey.name}</span>
            <Badge variant={isActive ? 'success' : 'default'} className="text-[10px] shrink-0">
              {isActive ? 'Active' : 'Revoked'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs font-mono text-[var(--text-muted)]">{apiKey.maskedKey}</span>
            {apiKey.lastUsedAt && (
              <span className="text-[10px] text-[var(--text-muted)]">
                Last used {formatDate(apiKey.lastUsedAt)}
              </span>
            )}
            {apiKey.expiresAt && (
              <span className="text-[10px] text-[var(--text-muted)]">
                Expires {formatDate(apiKey.expiresAt)}
              </span>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0"/>
          : <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0"/>
        }
      </div>

      {expanded && (
        <div className="border-t border-[var(--border-subtle)] px-4 py-3 space-y-3">
          {apiKey.description && (
            <p className="text-xs text-[var(--text-secondary)]">{apiKey.description}</p>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Scopes</span>
              {isActive && !editingScopes && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setPendingScopes(apiKey.scopes ?? []);
                    setEditingScopes(true);
                  }}
                  className="text-[10px] text-accent-600 hover:text-accent-700"
                >
                  Edit
                </button>
              )}
            </div>
            {editingScopes ? (
              <div className="space-y-2">
                <ScopeSelector selected={pendingScopes} onChange={setPendingScopes}/>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingScopes(false)} className="text-xs h-7 px-3">Cancel</Button>
                  <Button size="sm" onClick={handleSaveScopes} disabled={scopesMutation.isPending} className="text-xs h-7 px-3">Save</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {(apiKey.scopes ?? []).length === 0
                  ? <span className="text-xs text-[var(--text-muted)]">Full access (no scope restriction)</span>
                  : (apiKey.scopes ?? []).map(s => (
                      <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400 font-mono border border-accent-200 dark:border-accent-800">
                        {s}
                      </span>
                    ))
                }
              </div>
            )}
          </div>

          {apiKey.lastUsedIp && (
            <div className="text-xs text-[var(--text-muted)]">
              Last IP: <span className="font-mono">{apiKey.lastUsedIp}</span>
            </div>
          )}

          {confirmDelete ? (
            <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 rounded p-3">
              <p className="text-xs text-danger-800 dark:text-danger-300 mb-2">
                {confirmDelete === 'revoke'
                  ? 'Revoke this key? Requests using it will be rejected.'
                  : 'Permanently delete this key? This cannot be undone.'}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)} className="text-xs h-7 px-3">Cancel</Button>
                <Button
                  size="sm"
                  onClick={confirmDelete === 'revoke' ? handleRevoke : handleDelete}
                  className="text-xs h-7 px-3 bg-danger-600 hover:bg-danger-700 text-white border-0"
                >
                  {confirmDelete === 'revoke' ? 'Revoke' : 'Delete Permanently'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              {isActive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={regenerateMutation.isPending}
                  className="text-xs h-7 px-3 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3"/>
                  Regenerate
                </Button>
              )}
              {isActive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDelete('revoke')}
                  className="text-xs h-7 px-3 flex items-center gap-1 text-warning-600 border-warning-300 hover:bg-warning-50"
                >
                  <XCircle className="w-3 h-3"/>
                  Revoke
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete('delete')}
                className="text-xs h-7 px-3 flex items-center gap-1 text-danger-600 border-danger-300 hover:bg-danger-50"
              >
                <Trash2 className="w-3 h-3"/>
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiKeysPage() {
  const {isAuthenticated, hasHydrated} = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyBanner, setNewKeyBanner] = useState<ApiKeyCreationResponse | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const {data: keys, isLoading} = useListApiKeys1(
    {includeInactive: showInactive},
    {query: {enabled: isAuthenticated && hasHydrated}},
  );

  const keyList: ApiKeyResponse[] = Array.isArray(keys) ? keys : [];
  const activeCount = keyList.filter(k => k.isActive !== false).length;

  return (
    <AppLayout
      activeMenuItem="settings"
      breadcrumbs={[
        {label: 'Settings', href: '/settings'},
        {label: 'Security', href: '/settings/security'},
        {label: 'API Keys'},
      ]}
    >
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">API Keys</h1>
            <p className="page-subtitle">Manage programmatic access to this tenant&apos;s data.</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5"/>
            New Key
          </Button>
        </div>

        {newKeyBanner && (
          <NewKeyBanner creation={newKeyBanner} onDismiss={() => setNewKeyBanner(null)}/>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-success-50 dark:bg-success-900/20 flex items-center justify-center">
                <Key className="w-4 h-4 text-success-600"/>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Active Keys</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{isLoading ? '—' : activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center">
                <Key className="w-4 h-4 text-[var(--text-muted)]"/>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Total Keys</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{isLoading ? '—' : keyList.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 dark:bg-accent-900/20 flex items-center justify-center">
                <Key className="w-4 h-4 text-accent-600"/>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">With Scopes</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {isLoading ? '—' : keyList.filter(k => (k.scopes?.length ?? 0) > 0).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm mr-auto">Keys</CardTitle>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={e => setShowInactive(e.target.checked)}
                  className="rounded border-[var(--border-main)]"
                />
                <span className="text-xs text-[var(--text-secondary)]">Show revoked</span>
              </label>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {isLoading ? (
              Array.from({length: 3}).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--bg-secondary)] animate-pulse"/>
              ))
            ) : keyList.length === 0 ? (
              <div className="py-16 text-center">
                <Key className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2"/>
                <p className="text-sm text-[var(--text-muted)] mb-1">No API keys yet</p>
                <p className="text-xs text-[var(--text-muted)]">Create a key to enable programmatic access</p>
              </div>
            ) : (
              keyList.map(k => <ApiKeyCard key={k.id} apiKey={k}/>)
            )}
          </CardContent>
        </Card>

        {showCreate && (
          <CreatePanel
            onClose={() => setShowCreate(false)}
            onCreate={data => {
              setNewKeyBanner(data);
              setShowCreate(false);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
