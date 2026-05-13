'use client';

import React from 'react';
import {Button} from '@/components/ui/Button';
import {Modal, ModalBody, ModalHeader} from '@/components/ui/Modal';
import {MessageSquare} from 'lucide-react';
import {FeedbackSynthesisResponse} from '@/lib/types/hire/ai-recruitment';

interface FeedbackSynthesisModalProps {
  open: boolean;
  feedbackSynthesis: FeedbackSynthesisResponse | null;
  onClose: () => void;
}

export function FeedbackSynthesisModal({
                                         open,
                                         feedbackSynthesis,
                                         onClose,
                                       }: FeedbackSynthesisModalProps) {
  if (!feedbackSynthesis) return null;

  return (
    <Modal isOpen={open} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-success-500"/>
          Feedback Synthesis
        </h2>
      </ModalHeader>
      <ModalBody>
          <div className="space-y-6">
            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
              <p className="text-caption mb-1">Candidate</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{feedbackSynthesis.candidateName}</p>
            </div>

            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
              <p className="text-caption mb-2">Candidate Narrative</p>
              <p className="text-sm text-[var(--text-primary)]">{feedbackSynthesis.candidateNarrative}</p>
            </div>

            {feedbackSynthesis.themes && feedbackSynthesis.themes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Key Themes</p>
                <ul className="list-disc list-inside space-y-1">
                  {feedbackSynthesis.themes.map((theme, idx) => (
                    <li key={idx} className="text-body-secondary">{theme}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedbackSynthesis.agreements && feedbackSynthesis.agreements.length > 0 && (
              <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-xl">
                <p className="text-sm font-medium text-success-800 dark:text-success-300 mb-2">Agreements</p>
                <ul className="list-disc list-inside space-y-1">
                  {feedbackSynthesis.agreements.map((agreement, idx) => (
                    <li key={idx} className="text-sm text-success-700 dark:text-success-400">{agreement}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedbackSynthesis.disagreements && feedbackSynthesis.disagreements.length > 0 && (
              <div className="p-4 bg-warning-50 dark:bg-warning-900/20 rounded-xl">
                <p className="text-sm font-medium text-warning-800 dark:text-warning-300 mb-2">Disagreements</p>
                <ul className="list-disc list-inside space-y-1">
                  {feedbackSynthesis.disagreements.map((disagreement, idx) => (
                    <li key={idx} className="text-sm text-warning-700 dark:text-warning-400">{disagreement}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedbackSynthesis.missingData && feedbackSynthesis.missingData.length > 0 && (
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Missing Data</p>
                <ul className="list-disc list-inside space-y-1">
                  {feedbackSynthesis.missingData.map((missing, idx) => (
                    <li key={idx} className="text-body-secondary">{missing}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedbackSynthesis.openQuestions && feedbackSynthesis.openQuestions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Open Questions</p>
                <ul className="list-disc list-inside space-y-1">
                  {feedbackSynthesis.openQuestions.map((question, idx) => (
                    <li key={idx} className="text-body-secondary">{question}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
              <p className="text-caption mb-2">Recommended Next Step</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{feedbackSynthesis.recommendedNextStep}</p>
            </div>

            <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
      </ModalBody>
    </Modal>
  );
}
