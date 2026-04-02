'use client';

import React, { useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useIntegrationEvents } from '@/lib/hooks/queries/useConnectors';
import { IntegrationEventLog } from '@/lib/types/core/connector';

interface IntegrationActivityLogProps {
  connectorId?: string;
  pageSize?: number;
}

export function IntegrationActivityLog({ connectorId, pageSize = 20 }: IntegrationActivityLogProps) {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useIntegrationEvents(connectorId, statusFilter, page, pageSize);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 className="h-5 w-5 text-success-600 dark:text-success-400" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-danger-600 dark:text-danger-400" />;
      case 'SKIPPED':
        return <AlertCircle className="h-5 w-5 text-warning-600 dark:text-warning-400" />;
      default:
        return null;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300';
      case 'FAILED':
        return 'bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300';
      case 'SKIPPED':
        return 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300';
      default:
        return 'bg-[var(--bg-surface)] text-[var(--text-secondary)]';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent-700" />
      </div>
    );
  }

  if (!data || data.content.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--text-secondary)]">No events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === undefined ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setStatusFilter(undefined)}
        >
          All
        </Button>
        {['SUCCESS', 'FAILED', 'SKIPPED'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Events Table */}
      <div className="rounded-lg border border-[var(--border-main)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-main)]">
              <th className="px-4 py-2 text-left font-semibold text-[var(--text-primary)]">Event</th>
              <th className="px-4 py-2 text-left font-semibold text-[var(--text-primary)]">Entity</th>
              <th className="px-4 py-2 text-left font-semibold text-[var(--text-primary)]">Status</th>
              <th className="px-4 py-2 text-left font-semibold text-[var(--text-primary)]">Duration</th>
              <th className="px-4 py-2 text-left font-semibold text-[var(--text-primary)]">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-main)]">
            {data.content.map((event: IntegrationEventLog) => (
              <tr key={event.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-4 py-4">
                  <code className="text-xs bg-[var(--bg-secondary)] px-2 py-1 rounded text-[var(--text-primary)]">
                    {event.eventType}
                  </code>
                </td>
                <td className="px-4 py-4 text-[var(--text-secondary)]">
                  {event.entityType && event.entityId ? (
                    <span className="text-xs">
                      {event.entityType} ({event.entityId.substring(0, 8)}...)
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)]">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(event.status)}
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusBadgeColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-[var(--text-secondary)]">
                  {event.durationMs ? `${event.durationMs}ms` : '—'}
                </td>
                <td className="px-4 py-4 text-[var(--text-secondary)] text-xs">
                  {formatDate(event.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Error Message */}
      {data.content.some((e: IntegrationEventLog) => e.status === 'FAILED') && (
        <div className="p-4 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
          <p className="text-sm text-danger-700 dark:text-danger-300">
            Some events failed. Check error messages above for details.
          </p>
        </div>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="row-between pt-4">
          <p className="text-body-secondary">
            Page {page + 1} of {data.totalPages} ({data.totalElements} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.min(data.totalPages - 1, page + 1))}
              disabled={page >= data.totalPages - 1}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
