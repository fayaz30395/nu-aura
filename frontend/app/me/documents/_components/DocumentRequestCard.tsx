'use client';

import {format} from 'date-fns';
import {AlertCircle, CheckCircle, Clock, Download, FileText, Truck, X, XCircle} from 'lucide-react';
import {Button, Card} from '@/components/ui';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {cn} from '@/lib/utils';
import {safeWindowOpen} from '@/lib/utils/url';
import type {StatusMeta} from '@/lib/status/vocabulary';
import type {DocumentRequestResponse, DocumentRequestStatus} from '@/lib/types/hrms/selfservice';

const STATUS_CONFIG: Record<DocumentRequestStatus, { tone: StatusMeta['tone']; icon: StatusMeta['icon']; tile: string }> = {
  PENDING: {tone: 'warning', icon: Clock, tile: 'bg-status-warn-bg text-status-warn-fg'},
  IN_PROGRESS: {tone: 'info', icon: AlertCircle, tile: 'bg-status-info-bg text-status-info-fg'},
  GENERATED: {tone: 'success', icon: CheckCircle, tile: 'bg-status-ok-bg text-status-ok-fg'},
  DELIVERED: {tone: 'success', icon: Truck, tile: 'bg-accent-subtle text-accent'},
  REJECTED: {tone: 'danger', icon: XCircle, tile: 'bg-status-err-bg text-status-err-fg'},
  CANCELLED: {tone: 'neutral', icon: X, tile: 'bg-card-hover text-text-3'},
};

export function DocumentRequestCard({request}: { request: DocumentRequestResponse }) {
  const config = STATUS_CONFIG[request.status];
  const canDownload =
    (request.status === 'GENERATED' || request.status === 'DELIVERED') && !!request.generatedDocumentUrl;

  return (
    <Card padding="sm" role="listitem">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', config.tile)}>
          <FileText className="h-6 w-6" aria-hidden="true"/>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-text-1">{request.documentTypeDisplayName}</h3>
            <StatusBadge meta={{label: request.statusDisplayName, tone: config.tone, icon: config.icon}}/>
          </div>

          <p className="mt-1 text-sm text-text-2">{request.purpose}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-3 tabular-nums">
            <span>Requested: {format(new Date(request.createdAt), 'MMM d, yyyy')}</span>
            <span>Required by: {format(new Date(request.requiredByDate), 'MMM d, yyyy')}</span>
            <span className="capitalize">Delivery: {request.deliveryMode.toLowerCase()}</span>
          </div>

          {request.rejectionReason && (
            <div className="mt-4 rounded-lg border border-status-err-bd bg-status-err-bg p-4">
              <p className="text-sm text-status-err-fg">
                <strong>Rejection Reason:</strong> {request.rejectionReason}
              </p>
            </div>
          )}
        </div>

        {canDownload && (
          <Button
            variant="outline"
            size="md"
            leftIcon={<Download className="h-4 w-4" aria-hidden="true"/>}
            onClick={() => safeWindowOpen(request.generatedDocumentUrl, '_blank')}
          >
            Download
          </Button>
        )}
      </div>
    </Card>
  );
}
