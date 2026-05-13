'use client';

import React from 'react';
import {Button} from '@/components/ui/Button';
import {Modal, ModalBody} from '@/components/ui/Modal';
import {CheckCircle} from 'lucide-react';
import {Candidate} from '@/lib/types/hire/recruitment';

interface AcceptOfferModalProps {
  open: boolean;
  candidate: Candidate | null;
  confirmedJoiningDate: string;
  onJoiningDateChange: (date: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function AcceptOfferModal({
                                   open,
                                   candidate,
                                   confirmedJoiningDate,
                                   onJoiningDateChange,
                                   onConfirm,
                                   onClose,
                                 }: AcceptOfferModalProps) {
  if (!candidate) return null;

  return (
    <Modal isOpen={open} onClose={onClose} size="sm">
      <ModalBody>
        <div className="flex items-center mb-4">
          <div
            className="flex-shrink-0 h-12 w-12 rounded-xl bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-success-600 dark:text-success-400"/>
          </div>
          <h3 className="ml-4 text-lg font-medium text-[var(--text-primary)]">Accept Offer</h3>
        </div>
        <p className="text-body-muted mb-4">
          Mark offer as accepted for <strong className="text-[var(--text-secondary)]">{candidate.fullName}</strong>?
        </p>
        <div className="mb-6">
          <label htmlFor="accept-offer-joining-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Confirmed Joining Date</label>
          <input
            id="accept-offer-joining-date"
            type="date"
            value={confirmedJoiningDate}
            onChange={(e) => onJoiningDateChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
          />
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-success-600 hover:bg-success-700">
            Accept Offer
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
}
