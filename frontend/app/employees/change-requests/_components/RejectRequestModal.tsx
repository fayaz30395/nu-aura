'use client';

import {Button, Textarea} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';

interface RejectRequestModalProps {
  isOpen: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
}

export function RejectRequestModal({isOpen, reason, onReasonChange, onClose, onConfirm, pending}: RejectRequestModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>Reject Change Request</ModalHeader>
      <ModalBody className="flex flex-col gap-4">
        <p className="text-sm text-text-2">Please provide a reason for rejecting this change request.</p>
        <Textarea
          label="Rejection reason"
          aria-label="Enter rejection reason..."
          placeholder="Enter rejection reason..."
          withAsterisk
          rows={4}
          value={reason}
          onChange={(event) => onReasonChange(event.currentTarget.value)}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="default" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button color="red" onClick={onConfirm} loading={pending} disabled={!reason.trim()}>
          Reject
        </Button>
      </ModalFooter>
    </Modal>
  );
}
