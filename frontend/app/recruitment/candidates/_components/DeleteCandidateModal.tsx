'use client';

import React from 'react';
import {Button} from '@/components/ui/Button';
import {Modal, ModalBody} from '@/components/ui/Modal';
import {Trash2} from 'lucide-react';
import {Candidate} from '@/lib/types/hire/recruitment';

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
  if (!candidate) return null;

  return (
    <Modal isOpen={open} onClose={onClose} size="sm">
      <ModalBody>
        <div className="flex items-center mb-4">
          <div
            className="flex-shrink-0 h-12 w-12 rounded-xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-danger-600 dark:text-danger-400"/>
          </div>
          <h3 className="ml-4 text-lg font-medium text-[var(--text-primary)]">Delete Candidate</h3>
        </div>
        <p className="text-body-muted mb-6">
          Are you sure you want to delete <strong className="text-[var(--text-secondary)]">{candidate.fullName}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting} className="flex-1">
            Delete
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
}
