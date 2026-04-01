'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { XCircle } from 'lucide-react';
import { Candidate } from '@/lib/types/hire/recruitment';

interface DeclineOfferModalProps {
  open: boolean;
  candidate: Candidate | null;
  declineReason: string;
  onDeclineReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeclineOfferModal({
  open,
  candidate,
  declineReason,
  onDeclineReasonChange,
  onConfirm,
  onClose,
}: DeclineOfferModalProps) {
  if (!open || !candidate) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-lg max-w-md w-full p-6 border border-[var(--border-main)] shadow-[var(--shadow-dropdown)]">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
            <XCircle className="h-6 w-6 text-danger-600 dark:text-danger-400" />
          </div>
          <h3 className="ml-4 text-lg font-medium text-[var(--text-primary)]">Decline Offer</h3>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Mark offer as declined for <strong className="text-[var(--text-secondary)]">{candidate.fullName}</strong>?
        </p>
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Decline Reason</label>
          <textarea
            rows={3}
            value={declineReason}
            onChange={(e) => onDeclineReasonChange(e.target.value)}
            placeholder="Optional: Enter reason for declining..."
            className="w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
          />
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1">
            Decline Offer
          </Button>
        </div>
      </div>
    </div>
  );
}
