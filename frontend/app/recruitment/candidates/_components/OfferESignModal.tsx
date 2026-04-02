'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { notifications } from '@mantine/notifications';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  X,
  FileSignature,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  useCreateSignatureRequest,
  useSendForSignature,
  useSignatureRequest,
  useSignatureApprovals,
  useCancelSignatureRequest,
} from '@/lib/hooks/queries/useEsignature';
import type { Candidate } from '@/lib/types/hire/recruitment';
import type { SignatureRequestResponse, SignatureStatus, ApprovalStatus } from '@/lib/types/hire/esignature';

// ==================== Zod Schema ====================

const createESignSchema = z.object({
  signerEmail: z.string().email('Valid email required'),
  documentUrl: z.string().url('Valid document URL required').optional().or(z.literal('')),
  expiresInDays: z.number().int().min(1).max(90).default(7),
  reminderFrequencyDays: z.number().int().min(1).max(30).default(3),
});

type CreateESignFormData = z.infer<typeof createESignSchema>;

// ==================== Status helpers ====================

function SignatureStatusBadge({ status }: { status: SignatureStatus }) {
  const map: Record<SignatureStatus, { label: string; variant: string; Icon: React.ElementType }> = {
    DRAFT: { label: 'Draft', variant: 'info', Icon: FileSignature },
    PENDING: { label: 'Pending', variant: 'warning', Icon: Clock },
    IN_PROGRESS: { label: 'In Progress', variant: 'warning', Icon: Clock },
    COMPLETED: { label: 'Signed', variant: 'success', Icon: CheckCircle },
    DECLINED: { label: 'Declined', variant: 'danger', Icon: XCircle },
    EXPIRED: { label: 'Expired', variant: 'danger', Icon: AlertCircle },
    CANCELLED: { label: 'Cancelled', variant: 'danger', Icon: XCircle },
  };
  const { label, variant, Icon } = map[status] ?? { label: status, variant: 'info', Icon: Clock };
  return (
    <Badge
      variant={variant as 'success' | 'danger' | 'warning' | 'info'}
      className="flex items-center gap-1 text-xs"
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const map: Record<ApprovalStatus, { label: string; variant: string }> = {
    PENDING: { label: 'Pending', variant: 'info' },
    SENT: { label: 'Sent', variant: 'info' },
    VIEWED: { label: 'Viewed', variant: 'warning' },
    SIGNED: { label: 'Signed', variant: 'success' },
    DECLINED: { label: 'Declined', variant: 'danger' },
    EXPIRED: { label: 'Expired', variant: 'danger' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'info' };
  return (
    <Badge variant={variant as 'success' | 'danger' | 'warning' | 'info'} className="text-xs">
      {label}
    </Badge>
  );
}

// ==================== Status Tracker Panel ====================

interface StatusTrackerProps {
  signatureRequestId: string;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}

function StatusTracker({ signatureRequestId, onCancel, isCancelling }: StatusTrackerProps) {
  const { data: req, isLoading: reqLoading, refetch } = useSignatureRequest(signatureRequestId, true);
  const { data: approvals = [], isLoading: appLoading } = useSignatureApprovals(signatureRequestId, true);
  const sendMutation = useSendForSignature();

  if (reqLoading || appLoading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  if (!req) return null;

  const canSend = req.status === 'DRAFT' || req.status === 'PENDING';
  const canCancel = !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(req.status);

  const handleSend = async () => {
    try {
      await sendMutation.mutateAsync(signatureRequestId);
      notifications.show({ title: 'Sent', message: 'Offer sent for signature', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to send for signature', color: 'red' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Request Summary */}
      <div className="p-4 bg-[var(--bg-secondary)] rounded-xl space-y-4">
        <div className="row-between">
          <p className="text-sm font-medium text-[var(--text-primary)]">{req.title}</p>
          <SignatureStatusBadge status={req.status} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-caption">
          {req.requiredSignatures != null && (
            <span>Required: {req.requiredSignatures} signature(s)</span>
          )}
          {req.receivedSignatures != null && (
            <span>Received: {req.receivedSignatures} signature(s)</span>
          )}
          {req.expiresAt && (
            <span>Expires: {new Date(req.expiresAt).toLocaleDateString()}</span>
          )}
          {req.completedAt && (
            <span className="text-success-600">Signed: {new Date(req.completedAt).toLocaleDateString()}</span>
          )}
        </div>
        {req.documentUrl && (
          <a
            href={req.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 cursor-pointer"
          >
            <ExternalLink className="h-3 w-3" />
            View Document
          </a>
        )}
      </div>

      {/* Signer Statuses */}
      {approvals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Signer Status
          </p>
          <div className="space-y-2">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="row-between p-4 border border-[var(--border-main)] rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {approval.signerName ?? approval.signerEmail}
                  </p>
                  <p className="text-caption">
                    {approval.signerEmail} · {approval.signerRole}
                  </p>
                  {approval.signedAt && (
                    <p className="text-xs text-success-600 mt-0.5">
                      Signed {new Date(approval.signedAt).toLocaleString()}
                    </p>
                  )}
                  {approval.declineReason && (
                    <p className="text-xs text-danger-600 mt-0.5">
                      Declined: {approval.declineReason}
                    </p>
                  )}
                  {approval.viewedAt && !approval.signedAt && (
                    <p className="text-xs text-warning-600 mt-0.5">
                      Viewed {new Date(approval.viewedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <ApprovalStatusBadge status={approval.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-main)]">
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
        {canSend && (
          <Button
            type="button"
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="flex items-center gap-1.5 text-sm"
          >
            <Send className="h-3.5 w-3.5" />
            {sendMutation.isPending ? 'Sending…' : 'Send for Signature'}
          </Button>
        )}
        {canCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onCancel(signatureRequestId)}
            disabled={isCancelling}
            className="flex items-center gap-1.5 text-sm text-danger-600 border-danger-300 hover:bg-danger-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            {isCancelling ? 'Cancelling…' : 'Cancel Request'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================== Main Modal ====================

interface OfferESignModalProps {
  open: boolean;
  candidate: Candidate | null;
  /** If provided, opens directly in tracker mode for an existing request. */
  existingRequestId?: string | null;
  onClose: () => void;
}

export function OfferESignModal({
  open,
  candidate,
  existingRequestId,
  onClose,
}: OfferESignModalProps) {
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(
    existingRequestId ?? null
  );

  const createMutation = useCreateSignatureRequest();
  const cancelMutation = useCancelSignatureRequest();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateESignFormData>({
    resolver: zodResolver(createESignSchema),
    defaultValues: {
      signerEmail: candidate?.email ?? '',
      expiresInDays: 7,
      reminderFrequencyDays: 3,
    },
  });

  if (!open || !candidate) return null;

  const inputCls =
    'w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 text-sm';

  const handleCreate = async (data: CreateESignFormData) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

    try {
      const result = await createMutation.mutateAsync({
        title: `Offer Letter — ${candidate.fullName}`,
        description: `Offer letter for ${candidate.jobTitle ?? 'the position'} to be signed by ${candidate.fullName}`,
        documentType: 'OFFER_LETTER',
        documentUrl: data.documentUrl || undefined,
        documentName: data.documentUrl ? 'Offer Letter.pdf' : undefined,
        signatureOrder: true,
        expiresAt: expiresAt.toISOString(),
        reminderFrequencyDays: data.reminderFrequencyDays,
        metadata: JSON.stringify({ candidateId: candidate.id }),
        signers: [
          {
            signerEmail: data.signerEmail,
            signerRole: 'CANDIDATE',
            signingOrder: 1,
            isRequired: true,
          },
        ],
      });
      setCreatedRequestId(result.id);
      notifications.show({
        title: 'E-Sign Request Created',
        message: 'Signature request created. Click "Send for Signature" to deliver it.',
        color: 'green',
      });
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to create signature request',
        color: 'red',
      });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelMutation.mutateAsync({ id, reason: 'Cancelled by HR' });
      notifications.show({ title: 'Cancelled', message: 'Signature request cancelled.', color: 'orange' });
      setCreatedRequestId(null);
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to cancel request.', color: 'red' });
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-[var(--shadow-elevated)]">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-accent-500" />
                Offer Letter E-Sign
              </h2>
              <p className="text-body-muted mt-0.5">{candidate.fullName}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded-md"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body: Create or Track */}
          {!createdRequestId ? (
            /* ========== Create New Request Form ========== */
            <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
              <p className="text-body-secondary">
                Create an e-signature request for the offer letter. The candidate will receive a
                secure link to review and sign.
              </p>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Candidate Email *
                </label>
                <input type="email" {...register('signerEmail')} className={inputCls} />
                {errors.signerEmail && (
                  <p className="text-xs text-danger-500 mt-1">{errors.signerEmail.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Document URL
                  <span className="text-[var(--text-muted)] ml-1 font-normal">(optional — PDF link to offer letter)</span>
                </label>
                <input
                  type="url"
                  {...register('documentUrl')}
                  placeholder="https://storage.example.com/offer-letter.pdf"
                  className={inputCls}
                />
                {errors.documentUrl && (
                  <p className="text-xs text-danger-500 mt-1">{errors.documentUrl.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Expires After (days)
                  </label>
                  <input
                    type="number"
                    {...register('expiresInDays', { valueAsNumber: true })}
                    min={1}
                    max={90}
                    className={inputCls}
                  />
                  {errors.expiresInDays && (
                    <p className="text-xs text-danger-500 mt-1">{errors.expiresInDays.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Reminder (every N days)
                  </label>
                  <input
                    type="number"
                    {...register('reminderFrequencyDays', { valueAsNumber: true })}
                    min={1}
                    max={30}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="p-4 bg-info-50 dark:bg-info-900/20 rounded-lg text-xs text-info-700 dark:text-info-300 flex gap-2">
                <Eye className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  The candidate will receive a secure, tokenized link by email to review and sign
                  the offer letter. You can track signature status here in real time.
                </span>
              </div>

              <div className="flex gap-4 pt-2 border-t border-[var(--border-main)]">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                  {createMutation.isPending ? (
                    'Creating…'
                  ) : (
                    <>
                      <FileSignature className="h-4 w-4 mr-1.5" />
                      Create E-Sign Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* ========== Status Tracker ========== */
            <StatusTracker
              signatureRequestId={createdRequestId}
              onCancel={handleCancel}
              isCancelling={cancelMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
