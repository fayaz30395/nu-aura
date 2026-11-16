'use client';

import {Button} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import type {Feedback360Summary} from '@/lib/services/grow/feedback360.service';

interface SummaryDetailsModalProps {
  summary: Feedback360Summary | null;
  onClose: () => void;
}

export function SummaryDetailsModal({summary, onClose}: SummaryDetailsModalProps) {
  return (
    <Modal isOpen={!!summary} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <h2 className="text-lg font-semibold text-text-1">Feedback Summary</h2>
      </ModalHeader>
      <ModalBody>
        {summary && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {summary.finalRating !== undefined && (
                <div>
                  <dt className="text-text-2">Final Rating</dt>
                  <dd className="font-medium text-text-1">{summary.finalRating}</dd>
                </div>
              )}
              <div>
                <dt className="text-text-2">Responses</dt>
                <dd className="font-medium text-text-1">{summary.responsesReceived} / {summary.totalReviewers}</dd>
              </div>
            </dl>
            {summary.consolidatedStrengths && (
              <div>
                <h3 className="mb-1 text-xs font-medium text-success-600">Strengths</h3>
                <p className="whitespace-pre-wrap text-sm text-text-2">{summary.consolidatedStrengths}</p>
              </div>
            )}
            {summary.consolidatedImprovements && (
              <div>
                <h3 className="mb-1 text-xs font-medium text-warning-600">Areas for Improvement</h3>
                <p className="whitespace-pre-wrap text-sm text-text-2">{summary.consolidatedImprovements}</p>
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="default" onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
}
