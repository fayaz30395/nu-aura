'use client';

import {Button} from '@mantine/core';
import {CheckCircle} from 'lucide-react';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {Stat} from '@/components/ui/Stat';
import type {ActivateCycleResponse} from '@/lib/types/grow/performance';

interface ActivationResultModalProps {
  result: ActivateCycleResponse | null;
  onClose: () => void;
}

export function ActivationResultModal({result, onClose}: ActivationResultModalProps) {
  return (
    <Modal isOpen={!!result} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success-600" aria-hidden/>
          <h2 className="text-xl font-semibold text-text-1">Cycle Activated!</h2>
        </div>
      </ModalHeader>
      <ModalBody className="flex flex-col gap-4">
        <p className="text-sm text-text-2">Review cycle has been successfully activated</p>
        {result && (
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-surface-aura-sunken p-4">
            <Stat label="Employees in Scope" value={result.employeesInScope} tone="accent"/>
            <Stat label="Reviews Created" value={result.reviewsCreated} tone="success"/>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Done</Button>
      </ModalFooter>
    </Modal>
  );
}
