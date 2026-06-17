'use client';

import React, {useState} from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Filter,
  LogIn,
  Search,
  Shield,
  User,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Input} from '@/components/ui/Input';
import {useAuth} from '@/lib/hooks/useAuth';
import {Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {
  useSearchAuditLogs,
  useGetAuditStatistics,
} from '@/lib/generated/api/audit-log-controller/audit-log-controller';
import type {AuditLogResponse} from '@/lib/generated/api/model';
import {AuditLogAction, SearchAuditLogsAction} from '@/lib/generated/api/model';
import {formatDate} from '@/lib/utils/format/date';

const ADMIN_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN];

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'text-success-600',
  UPDATE: 'text-accent-600',
  DELETE: 'text-danger-600',
  LOGIN: 'text-[var(--text-secondary)]',
  LOGOUT: 'text-[var(--text-muted)]',
  LOGIN_FAILED: 'text-warning-600',
  APPROVE: 'text-success-600',
  REJECT: 'text-danger-600',
  PERMISSION_CHANGE: 'text-warning-600',
  PASSWORD_CHANGE: 'text-warning-600',
  PASSWORD_RESET: 'text-warning-600',
  EXPORT: 'text-accent-600',
  IMPORT: 'text-accent-600',
};

const SECURITY_ACTIONS = new Set<string>([
  AuditLogAction.LOGIN_FAILED,
  AuditLogAction.PERMISSION_CHANGE,
  AuditLogAction.PASSWORD_CHANGE,
  AuditLogAction.PASSWORD_RESET,
]);

function AuditRow({log}: {log: AuditLogResponse}) {
  const [expanded, setExpanded] = useState(false);
  const isSecurityEvent = SECURITY_ACTIONS.has(log.action ?? '');

  return (
    <div className={`border-b border-[var(--border-subtle)] last:border-0 ${isSecurityEvent ? 'bg-warning-50/30 dark:bg-warning-900/10' : ''}`}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--bg-secondary)] transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0"/>
          : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0"/>
        }
        {isSecurityEvent && <AlertTriangle className="w-3.5 h-3.5 text-warning-500 shrink-0"/>}
        <span className={`text-xs font-mono font-semibold w-28 shrink-0 ${ACTION_COLOR[log.action ?? ''] ?? 'text-[var(--text-secondary)]'}`}>
          {log.action}
        </span>
        <span className="text-xs text-[var(--text-secondary)] w-32 shrink-0 truncate">
          {log.entityType}
        </span>
        <span className="text-xs text-[var(--text-primary)] flex-1 truncate">
          {log.actionDisplayName ?? `${log.action} on ${log.entityType}`}
        </span>
        <span className="text-xs text-[var(--text-muted)] shrink-0 flex items-center gap-1">
          <User className="w-3 h-3"/>
          {log.actorName ?? log.actorEmail ?? '—'}
        </span>
        <span className="text-xs text-[var(--text-muted)] shrink-0 ml-4">
          {log.createdAt ? formatDate(log.createdAt) : '—'}
        </span>
      </button>
      {expanded && (
        <div className="px-10 pb-3 space-y-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {log.entityId && (
              <>
                <span className="text-[var(--text-muted)]">Entity ID</span>
                <span className="font-mono text-[var(--text-secondary)]">{log.entityId}</span>
              </>
            )}
            {log.actorEmail && (
              <>
                <span className="text-[var(--text-muted)]">Actor</span>
                <span className="text-[var(--text-secondary)]">{log.actorEmail}</span>
              </>
            )}
            {log.ipAddress && (
              <>
                <span className="text-[var(--text-muted)]">IP Address</span>
                <span className="font-mono text-[var(--text-secondary)]">{log.ipAddress}</span>
              </>
            )}
          </div>
          {log.changes && (
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Changes</p>
              <pre className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                {log.changes}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const {hasHydrated, isAuthenticated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(0);

  const params = {
    ...(actionFilter ? {action: actionFilter as SearchAuditLogsAction} : {}),
    ...(entityFilter ? {entityType: entityFilter} : {}),
    pageable: {page, size: 50},
  };

  const {data: logsData, isLoading} = useSearchAuditLogs(params);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const {data: stats} = useGetAuditStatistics({startDate: thirtyDaysAgo, endDate: today});

  const logs: AuditLogResponse[] = (logsData as unknown as {content?: AuditLogResponse[]})?.content ?? [];
  const totalPages: number = (logsData as unknown as {totalPages?: number})?.totalPages ?? 0;

  const filtered = search.trim()
    ? logs.filter(l =>
        (l.actorName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.actorEmail ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.actionDisplayName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.entityType ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  if (hasHydrated && isReady && isAuthenticated && !hasAnyRole(...ADMIN_ROLES)) {
    return null;
  }

  const statCards = [
    {label: 'Total Events', value: stats?.totalEvents ?? '—', icon: Activity},
    {label: 'Security Events', value: stats?.eventsByAction
        ? Object.entries(stats.eventsByAction)
            .filter(([k]) => SECURITY_ACTIONS.has(k as typeof AuditLogAction[keyof typeof AuditLogAction]))
            .reduce((sum, [, v]) => sum + (v as number), 0)
        : '—', icon: Shield},
    {label: 'Top Actor', value: stats?.topActors?.[0]?.actorEmail ?? '—', icon: User},
    {label: 'Login Failures', value: (stats?.eventsByAction as Record<string, number> | undefined)?.[AuditLogAction.LOGIN_FAILED] ?? 0, icon: LogIn},
  ];

  return (
    <AppLayout>
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Audit Logs</h1>
            <p className="page-subtitle">Track all actions and changes across the platform.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {statCards.map(({label, value, icon: Icon}) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[var(--text-muted)]"/>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[120px]">{String(value)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-sm mr-auto">Event Log</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]"/>
                <Input
                  value={search}
                  onChange={e => {setSearch(e.target.value); setPage(0);}}
                  placeholder="Search actor, entity..."
                  className="pl-8 h-8 text-xs w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]"/>
                <select
                  value={actionFilter}
                  onChange={e => {setActionFilter(e.target.value); setPage(0);}}
                  className="input-aura text-xs h-8 pr-6 py-0"
                >
                  <option value="">All Actions</option>
                  {Object.values(SearchAuditLogsAction).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <Input
                  value={entityFilter}
                  onChange={e => {setEntityFilter(e.target.value); setPage(0);}}
                  placeholder="Entity type..."
                  className="h-8 text-xs w-36"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-main)] text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
              <span className="w-3.5 shrink-0"/>
              <span className="w-3.5 shrink-0"/>
              <span className="w-28 shrink-0">Action</span>
              <span className="w-32 shrink-0">Entity</span>
              <span className="flex-1">Description</span>
              <span>Actor</span>
              <span className="ml-4">Time</span>
            </div>

            {isLoading ? (
              <div className="space-y-0">
                {Array.from({length: 8}).map((_, i) => (
                  <div key={i} className="h-10 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] animate-pulse"/>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Activity className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2"/>
                <p className="text-sm text-[var(--text-muted)]">No audit events found</p>
              </div>
            ) : (
              <div>
                {filtered.map(log => <AuditRow key={log.id} log={log}/>)}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-main)]">
                <span className="text-xs text-[var(--text-muted)]">Page {page + 1} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 rounded text-xs border border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded text-xs border border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
