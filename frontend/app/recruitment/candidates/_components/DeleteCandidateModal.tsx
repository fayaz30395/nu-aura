'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Trash2 } from 'lucide-react';
import { Candidate } from '@/lib/types/hire/recruitment';

interface DeleteCandidateModalProps {
  open: boolean;
  candidate: Candidate | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteCandidateModal({
  open,
  candidate,
  isDeleting,
  onConfirm,
  onClose,
}: DeleteCandidateModalProps) {
  if (!open || !candidate) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-lg max-w-md w-full p-6 border border-[var(--border-main)] shadow-xl">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-danger-600 dark:text-danger-400" />
          </div>
          <h3 className="ml-4 text-lg font-medium text-[var(--text-primary)]">Delete Candidate</h3>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Are you sure you want to delete <strong className="text-[var(--text-secondary)]">{candidate.fullName}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting} className="flex-1">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
